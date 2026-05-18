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
import type {
  Championship,
  ChampionshipFormat,
  ChampionshipGame,
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
  homeScore?: number;
  awayScore?: number;
  winnerByPenalties?: 'HOME' | 'AWAY' | null;
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

const isGroupComplete = (
  games: ChampionshipGame[],
  groupName: string,
): boolean =>
  games
    .filter((g) => g.phase === 'GROUP' && g.group === groupName)
    .every((g) => g.status === 'REALIZADO');

const standingsForGroup = (
  championship: Championship,
  groupName: string,
): { teamId: string; teamName: string; points: number; gd: number; gf: number }[] => {
  const group = championship.groups?.find((g) => g.name === groupName);
  if (!group) return [];
  const standings = group.teamIds.map((teamId) => {
    const participant = championship.participants.find(
      (p) => p.teamId === teamId,
    );
    return {
      teamId,
      teamName: participant?.teamName ?? '',
      points: 0,
      gd: 0,
      gf: 0,
    };
  });
  const groupGames = championship.games.filter(
    (g) => g.phase === 'GROUP' && g.group === groupName,
  );
  for (const g of groupGames) {
    if (g.status !== 'REALIZADO' || g.homeScore === undefined || g.awayScore === undefined)
      continue;
    const home = standings.find((s) => s.teamId === g.homeTeamId);
    const away = standings.find((s) => s.teamId === g.awayTeamId);
    if (!home || !away) continue;
    home.gf += g.homeScore;
    away.gf += g.awayScore;
    home.gd += g.homeScore - g.awayScore;
    away.gd += g.awayScore - g.homeScore;
    if (g.homeScore > g.awayScore) home.points += 3;
    else if (g.homeScore < g.awayScore) away.points += 3;
    else {
      home.points += 1;
      away.points += 1;
    }
  }
  return standings.sort(
    (a, b) => b.points - a.points || b.gd - a.gd || b.gf - a.gf,
  );
};

const buildKnockoutAfterGroups = (
  championship: Championship,
): ChampionshipGame[] => {
  if (!championship.groups) return [];
  const qualifiers: { teamId: string; teamName: string }[] = [];
  for (const group of championship.groups) {
    const standings = standingsForGroup(championship, group.name);
    const top = standings.slice(0, 2);
    qualifiers.push(
      ...top.map((s) => ({ teamId: s.teamId, teamName: s.teamName })),
    );
  }
  if (qualifiers.length < 2) return [];
  const slots = nextPowerOf2(qualifiers.length);
  while (qualifiers.length < slots) qualifiers.push({ teamId: '', teamName: '' });
  const games: ChampionshipGame[] = [];
  const phase = phaseForRound(slots, 0);
  for (let i = 0; i < slots; i += 2) {
    const a = qualifiers[i];
    const b = qualifiers[slots - 1 - i];
    games.push({
      gameId: uuid(),
      phase,
      round: 0,
      bracketIndex: i / 2,
      homeTeamId: a.teamId || undefined,
      homeTeamName: a.teamName || undefined,
      awayTeamId: b.teamId || undefined,
      awayTeamName: b.teamName || undefined,
      status: 'AGENDADO',
    });
  }
  return games;
};

const determineWinner = (
  g: ChampionshipGame,
): { teamId?: string; teamName?: string } | null => {
  if (g.status !== 'REALIZADO') return null;
  if (g.homeScore === undefined || g.awayScore === undefined) return null;
  if (g.homeScore > g.awayScore)
    return { teamId: g.homeTeamId, teamName: g.homeTeamName };
  if (g.awayScore > g.homeScore)
    return { teamId: g.awayTeamId, teamName: g.awayTeamName };
  if (g.winnerByPenalties === 'HOME')
    return { teamId: g.homeTeamId, teamName: g.homeTeamName };
  if (g.winnerByPenalties === 'AWAY')
    return { teamId: g.awayTeamId, teamName: g.awayTeamName };
  return null;
};

const advanceKnockout = (championship: Championship): void => {
  const knockoutPhases: ChampionshipPhase[] = ['R16', 'QF', 'SF', 'F'];
  for (let i = 0; i < knockoutPhases.length - 1; i++) {
    const currentPhase = knockoutPhases[i];
    const currentGames = championship.games
      .filter((g) => g.phase === currentPhase)
      .sort((a, b) => (a.bracketIndex ?? 0) - (b.bracketIndex ?? 0));
    if (currentGames.length === 0) continue;
    const allDecided = currentGames.every((g) => determineWinner(g) !== null);
    if (!allDecided) continue;

    const nextPhase = knockoutPhases[i + 1];
    const existingNext = championship.games.filter((g) => g.phase === nextPhase);
    if (existingNext.length > 0) {
      // Ensure they reflect the latest winners
      for (let pair = 0; pair < currentGames.length / 2; pair++) {
        const winA = determineWinner(currentGames[pair * 2]);
        const winB = determineWinner(currentGames[pair * 2 + 1]);
        const next = existingNext.find((g) => g.bracketIndex === pair);
        if (!next) continue;
        next.homeTeamId = winA?.teamId;
        next.homeTeamName = winA?.teamName;
        next.awayTeamId = winB?.teamId;
        next.awayTeamName = winB?.teamName;
      }
      continue;
    }

    const newGames: ChampionshipGame[] = [];
    for (let pair = 0; pair < currentGames.length / 2; pair++) {
      const winA = determineWinner(currentGames[pair * 2]);
      const winB = determineWinner(currentGames[pair * 2 + 1]);
      newGames.push({
        gameId: uuid(),
        phase: nextPhase,
        round: 0,
        bracketIndex: pair,
        homeTeamId: winA?.teamId,
        homeTeamName: winA?.teamName,
        awayTeamId: winB?.teamId,
        awayTeamName: winB?.teamName,
        status: 'AGENDADO',
      });
    }
    championship.games.push(...newGames);
  }
};

const maybeGenerateKnockoutFromGroups = (championship: Championship): void => {
  if (championship.format !== 'COPA' || !championship.groups) return;
  const allGroupsDone = championship.groups.every((g) =>
    isGroupComplete(championship.games, g.name),
  );
  if (!allGroupsDone) return;
  const hasKnockout = championship.games.some(
    (g) => g.phase !== 'GROUP' && g.phase !== 'RR',
  );
  if (hasKnockout) return;
  const knockoutGames = buildKnockoutAfterGroups(championship);
  championship.games.push(...knockoutGames);
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

  async updateGame(
    championshipId: string,
    gameId: string,
    ownerId: string,
    input: UpdateChampionshipGameInput,
  ): Promise<Championship> {
    const championship = await this.getOwned(championshipId, ownerId);
    const game = championship.games.find((g) => g.gameId === gameId);
    if (!game) throw new HttpError('Jogo não encontrado', 404);

    if (input.clear === true) {
      delete game.homeScore;
      delete game.awayScore;
      delete game.winnerByPenalties;
      game.status = 'AGENDADO';
    } else {
      if (input.homeScore === undefined || input.awayScore === undefined) {
        throw new HttpError('Informe placar de ambos os times', 400);
      }
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
    return championship;
  },
};
