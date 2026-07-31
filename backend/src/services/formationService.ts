import { randomBytes } from 'crypto';
import {
  DeleteCommand,
  GetCommand,
  PutCommand,
  QueryCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import { ConditionalCheckFailedException } from '@aws-sdk/client-dynamodb';
import { v4 as uuid } from 'uuid';
import { docClient, TABLES } from '../utils/dynamo';
import { HttpError } from '../utils/response';
import { playerService } from './playerService';
import type {
  Formation,
  FormationPlayerPosition,
  FormationScheme,
  Player,
  PublicFormationView,
  Team,
} from '../models';

export interface CreateFormationInput {
  name: string;
  scheme: FormationScheme;
  playerPositions: { playerId: string; x: number; y: number }[];
  isActive?: boolean;
}

const generateShareToken = (): string =>
  randomBytes(9).toString('base64url');

const enrichPositions = (
  positions: { playerId: string; x: number; y: number }[],
  players: Player[],
): FormationPlayerPosition[] => {
  const byId = new Map(players.map((p) => [p.playerId, p]));
  const enriched: FormationPlayerPosition[] = [];
  for (const pos of positions) {
    const player = byId.get(pos.playerId);
    if (!player) {
      throw new HttpError(
        'Jogador não pertence a este time ou não existe',
        400,
      );
    }
    enriched.push({
      playerId: player.playerId,
      playerName: player.name,
      playerNumber: player.number,
      x: pos.x,
      y: pos.y,
    });
  }
  return enriched;
};

const deactivateOthers = async (
  teamId: string,
  excludeFormationId: string,
): Promise<void> => {
  const result = await docClient.send(
    new QueryCommand({
      TableName: TABLES.FORMATIONS,
      IndexName: 'teamId-index',
      KeyConditionExpression: 'teamId = :teamId',
      FilterExpression: 'isActive = :true AND formationId <> :exclude',
      ExpressionAttributeValues: {
        ':teamId': teamId,
        ':true': true,
        ':exclude': excludeFormationId,
      },
    }),
  );
  const items = (result.Items ?? []) as Formation[];
  const now = new Date().toISOString();
  await Promise.all(
    items.map((f) =>
      docClient.send(
        new UpdateCommand({
          TableName: TABLES.FORMATIONS,
          Key: { formationId: f.formationId },
          UpdateExpression: 'SET isActive = :false, updatedAt = :now',
          ExpressionAttributeValues: {
            ':false': false,
            ':now': now,
          },
        }),
      ),
    ),
  );
};

export const formationService = {
  async listByTeam(teamId: string): Promise<Formation[]> {
    const result = await docClient.send(
      new QueryCommand({
        TableName: TABLES.FORMATIONS,
        IndexName: 'teamId-index',
        KeyConditionExpression: 'teamId = :teamId',
        ExpressionAttributeValues: { ':teamId': teamId },
      }),
    );
    return (result.Items ?? []) as Formation[];
  },

  async getActive(teamId: string): Promise<Formation | null> {
    const result = await docClient.send(
      new QueryCommand({
        TableName: TABLES.FORMATIONS,
        IndexName: 'teamId-index',
        KeyConditionExpression: 'teamId = :teamId',
        FilterExpression: 'isActive = :true',
        ExpressionAttributeValues: { ':teamId': teamId, ':true': true },
        Limit: 1,
      }),
    );
    const items = (result.Items ?? []) as Formation[];
    return items[0] ?? null;
  },

  async getById(formationId: string): Promise<Formation | null> {
    const result = await docClient.send(
      new GetCommand({
        TableName: TABLES.FORMATIONS,
        Key: { formationId },
      }),
    );
    return (result.Item as Formation | undefined) ?? null;
  },

  async getByShareToken(shareToken: string): Promise<PublicFormationView | null> {
    const result = await docClient.send(
      new QueryCommand({
        TableName: TABLES.FORMATIONS,
        IndexName: 'shareToken-index',
        KeyConditionExpression: 'shareToken = :token',
        ExpressionAttributeValues: { ':token': shareToken },
        Limit: 1,
      }),
    );
    const items = (result.Items ?? []) as Formation[];
    const formation = items[0];
    if (!formation) {
      return null;
    }
    return {
      teamName: formation.teamName,
      name: formation.name,
      scheme: formation.scheme,
      playerPositions: formation.playerPositions,
    };
  },

  async create(team: Team, input: CreateFormationInput): Promise<Formation> {
    const players = await playerService.listByTeam(team.teamId);
    const enriched = enrichPositions(input.playerPositions, players);
    const now = new Date().toISOString();

    // Auto-set as primary if it's the first formation for this team
    const existing = await this.listByTeam(team.teamId);
    const shouldBeActive =
      existing.length === 0 ? true : input.isActive === true;

    const formation: Formation = {
      formationId: uuid(),
      teamId: team.teamId,
      teamName: team.name,
      name: input.name,
      scheme: input.scheme,
      isActive: shouldBeActive,
      playerPositions: enriched,
      shareToken: generateShareToken(),
      createdAt: now,
      updatedAt: now,
    };
    await docClient.send(
      new PutCommand({
        TableName: TABLES.FORMATIONS,
        Item: formation,
        ConditionExpression: 'attribute_not_exists(formationId)',
      }),
    );
    if (formation.isActive) {
      await deactivateOthers(team.teamId, formation.formationId);
    }
    return formation;
  },

  async update(
    team: Team,
    formationId: string,
    input: CreateFormationInput,
  ): Promise<Formation> {
    const existing = await this.getById(formationId);
    if (!existing || existing.teamId !== team.teamId) {
      throw new HttpError('Recurso não encontrado', 404);
    }
    const players = await playerService.listByTeam(team.teamId);
    const enriched = enrichPositions(input.playerPositions, players);
    const now = new Date().toISOString();
    const updated: Formation = {
      ...existing,
      teamName: team.name,
      name: input.name,
      scheme: input.scheme,
      isActive: input.isActive === true,
      playerPositions: enriched,
      updatedAt: now,
    };
    try {
      await docClient.send(
        new PutCommand({
          TableName: TABLES.FORMATIONS,
          Item: updated,
          ConditionExpression: 'attribute_exists(formationId)',
        }),
      );
    } catch (err) {
      if (err instanceof ConditionalCheckFailedException) {
        throw new HttpError('Recurso não encontrado', 404);
      }
      throw err;
    }
    if (updated.isActive) {
      await deactivateOthers(team.teamId, updated.formationId);
    }
    return updated;
  },

  async delete(team: Team, formationId: string): Promise<void> {
    const existing = await this.getById(formationId);
    if (!existing || existing.teamId !== team.teamId) {
      throw new HttpError('Recurso não encontrado', 404);
    }
    await docClient.send(
      new DeleteCommand({
        TableName: TABLES.FORMATIONS,
        Key: { formationId },
      }),
    );

    // If we deleted the primary, promote the oldest remaining
    if (existing.isActive) {
      const remaining = await this.listByTeam(team.teamId);
      if (remaining.length > 0) {
        const oldest = remaining.sort(
          (a, b) => a.createdAt.localeCompare(b.createdAt),
        )[0];
        await this.setPrimary(team.teamId, oldest.formationId);
      }
    }
  },

  async setPrimary(teamId: string, formationId: string): Promise<Formation> {
    const formation = await this.getById(formationId);
    if (!formation || formation.teamId !== teamId) {
      throw new HttpError('Recurso não encontrado', 404);
    }
    const now = new Date().toISOString();
    await docClient.send(
      new UpdateCommand({
        TableName: TABLES.FORMATIONS,
        Key: { formationId },
        UpdateExpression: 'SET isActive = :true, updatedAt = :now',
        ExpressionAttributeValues: { ':true': true, ':now': now },
      }),
    );
    await deactivateOthers(teamId, formationId);
    return { ...formation, isActive: true, updatedAt: now };
  },

  async getPrimary(teamId: string): Promise<Formation | null> {
    return this.getActive(teamId);
  },
};
