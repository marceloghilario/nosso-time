import {
  PutCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import { v4 as uuid } from 'uuid';
import { docClient, TABLES } from '../utils/dynamo';
import type {
  Championship,
  ChampionshipGame,
  ChampionshipGameGoal,
  ChampionshipGameLink,
  GameGoal,
  GameResult,
} from '../models';

/**
 * Cross-service sync between Championship and Game.
 *
 * Direction is one-way: Championship → Game.  The championship creator owns
 * match-level fields (date/time/location/score/status/goals) and changes flow
 * down to every linked Game. Team owners can only edit team-side fields
 * (confirmed players, guests, lineup, photos) on the Game itself.
 */

export const getGameLinks = (
  cg: ChampionshipGame,
): ChampionshipGameLink[] => {
  if (cg.links && cg.links.length > 0) return cg.links;
  if (cg.linkedGameId && cg.linkedTeamId) {
    return [{ teamId: cg.linkedTeamId, gameId: cg.linkedGameId }];
  }
  return [];
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

const nextPowerOf2 = (n: number): number => {
  let p = 1;
  while (p < n) p *= 2;
  return p;
};

const isGroupComplete = (
  games: ChampionshipGame[],
  groupName: string,
): boolean =>
  games
    .filter((g) => g.phase === 'GROUP' && g.group === groupName)
    .every((g) => g.status === 'REALIZADO');

const phaseForRound = (
  participantsInBracket: number,
  round: number,
): ChampionshipGame['phase'] => {
  const remaining = participantsInBracket / 2 ** round;
  if (remaining <= 2) return 'F';
  if (remaining <= 4) return 'SF';
  if (remaining <= 8) return 'QF';
  return 'R16';
};

const standingsForGroup = (
  championship: Championship,
  groupName: string,
): {
  teamId: string;
  teamName: string;
  points: number;
  gd: number;
  gf: number;
}[] => {
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
    if (
      g.status !== 'REALIZADO' ||
      g.homeScore === undefined ||
      g.awayScore === undefined
    )
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
  while (qualifiers.length < slots)
    qualifiers.push({ teamId: '', teamName: '' });
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

export const advanceKnockout = (championship: Championship): void => {
  const knockoutPhases: ChampionshipGame['phase'][] = ['R16', 'QF', 'SF', 'F'];
  for (let i = 0; i < knockoutPhases.length - 1; i++) {
    const currentPhase = knockoutPhases[i];
    const currentGames = championship.games
      .filter((g) => g.phase === currentPhase)
      .sort((a, b) => (a.bracketIndex ?? 0) - (b.bracketIndex ?? 0));
    if (currentGames.length === 0) continue;
    const allDecided = currentGames.every((g) => determineWinner(g) !== null);
    if (!allDecided) continue;
    const nextPhase = knockoutPhases[i + 1];
    const existingNext = championship.games.filter(
      (g) => g.phase === nextPhase,
    );
    if (existingNext.length > 0) {
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

export const maybeGenerateKnockoutFromGroups = (
  championship: Championship,
): void => {
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

const translateGoalsForTeam = (
  cgGoals: ChampionshipGameGoal[] | undefined,
  teamSide: 'HOME' | 'AWAY',
): GameGoal[] | undefined => {
  if (!cgGoals) return undefined;
  return cgGoals
    .filter((g) => g.teamSide === teamSide)
    .map((g) => {
      const out: GameGoal = { playerId: g.playerId, playerName: g.playerName };
      if (g.minute !== undefined) out.minute = g.minute;
      return out;
    });
};

/**
 * Sync Championship → Game for every Game linked to the given championship game.
 * Called by championshipService.updateGame after the championship has been persisted.
 *
 * Writes directly to DynamoDB (does not go through gameService.update) to avoid
 * the team-owner authorization check.
 */
export const syncGamesFromChampionshipGame = async (
  championship: Championship,
  championshipGameId: string,
): Promise<void> => {
  const cg = championship.games.find((g) => g.gameId === championshipGameId);
  if (!cg) return;
  const links = getGameLinks(cg);
  if (links.length === 0) return;

  const now = new Date().toISOString();

  for (const link of links) {
    const linkedIsHome = cg.homeTeamId === link.teamId;
    const linkedIsAway = cg.awayTeamId === link.teamId;
    if (!linkedIsHome && !linkedIsAway) continue;

    const opponentName = linkedIsHome ? cg.awayTeamName : cg.homeTeamName;
    const teamSide: 'HOME' | 'AWAY' = linkedIsHome ? 'HOME' : 'AWAY';

    let result: GameResult | undefined;
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

    const teamGoals = translateGoalsForTeam(cg.goals, teamSide);

    const setExprs: string[] = ['#status = :status', '#updatedAt = :updatedAt'];
    const names: Record<string, string> = {
      '#status': 'status',
      '#updatedAt': 'updatedAt',
    };
    const values: Record<string, unknown> = {
      ':status': status,
      ':updatedAt': now,
      ':teamId': link.teamId,
    };
    const removes: string[] = [];

    if (cg.date) {
      setExprs.push('#date = :date');
      names['#date'] = 'date';
      values[':date'] = cg.date;
    }
    if (cg.time) {
      setExprs.push('#time = :time');
      names['#time'] = 'time';
      values[':time'] = cg.time;
    }
    if (cg.location) {
      setExprs.push('#location = :location');
      names['#location'] = 'location';
      values[':location'] = cg.location;
    }
    if (opponentName) {
      setExprs.push('#opponent = :opponent');
      names['#opponent'] = 'opponent';
      values[':opponent'] = opponentName;
    }

    if (result) {
      setExprs.push('#result = :result');
      names['#result'] = 'result';
      values[':result'] = result;
    } else {
      removes.push('#result');
      names['#result'] = 'result';
    }
    if (teamGoals && teamGoals.length > 0 && status === 'REALIZADO') {
      setExprs.push('#goals = :goals');
      names['#goals'] = 'goals';
      values[':goals'] = teamGoals;
    } else {
      removes.push('#goals');
      names['#goals'] = 'goals';
    }

    let updateExpression = `SET ${setExprs.join(', ')}`;
    if (removes.length > 0) {
      updateExpression += ` REMOVE ${removes.join(', ')}`;
    }
    try {
      await docClient.send(
        new UpdateCommand({
          TableName: TABLES.GAMES,
          Key: { gameId: link.gameId },
          UpdateExpression: updateExpression,
          ExpressionAttributeNames: names,
          ExpressionAttributeValues: values,
          ConditionExpression: 'attribute_exists(gameId) AND teamId = :teamId',
        }),
      );
    } catch (err) {
       
      console.error('Falha ao sincronizar jogo a partir do campeonato', {
        championshipId: championship.championshipId,
        championshipGameId,
        linkedGameId: link.gameId,
        error: err instanceof Error ? err.message : err,
      });
    }
  }
};

/**
 * Persist updates to a championship without recomputing knockout/advance.
 * Helper used by services that own the championship document.
 */
export const persistChampionship = async (
  championship: Championship,
): Promise<void> => {
  await docClient.send(
    new PutCommand({
      TableName: TABLES.CHAMPIONSHIPS,
      Item: championship,
    }),
  );
};
