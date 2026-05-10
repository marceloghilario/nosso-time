import { PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { v4 as uuid } from 'uuid';
import { docClient, TABLES } from '../utils/dynamo';
import type { Game, GameResult, GameStatus } from '../models';

export interface CreateGameInput {
  date: string;
  time: string;
  location: string;
  opponent: string;
  status: GameStatus;
  result?: GameResult;
}

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
};
