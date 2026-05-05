import { PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { v4 as uuid } from 'uuid';
import { docClient, TABLES } from '../utils/dynamo';
import { HttpError } from '../utils/response';
import type { Player, PlayerPosition } from '../models';

export interface CreatePlayerInput {
  name: string;
  position: PlayerPosition;
  number: number;
  characteristics?: string;
}

export const playerService = {
  async listByTeam(teamId: string): Promise<Player[]> {
    const result = await docClient.send(
      new QueryCommand({
        TableName: TABLES.PLAYERS,
        IndexName: 'teamId-index',
        KeyConditionExpression: 'teamId = :teamId',
        ExpressionAttributeValues: { ':teamId': teamId },
      }),
    );
    return (result.Items ?? []) as Player[];
  },

  async create(teamId: string, input: CreatePlayerInput): Promise<Player> {
    const existing = await this.listByTeam(teamId);
    if (existing.some((p) => p.number === input.number)) {
      throw new HttpError('Número de camisa já em uso neste time', 409);
    }
    const now = new Date().toISOString();
    const player: Player = {
      playerId: uuid(),
      teamId,
      name: input.name,
      position: input.position,
      number: input.number,
      characteristics: input.characteristics,
      createdAt: now,
      updatedAt: now,
    };
    await docClient.send(
      new PutCommand({
        TableName: TABLES.PLAYERS,
        Item: player,
        ConditionExpression: 'attribute_not_exists(playerId)',
      }),
    );
    return player;
  },
};
