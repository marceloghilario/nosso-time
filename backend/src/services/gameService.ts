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
import type { Game, GameGoal, GameResult, GameStatus } from '../models';

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

export interface UpdateGameInput {
  date: string;
  time: string;
  location: string;
  opponent: string;
  status: GameStatus;
  result?: GameResult;
  goals?: GameGoalInput[];
}

const enrichGoals = async (
  teamId: string,
  goals: GameGoalInput[] | undefined,
): Promise<GameGoal[] | undefined> => {
  if (!goals || goals.length === 0) return goals === undefined ? undefined : [];
  const players = await playerService.listByTeam(teamId);
  const byId = new Map(players.map((p) => [p.playerId, p]));
  return goals.map((g) => {
    const player = byId.get(g.playerId);
    if (!player) {
      throw new HttpError(
        'Jogador não pertence a este time ou não existe',
        400,
      );
    }
    const goal: GameGoal = {
      playerId: player.playerId,
      playerName: player.name,
    };
    if (g.minute !== undefined) goal.minute = g.minute;
    return goal;
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
    await this.getById(teamId, gameId);
    const goals = await enrichGoals(teamId, input.goals);
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
