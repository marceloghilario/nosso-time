import { QueryCommand, TransactWriteCommand } from '@aws-sdk/lib-dynamodb';
import { TransactionCanceledException } from '@aws-sdk/client-dynamodb';
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

const numberReservationKey = (teamId: string, number: number): string =>
  `jersey#${teamId}#${number}`;

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
    try {
      await docClient.send(
        new TransactWriteCommand({
          TransactItems: [
            {
              Put: {
                TableName: TABLES.PLAYERS,
                Item: player,
                ConditionExpression: 'attribute_not_exists(playerId)',
              },
            },
            {
              Put: {
                TableName: TABLES.PLAYERS,
                Item: {
                  playerId: numberReservationKey(teamId, input.number),
                  reservedAt: now,
                  reservedBy: player.playerId,
                },
                ConditionExpression: 'attribute_not_exists(playerId)',
              },
            },
          ],
        }),
      );
    } catch (err) {
      if (err instanceof TransactionCanceledException) {
        const reasons = err.CancellationReasons ?? [];
        if (reasons[1]?.Code === 'ConditionalCheckFailed') {
          throw new HttpError('Número de camisa já em uso neste time', 409);
        }
      }
      throw err;
    }
    return player;
  },
};
