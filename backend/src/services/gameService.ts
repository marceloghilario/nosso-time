import {
  GetCommand,
  PutCommand,
  QueryCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import { v4 as uuid } from 'uuid';
import { docClient, TABLES } from '../utils/dynamo';
import { HttpError } from '../utils/response';
import { playerService } from './playerService';
import type {
  Game,
  GameGoal,
  GameGuest,
  GameLineup,
  GameResult,
  GameStatus,
  PlayerPosition,
} from '../models';

export interface CreateGameInput {
  date: string;
  time: string;
  location: string;
  opponent: string;
  status: GameStatus;
  result?: GameResult;
}

export interface GameGoalInput {
  playerId: string;
  minute?: number;
}

export interface GameGuestInput {
  guestId?: string;
  name: string;
  position?: PlayerPosition;
  number?: number;
}

export interface GameLineupInput {
  scheme: string;
  positions: { playerId: string; x: number; y: number }[];
}

export interface UpdateGameInput {
  date: string;
  time: string;
  location: string;
  opponent: string;
  status: GameStatus;
  result?: GameResult;
  goals?: GameGoalInput[];
  confirmedPlayerIds?: string[];
  guests?: GameGuestInput[];
  lineup?: GameLineupInput;
}

const enrichGoals = (
  goals: GameGoalInput[] | undefined,
  scorers: Map<string, string>,
): GameGoal[] | undefined => {
  if (!goals || goals.length === 0) return goals === undefined ? undefined : [];
  return goals.map((g) => {
    const name = scorers.get(g.playerId);
    if (!name) {
      throw new HttpError(
        'Autor do gol precisa estar entre os jogadores confirmados ou convidados',
        400,
      );
    }
    const goal: GameGoal = {
      playerId: g.playerId,
      playerName: name,
    };
    if (g.minute !== undefined) goal.minute = g.minute;
    return goal;
  });
};

const sanitizeConfirmedPlayerIds = (
  inputIds: string[] | undefined,
  teamPlayerIds: Set<string>,
): string[] | undefined => {
  if (inputIds === undefined) return undefined;
  const seen = new Set<string>();
  const out: string[] = [];
  for (const id of inputIds) {
    if (!teamPlayerIds.has(id)) {
      throw new HttpError(
        'Jogador confirmado não pertence a este time',
        400,
      );
    }
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
};

const sanitizeGuests = (
  inputGuests: GameGuestInput[] | undefined,
): GameGuest[] | undefined => {
  if (inputGuests === undefined) return undefined;
  return inputGuests.map((g) => {
    const guest: GameGuest = {
      guestId: g.guestId && g.guestId.length > 0 ? g.guestId : uuid(),
      name: g.name.trim(),
    };
    if (g.position) guest.position = g.position;
    if (g.number !== undefined) guest.number = g.number;
    return guest;
  });
};

export const gameService = {
  async listByTeam(teamId: string): Promise<Game[]> {
    const result = await docClient.send(
      new QueryCommand({
        TableName: TABLES.GAMES,
        IndexName: 'teamId-date-index',
        KeyConditionExpression: 'teamId = :teamId',
        ExpressionAttributeValues: { ':teamId': teamId },
        ScanIndexForward: false,
      }),
    );
    return (result.Items ?? []) as Game[];
  },

  async getById(teamId: string, gameId: string): Promise<Game> {
    const result = await docClient.send(
      new GetCommand({ TableName: TABLES.GAMES, Key: { gameId } }),
    );
    const game = result.Item as Game | undefined;
    if (!game || game.teamId !== teamId) {
      throw new HttpError('Recurso não encontrado', 404);
    }
    return game;
  },

  async create(teamId: string, input: CreateGameInput): Promise<Game> {
    const now = new Date().toISOString();
    const game: Game = {
      gameId: uuid(),
      teamId,
      date: input.date,
      time: input.time,
      location: input.location,
      opponent: input.opponent,
      status: input.status,
      result: input.status === 'REALIZADO' ? input.result : undefined,
      createdAt: now,
      updatedAt: now,
    };
    await docClient.send(
      new PutCommand({
        TableName: TABLES.GAMES,
        Item: game,
        ConditionExpression: 'attribute_not_exists(gameId)',
      }),
    );
    return game;
  },

  async update(
    teamId: string,
    gameId: string,
    input: UpdateGameInput,
  ): Promise<Game> {
    const existing = await this.getById(teamId, gameId);
    const teamPlayers = await playerService.listByTeam(teamId);
    const teamPlayerIds = new Set(teamPlayers.map((p) => p.playerId));
    const teamPlayerNames = new Map(
      teamPlayers.map((p) => [p.playerId, p.name] as const),
    );

    const confirmedPlayerIds = sanitizeConfirmedPlayerIds(
      input.confirmedPlayerIds,
      teamPlayerIds,
    );
    const guests = sanitizeGuests(input.guests);

    const finalConfirmed =
      confirmedPlayerIds !== undefined
        ? confirmedPlayerIds
        : existing.confirmedPlayerIds;
    const finalGuests = guests !== undefined ? guests : existing.guests;

    const scorers = new Map<string, string>();
    for (const pid of finalConfirmed ?? []) {
      const name = teamPlayerNames.get(pid);
      if (name) scorers.set(pid, name);
    }
    for (const guest of finalGuests ?? []) {
      scorers.set(guest.guestId, guest.name);
    }
    const goals = enrichGoals(input.goals, scorers);

    let lineup: GameLineup | undefined;
    let clearLineup = false;
    if (input.lineup !== undefined) {
      const pool = new Set<string>([
        ...(finalConfirmed ?? []),
        ...((finalGuests ?? []).map((g) => g.guestId)),
      ]);
      const seen = new Set<string>();
      for (const pos of input.lineup.positions) {
        if (!pool.has(pos.playerId)) {
          throw new HttpError(
            'Jogador da escalação precisa estar entre confirmados ou convidados',
            400,
          );
        }
        if (seen.has(pos.playerId)) {
          throw new HttpError(
            'Jogador duplicado na escalação',
            400,
          );
        }
        seen.add(pos.playerId);
      }
      if (input.lineup.positions.length === 0) {
        clearLineup = true;
      } else {
        lineup = {
          scheme: input.lineup.scheme,
          positions: input.lineup.positions.map((p) => ({
            playerId: p.playerId,
            x: p.x,
            y: p.y,
          })),
        };
      }
    }
    const now = new Date().toISOString();
    const result = input.status === 'REALIZADO' ? input.result : undefined;
    const finalGoals = input.status === 'REALIZADO' ? goals : undefined;

    const setExprs: string[] = [
      '#date = :date',
      '#time = :time',
      '#location = :location',
      '#opponent = :opponent',
      '#status = :status',
      '#updatedAt = :updatedAt',
    ];
    const names: Record<string, string> = {
      '#date': 'date',
      '#time': 'time',
      '#location': 'location',
      '#opponent': 'opponent',
      '#status': 'status',
      '#updatedAt': 'updatedAt',
    };
    const values: Record<string, unknown> = {
      ':date': input.date,
      ':time': input.time,
      ':location': input.location,
      ':opponent': input.opponent,
      ':status': input.status,
      ':updatedAt': now,
      ':teamId': teamId,
    };
    const removes: string[] = [];
    if (result) {
      setExprs.push('#result = :result');
      names['#result'] = 'result';
      values[':result'] = result;
    } else {
      removes.push('#result');
      names['#result'] = 'result';
    }
    if (finalGoals && finalGoals.length > 0) {
      setExprs.push('#goals = :goals');
      names['#goals'] = 'goals';
      values[':goals'] = finalGoals;
    } else {
      removes.push('#goals');
      names['#goals'] = 'goals';
    }
    if (confirmedPlayerIds !== undefined) {
      if (confirmedPlayerIds.length > 0) {
        setExprs.push('#confirmedPlayerIds = :confirmedPlayerIds');
        names['#confirmedPlayerIds'] = 'confirmedPlayerIds';
        values[':confirmedPlayerIds'] = confirmedPlayerIds;
      } else {
        removes.push('#confirmedPlayerIds');
        names['#confirmedPlayerIds'] = 'confirmedPlayerIds';
      }
    }
    if (guests !== undefined) {
      if (guests.length > 0) {
        setExprs.push('#guests = :guests');
        names['#guests'] = 'guests';
        values[':guests'] = guests;
      } else {
        removes.push('#guests');
        names['#guests'] = 'guests';
      }
    }
    if (lineup) {
      setExprs.push('#lineup = :lineup');
      names['#lineup'] = 'lineup';
      values[':lineup'] = lineup;
    } else if (clearLineup) {
      removes.push('#lineup');
      names['#lineup'] = 'lineup';
    }
    let updateExpression = `SET ${setExprs.join(', ')}`;
    if (removes.length > 0) {
      updateExpression += ` REMOVE ${removes.join(', ')}`;
    }

    const update = await docClient.send(
      new UpdateCommand({
        TableName: TABLES.GAMES,
        Key: { gameId },
        UpdateExpression: updateExpression,
        ExpressionAttributeNames: names,
        ExpressionAttributeValues: values,
        ConditionExpression: 'attribute_exists(gameId) AND teamId = :teamId',
        ReturnValues: 'ALL_NEW',
      }),
    );
    return update.Attributes as Game;
  },
};
