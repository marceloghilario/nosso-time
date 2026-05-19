import {
  DeleteCommand,
  GetCommand,
  PutCommand,
  QueryCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import { v4 as uuid } from 'uuid';
import { docClient, TABLES } from '../utils/dynamo';
import { HttpError } from '../utils/response';
import { gameService } from './gameService';
import { playerService } from './playerService';
import { teamService } from './teamService';
import {
  advanceKnockout,
  getGameLinks,
  maybeGenerateKnockoutFromGroups,
  syncGamesFromChampionshipGame,
} from './championshipSync';
import type {
  Championship,
  ChampionshipFormat,
  ChampionshipGame,
  ChampionshipGameGoal,
  ChampionshipGroup,
  ChampionshipParticipant,
  ChampionshipPhase,
  ChampionshipStatus,
} from '../models';

export interface ParticipantInput {
  teamId: string;
  teamName: string;
  logoUrl?: string;
  isMine?: boolean;
}

export interface CreateChampionshipInput {
  name: string;
  format: ChampionshipFormat;
  doubleRoundRobin?: boolean;
  participants: ParticipantInput[];
}

export interface UpdateChampionshipInput {
  name?: string;
  status?: ChampionshipStatus;
}

export interface UpdateChampionshipGameInput {
  date?: string | null;
  time?: string | null;
  location?: string | null;
  homeScore?: number;
  awayScore?: number;
  winnerByPenalties?: 'HOME' | 'AWAY' | null;
  goals?: ChampionshipGameGoal[];
  clear?: boolean;
}

const shuffle = <T>(arr: T[]): T[] => {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

const nextPowerOf2 = (n: number): number => {
  let p = 1;
  while (p < n) p *= 2;
  return p;
};

const phaseForRound = (
  participantsInBracket: number,
  round: number,
): ChampionshipPhase => {
  const remaining = participantsInBracket / 2 ** round;
  if (remaining <= 2) return 'F';
  if (remaining <= 4) return 'SF';
  if (remaining <= 8) return 'QF';
  return 'R16';
};

const buildRoundRobinGames = (
  participants: ChampionshipParticipant[],
  phase: ChampionshipPhase,
  group: string | undefined,
  doubleRoundRobin: boolean,
): ChampionshipGame[] => {
  const games: ChampionshipGame[] = [];
  for (let i = 0; i < participants.length; i++) {
    for (let j = i + 1; j < participants.length; j++) {
      const home = participants[i];
      const away = participants[j];
      games.push({
        gameId: uuid(),
        phase,
        group,
        round: 0,
        homeTeamId: home.teamId,
        homeTeamName: home.teamName,
        awayTeamId: away.teamId,
        awayTeamName: away.teamName,
        status: 'AGENDADO',
      });
      if (doubleRoundRobin) {
        games.push({
          gameId: uuid(),
          phase,
          group,
          round: 1,
          homeTeamId: away.teamId,
          homeTeamName: away.teamName,
          awayTeamId: home.teamId,
          awayTeamName: home.teamName,
          status: 'AGENDADO',
        });
      }
    }
  }
  return games;
};

const buildKnockoutFirstRound = (
  participants: ChampionshipParticipant[],
): ChampionshipGame[] => {
  const games: ChampionshipGame[] = [];
  const slots = nextPowerOf2(participants.length);
  const shuffled = shuffle(participants);
  const padded: (ChampionshipParticipant | null)[] = [...shuffled];
  while (padded.length < slots) padded.push(null);
  const phase = phaseForRound(slots, 0);
  for (let i = 0; i < slots; i += 2) {
    const home = padded[i];
    const away = padded[i + 1];
    games.push({
      gameId: uuid(),
      phase,
      round: 0,
      bracketIndex: i / 2,
      homeTeamId: home?.teamId,
      homeTeamName: home?.teamName,
      awayTeamId: away?.teamId,
      awayTeamName: away?.teamName,
      status: 'AGENDADO',
    });
  }
  return games;
};

const groupSizeFor = (n: number): number => {
  if (n <= 5) return n;
  if (n <= 6) return 3;
  return 4;
};

const buildGroups = (
  participants: ChampionshipParticipant[],
): ChampionshipGroup[] => {
  const n = participants.length;
  const size = groupSizeFor(n);
  const numGroups = Math.max(1, Math.ceil(n / size));
  const shuffled = shuffle(participants);
  const groups: ChampionshipGroup[] = [];
  for (let i = 0; i < numGroups; i++) {
    groups.push({
      name: `Grupo ${String.fromCharCode(65 + i)}`,
      teamIds: [],
    });
  }
  shuffled.forEach((p, idx) => {
    groups[idx % numGroups].teamIds.push(p.teamId);
  });
  return groups;
};

const generateFixtures = (
  participants: ChampionshipParticipant[],
  format: ChampionshipFormat,
  doubleRoundRobin: boolean,
): { games: ChampionshipGame[]; groups?: ChampionshipGroup[] } => {
  if (format === 'PONTOS_CORRIDOS') {
    return {
      games: buildRoundRobinGames(
        participants,
        'RR',
        undefined,
        doubleRoundRobin,
      ),
    };
  }
  if (format === 'MATA_MATA') {
    return { games: buildKnockoutFirstRound(participants) };
  }
  const groups = buildGroups(participants);
  const games: ChampionshipGame[] = [];
  for (const group of groups) {
    const teams = group.teamIds
      .map((id) => participants.find((p) => p.teamId === id))
      .filter((p): p is ChampionshipParticipant => Boolean(p));
    games.push(
      ...buildRoundRobinGames(teams, 'GROUP', group.name, doubleRoundRobin),
    );
  }
  return { games, groups };
};

export const championshipService = {
  async listByOwner(ownerId: string): Promise<Championship[]> {
    const result = await docClient.send(
      new QueryCommand({
        TableName: TABLES.CHAMPIONSHIPS,
        IndexName: 'ownerId-index',
        KeyConditionExpression: 'ownerId = :ownerId',
        ExpressionAttributeValues: { ':ownerId': ownerId },
      }),
    );
    return (result.Items ?? []) as Championship[];
  },

  async getOwned(championshipId: string, ownerId: string): Promise<Championship> {
    const result = await docClient.send(
      new GetCommand({
        TableName: TABLES.CHAMPIONSHIPS,
        Key: { championshipId },
      }),
    );
    const c = result.Item as Championship | undefined;
    if (!c || c.ownerId !== ownerId) {
      throw new HttpError('Campeonato não encontrado', 404);
    }
    return c;
  },

  async create(
    ownerId: string,
    input: CreateChampionshipInput,
  ): Promise<Championship> {
    const seen = new Set<string>();
    const participants: ChampionshipParticipant[] = [];
    for (const p of input.participants) {
      if (seen.has(p.teamId)) {
        throw new HttpError('Time duplicado na lista de participantes', 400);
      }
      seen.add(p.teamId);
      const participant: ChampionshipParticipant = {
        teamId: p.teamId,
        teamName: p.teamName,
        isMine: p.isMine === true,
      };
      if (p.logoUrl) participant.logoUrl = p.logoUrl;
      participants.push(participant);
    }
    if (input.format === 'MATA_MATA' && participants.length < 2) {
      throw new HttpError('Mata-mata exige ao menos 2 times', 400);
    }
    if (input.format === 'COPA' && participants.length < 3) {
      throw new HttpError('Copa exige ao menos 3 times', 400);
    }
    if (input.format === 'PONTOS_CORRIDOS' && participants.length < 3) {
      throw new HttpError('Pontos corridos exige ao menos 3 times', 400);
    }
    const doubleRoundRobin =
      input.doubleRoundRobin === true && input.format !== 'MATA_MATA';
    const { games, groups } = generateFixtures(
      participants,
      input.format,
      doubleRoundRobin,
    );
    const now = new Date().toISOString();
    const championship: Championship = {
      championshipId: uuid(),
      ownerId,
      name: input.name,
      format: input.format,
      status: 'EM_ANDAMENTO',
      participants,
      games,
      createdAt: now,
      updatedAt: now,
    };
    if (doubleRoundRobin) championship.doubleRoundRobin = true;
    if (groups) championship.groups = groups;
    await docClient.send(
      new PutCommand({
        TableName: TABLES.CHAMPIONSHIPS,
        Item: championship,
        ConditionExpression: 'attribute_not_exists(championshipId)',
      }),
    );
    return championship;
  },

  async update(
    championshipId: string,
    ownerId: string,
    input: UpdateChampionshipInput,
  ): Promise<Championship> {
    await this.getOwned(championshipId, ownerId);
    const setExprs: string[] = ['#updatedAt = :updatedAt'];
    const names: Record<string, string> = { '#updatedAt': 'updatedAt' };
    const values: Record<string, unknown> = {
      ':updatedAt': new Date().toISOString(),
      ':ownerId': ownerId,
    };
    if (input.name !== undefined) {
      setExprs.push('#name = :name');
      names['#name'] = 'name';
      values[':name'] = input.name;
    }
    if (input.status !== undefined) {
      setExprs.push('#status = :status');
      names['#status'] = 'status';
      values[':status'] = input.status;
    }
    const updateExpression = `SET ${setExprs.join(', ')}`;
    const update = await docClient.send(
      new UpdateCommand({
        TableName: TABLES.CHAMPIONSHIPS,
        Key: { championshipId },
        UpdateExpression: updateExpression,
        ExpressionAttributeNames: names,
        ExpressionAttributeValues: values,
        ConditionExpression: 'ownerId = :ownerId',
        ReturnValues: 'ALL_NEW',
      }),
    );
    return update.Attributes as Championship;
  },

  async delete(championshipId: string, ownerId: string): Promise<void> {
    await this.getOwned(championshipId, ownerId);
    await docClient.send(
      new DeleteCommand({
        TableName: TABLES.CHAMPIONSHIPS,
        Key: { championshipId },
        ConditionExpression: 'ownerId = :ownerId',
        ExpressionAttributeValues: { ':ownerId': ownerId },
      }),
    );
  },

  /**
   * Read a championship by id. Available to any logged-in user; no ownership check.
   */
  async getById(championshipId: string): Promise<Championship> {
    const result = await docClient.send(
      new GetCommand({
        TableName: TABLES.CHAMPIONSHIPS,
        Key: { championshipId },
      }),
    );
    const c = result.Item as Championship | undefined;
    if (!c) throw new HttpError('Campeonato não encontrado', 404);
    return c;
  },

  /**
   * Update match-level fields (date/time/location/placar/goals) of a
   * championship game. Restricted to the championship creator (ownerId).
   * Side effects propagate to every linked Game record.
   */
  async updateGame(
    championshipId: string,
    gameId: string,
    ownerId: string,
    input: UpdateChampionshipGameInput,
  ): Promise<Championship> {
    const championship = await this.getOwned(championshipId, ownerId);
    const game = championship.games.find((g) => g.gameId === gameId);
    if (!game) throw new HttpError('Jogo não encontrado', 404);

    // Match metadata (date/time/location)
    if (input.date !== undefined) {
      if (input.date === null || input.date === '') delete game.date;
      else game.date = input.date;
    }
    if (input.time !== undefined) {
      if (input.time === null || input.time === '') delete game.time;
      else game.time = input.time;
    }
    if (input.location !== undefined) {
      if (input.location === null || input.location === '')
        delete game.location;
      else game.location = input.location;
    }

    // Score
    const hasScoreInput =
      input.homeScore !== undefined && input.awayScore !== undefined;
    if (input.clear === true) {
      delete game.homeScore;
      delete game.awayScore;
      delete game.winnerByPenalties;
      delete game.goals;
      game.status = 'AGENDADO';
    } else if (hasScoreInput) {
      if (!game.homeTeamId || !game.awayTeamId) {
        throw new HttpError(
          'Este jogo ainda não tem os dois times definidos',
          400,
        );
      }
      game.homeScore = input.homeScore;
      game.awayScore = input.awayScore;
      if (input.winnerByPenalties === null) {
        delete game.winnerByPenalties;
      } else if (input.winnerByPenalties !== undefined) {
        game.winnerByPenalties = input.winnerByPenalties;
      }
      if (
        game.phase !== 'RR' &&
        game.phase !== 'GROUP' &&
        input.homeScore === input.awayScore &&
        !game.winnerByPenalties
      ) {
        throw new HttpError(
          'Em mata-mata o empate exige definir vencedor por pênaltis',
          400,
        );
      }
      game.status = 'REALIZADO';
    }

    // Goals: only persisted when the game is REALIZADO.
    if (input.goals !== undefined) {
      if (game.status !== 'REALIZADO') {
        if (input.goals.length > 0) {
          throw new HttpError(
            'Só é possível registrar gols em jogos realizados',
            400,
          );
        }
        delete game.goals;
      } else {
        const homeCount = input.goals.filter(
          (g) => g.teamSide === 'HOME',
        ).length;
        const awayCount = input.goals.filter(
          (g) => g.teamSide === 'AWAY',
        ).length;
        if (homeCount > (game.homeScore ?? 0)) {
          throw new HttpError(
            'Quantidade de autores do mandante maior que o placar',
            400,
          );
        }
        if (awayCount > (game.awayScore ?? 0)) {
          throw new HttpError(
            'Quantidade de autores do visitante maior que o placar',
            400,
          );
        }
        game.goals = input.goals.length > 0 ? input.goals : undefined;
        if (input.goals.length === 0) delete game.goals;
      }
    } else if (game.status !== 'REALIZADO') {
      delete game.goals;
    }

    maybeGenerateKnockoutFromGroups(championship);
    advanceKnockout(championship);

    championship.updatedAt = new Date().toISOString();

    await docClient.send(
      new PutCommand({
        TableName: TABLES.CHAMPIONSHIPS,
        Item: championship,
        ConditionExpression: 'ownerId = :ownerId',
        ExpressionAttributeValues: { ':ownerId': ownerId },
      }),
    );

    try {
      await syncGamesFromChampionshipGame(championship, gameId);
    } catch (err) {
       
      console.error('Falha ao propagar dados para jogos vinculados', {
        championshipId,
        gameId,
        error: err instanceof Error ? err.message : err,
      });
    }

    return championship;
  },

  /**
   * Link a championship game to a real Game record so the team owner can
   * manage team-side data (confirmed players, guests, lineup, photos).
   *
   * Authorization: requires the requesting user to own the team being linked
   * (NOT the championship creator). Each participant team can have at most one
   * linked Game per championship game.
   */
  async linkGame(
    championshipId: string,
    championshipGameId: string,
    requesterId: string,
    input: { teamId: string },
  ): Promise<{ teamId: string; gameId: string }> {
    const championship = await this.getById(championshipId);
    const cg = championship.games.find((g) => g.gameId === championshipGameId);
    if (!cg) throw new HttpError('Jogo do campeonato não encontrado', 404);

    if (!cg.homeTeamId || !cg.awayTeamId) {
      throw new HttpError(
        'Este jogo ainda não tem os dois times definidos',
        400,
      );
    }

    if (input.teamId !== cg.homeTeamId && input.teamId !== cg.awayTeamId) {
      throw new HttpError(
        'O time precisa ser um dos participantes deste jogo',
        400,
      );
    }

    // Requester must own the team.
    await teamService.getOwnedTeam(input.teamId, requesterId);

    // Normalize legacy single-link fields into links[] if needed.
    const existingLinks = getGameLinks(cg);
    if (!cg.links || cg.links.length === 0) {
      cg.links = existingLinks.length > 0 ? [...existingLinks] : [];
      delete cg.linkedGameId;
      delete cg.linkedTeamId;
    }

    const existing = cg.links.find((l) => l.teamId === input.teamId);
    if (existing) {
      return existing;
    }

    const opponentName =
      input.teamId === cg.homeTeamId ? cg.awayTeamName : cg.homeTeamName;
    const dateIso = cg.date ?? new Date().toISOString().slice(0, 10);
    const timeStr = cg.time ?? '00:00';
    const locationStr = cg.location ?? 'A definir';

    const linkedIsHome = cg.homeTeamId === input.teamId;
    let result: { scoreFor: number; scoreAgainst: number } | undefined;
    let status: 'AGENDADO' | 'REALIZADO' = 'AGENDADO';
    if (
      cg.status === 'REALIZADO' &&
      cg.homeScore !== undefined &&
      cg.awayScore !== undefined
    ) {
      status = 'REALIZADO';
      result = linkedIsHome
        ? { scoreFor: cg.homeScore, scoreAgainst: cg.awayScore }
        : { scoreFor: cg.awayScore, scoreAgainst: cg.homeScore };
    }

    const newGame = await gameService.create(input.teamId, {
      date: dateIso,
      time: timeStr,
      location: locationStr,
      opponent: opponentName ?? 'Adversário',
      status,
      result,
      championshipRef: {
        championshipId,
        championshipGameId,
      },
    });

    cg.links.push({ teamId: input.teamId, gameId: newGame.gameId });
    championship.updatedAt = new Date().toISOString();

    await docClient.send(
      new PutCommand({
        TableName: TABLES.CHAMPIONSHIPS,
        Item: championship,
      }),
    );

    // Make sure the freshly created Game also reflects current championship data.
    try {
      await syncGamesFromChampionshipGame(championship, championshipGameId);
    } catch {
      // best-effort
    }

    return { teamId: input.teamId, gameId: newGame.gameId };
  },

  /**
   * Read team-side data (confirmed players, guests, lineup, photos) of a
   * linked Game from the championship creator's perspective. Read-only.
   *
   * Authorization: only the championship creator.
   */
  async getTeamView(
    championshipId: string,
    championshipGameId: string,
    teamId: string,
    ownerId: string,
  ): Promise<{
    linkedGameId: string | null;
    confirmedPlayerIds: string[];
    guests: import('../models').GameGuest[];
    lineup: import('../models').GameLineup | null;
    players: import('../models').Player[];
  }> {
    const championship = await this.getOwned(championshipId, ownerId);
    const cg = championship.games.find((g) => g.gameId === championshipGameId);
    if (!cg) throw new HttpError('Jogo do campeonato não encontrado', 404);
    if (teamId !== cg.homeTeamId && teamId !== cg.awayTeamId) {
      throw new HttpError(
        'O time precisa ser um dos participantes deste jogo',
        400,
      );
    }
    const players = await playerService.listByTeam(teamId);
    const link = getGameLinks(cg).find((l) => l.teamId === teamId);
    if (!link) {
      return {
        linkedGameId: null,
        confirmedPlayerIds: [],
        guests: [],
        lineup: null,
        players,
      };
    }
    const linkedGame = await gameService.getById(teamId, link.gameId);
    return {
      linkedGameId: linkedGame.gameId,
      confirmedPlayerIds: linkedGame.confirmedPlayerIds ?? [],
      guests: linkedGame.guests ?? [],
      lineup: linkedGame.lineup ?? null,
      players,
    };
  },
};
