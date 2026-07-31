import {
  GetCommand,
  PutCommand,
  QueryCommand,
  TransactWriteCommand,
} from '@aws-sdk/lib-dynamodb';
import type { TransactWriteCommandInput } from '@aws-sdk/lib-dynamodb';
import { TransactionCanceledException } from '@aws-sdk/client-dynamodb';
import { v4 as uuid } from 'uuid';
import { docClient, TABLES } from '../utils/dynamo';
import { HttpError } from '../utils/response';
import type { Player, PlayerPosition } from '../models';

export interface CreatePlayerInput {
  name: string;
  position: PlayerPosition;
  number?: number;
  characteristics?: string;
}

export type UpdatePlayerInput = CreatePlayerInput;

type TransactItems = NonNullable<TransactWriteCommandInput['TransactItems']>;

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

  async getById(playerId: string): Promise<Player | null> {
    const result = await docClient.send(
      new GetCommand({
        TableName: TABLES.PLAYERS,
        Key: { playerId },
      }),
    );
    return (result.Item as Player | undefined) ?? null;
  },

  /**
   * Loads a player and asserts it belongs to `teamId`. Jersey reservation
   * rows lack a `teamId`, so they resolve to 404 here as well.
   */
  async getPlayerOfTeam(teamId: string, playerId: string): Promise<Player> {
    const player = await this.getById(playerId);
    if (!player || player.teamId !== teamId) {
      throw new HttpError('Recurso não encontrado', 404);
    }
    return player;
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
    if (input.number === undefined) {
      await docClient.send(
        new PutCommand({
          TableName: TABLES.PLAYERS,
          Item: player,
          ConditionExpression: 'attribute_not_exists(playerId)',
        }),
      );
      return player;
    }
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

  async update(
    teamId: string,
    playerId: string,
    input: UpdatePlayerInput,
  ): Promise<Player> {
    const existing = await this.getPlayerOfTeam(teamId, playerId);
    const now = new Date().toISOString();
    const updated: Player = {
      ...existing,
      name: input.name,
      position: input.position,
      number: input.number,
      characteristics: input.characteristics,
      updatedAt: now,
    };

    const oldNumber = existing.number;
    const newNumber = input.number;

    // Jersey number unchanged: a plain overwrite suffices.
    if (oldNumber === newNumber) {
      await docClient.send(
        new PutCommand({
          TableName: TABLES.PLAYERS,
          Item: updated,
          ConditionExpression: 'attribute_exists(playerId)',
        }),
      );
      return updated;
    }

    // Jersey number changed: overwrite the player, reserve the new number and
    // release the old one atomically. The reservation Put is placed at a known
    // index so a conflict maps to a 409.
    const transactItems: TransactItems = [
      {
        Put: {
          TableName: TABLES.PLAYERS,
          Item: updated,
          ConditionExpression: 'attribute_exists(playerId)',
        },
      },
    ];
    let reservationIndex = -1;
    if (newNumber !== undefined) {
      reservationIndex = transactItems.length;
      transactItems.push({
        Put: {
          TableName: TABLES.PLAYERS,
          Item: {
            playerId: numberReservationKey(teamId, newNumber),
            reservedAt: now,
            reservedBy: playerId,
          },
          ConditionExpression: 'attribute_not_exists(playerId)',
        },
      });
    }
    if (oldNumber !== undefined) {
      transactItems.push({
        Delete: {
          TableName: TABLES.PLAYERS,
          Key: { playerId: numberReservationKey(teamId, oldNumber) },
        },
      });
    }

    try {
      await docClient.send(
        new TransactWriteCommand({ TransactItems: transactItems }),
      );
    } catch (err) {
      if (err instanceof TransactionCanceledException) {
        const reasons = err.CancellationReasons ?? [];
        if (
          reservationIndex >= 0 &&
          reasons[reservationIndex]?.Code === 'ConditionalCheckFailed'
        ) {
          throw new HttpError('Número de camisa já em uso neste time', 409);
        }
      }
      throw err;
    }
    return updated;
  },
};
