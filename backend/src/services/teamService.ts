import {
  GetCommand,
  PutCommand,
  QueryCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import { v4 as uuid } from 'uuid';
import { docClient, TABLES } from '../utils/dynamo';
import { HttpError } from '../utils/response';
import type { Team } from '../models';

export interface CreateTeamInput {
  name: string;
  description?: string;
}

export const teamService = {
  async create(ownerId: string, input: CreateTeamInput): Promise<Team> {
    const now = new Date().toISOString();
    const team: Team = {
      teamId: uuid(),
      ownerId,
      name: input.name,
      description: input.description,
      plan: 'FREE',
      photoCount: 0,
      createdAt: now,
      updatedAt: now,
    };
    await docClient.send(
      new PutCommand({
        TableName: TABLES.TEAMS,
        Item: team,
        ConditionExpression: 'attribute_not_exists(teamId)',
      }),
    );
    return team;
  },

  async listByOwner(ownerId: string): Promise<Team[]> {
    const result = await docClient.send(
      new QueryCommand({
        TableName: TABLES.TEAMS,
        IndexName: 'ownerId-index',
        KeyConditionExpression: 'ownerId = :ownerId',
        ExpressionAttributeValues: { ':ownerId': ownerId },
      }),
    );
    return (result.Items ?? []) as Team[];
  },

  async getById(teamId: string): Promise<Team | null> {
    const result = await docClient.send(
      new GetCommand({
        TableName: TABLES.TEAMS,
        Key: { teamId },
      }),
    );
    return (result.Item as Team | undefined) ?? null;
  },

  async getOwnedTeam(teamId: string, ownerId: string): Promise<Team> {
    const team = await this.getById(teamId);
    if (!team) {
      throw new HttpError('Recurso não encontrado', 404);
    }
    if (team.ownerId !== ownerId) {
      throw new HttpError('Você não tem permissão para acessar este recurso', 403);
    }
    return team;
  },

  async incrementPhotoCount(teamId: string): Promise<number> {
    const result = await docClient.send(
      new UpdateCommand({
        TableName: TABLES.TEAMS,
        Key: { teamId },
        UpdateExpression: 'SET photoCount = if_not_exists(photoCount, :zero) + :one, updatedAt = :now',
        ExpressionAttributeValues: {
          ':zero': 0,
          ':one': 1,
          ':now': new Date().toISOString(),
        },
        ReturnValues: 'UPDATED_NEW',
      }),
    );
    const updated = result.Attributes?.photoCount;
    return typeof updated === 'number' ? updated : 0;
  },
};
