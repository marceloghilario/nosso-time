import {
  BatchGetCommand,
  DeleteCommand,
  GetCommand,
  PutCommand,
  QueryCommand,
  ScanCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import { ConditionalCheckFailedException } from '@aws-sdk/client-dynamodb';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuid } from 'uuid';
import { docClient, TABLES } from '../utils/dynamo';
import { HttpError } from '../utils/response';
import { PLAN_LIMITS } from '../models';
import type { Modality, Team, TeamRole } from '../models';

export interface CreateTeamInput {
  name: string;
  description?: string;
  modality?: Modality;
}

export interface UpdateTeamInput {
  name?: string;
  description?: string;
  logoS3Key?: string;
}

export interface LogoUploadUrlInput {
  contentType: string;
  fileName: string;
}

export interface TeamWithLogo extends Team {
  logoUrl?: string;
}

const region = process.env.AWS_REGION ?? 'us-east-1';
const s3Client = new S3Client({ region });
const BUCKET = process.env.PHOTOS_BUCKET ?? '';
const LOGO_UPLOAD_URL_EXPIRY_SECONDS = 5 * 60;
const LOGO_VIEW_URL_EXPIRY_SECONDS = 60 * 60;

const sanitizeFileName = (name: string): string =>
  name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 100);

const teamLogoS3Prefix = (teamId: string): string => `teams/${teamId}/logo/`;

const ensureLogoKeyBelongsToTeam = (s3Key: string, teamId: string): void => {
  if (!s3Key.startsWith(teamLogoS3Prefix(teamId))) {
    throw new HttpError('Chave S3 inválida para o logo deste time', 400);
  }
};

const buildLogoViewUrl = async (s3Key: string): Promise<string> => {
  const command = new GetObjectCommand({ Bucket: BUCKET, Key: s3Key });
  return getSignedUrl(s3Client, command, { expiresIn: LOGO_VIEW_URL_EXPIRY_SECONDS });
};

export const enrichTeamWithLogoUrl = async (
  team: Team,
): Promise<TeamWithLogo> => {
  if (!team.logoS3Key) return team;
  return { ...team, logoUrl: await buildLogoViewUrl(team.logoS3Key) };
};

export const teamService = {
  async create(ownerId: string, input: CreateTeamInput): Promise<Team> {
    const now = new Date().toISOString();
    const team: Team = {
      teamId: uuid(),
      ownerId,
      name: input.name,
      description: input.description,
      modality: input.modality ?? 'FUTEBOL',
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
    await docClient.send(
      new PutCommand({
        TableName: TABLES.TEAM_MEMBERSHIPS,
        Item: {
          teamId: team.teamId,
          userId: ownerId,
          role: 'OWNER',
          createdAt: now,
        },
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

  /**
   * Resolves a team that the caller is allowed to read/manage. Accepts both
   * OWNER and ADMIN memberships. Throws 404 when the team doesn't exist and
   * 403 when the caller has no membership of an acceptable role.
   */
  async getManagedTeam(
    teamId: string,
    userId: string,
    allowed: ReadonlyArray<TeamRole> = ['OWNER', 'ADMIN'],
  ): Promise<{ team: Team; role: TeamRole }> {
    const team = await this.getById(teamId);
    if (!team) {
      throw new HttpError('Recurso não encontrado', 404);
    }
    const { membershipService } = await import('./membershipService');
    const role = await membershipService.getOrBackfillRole(teamId, userId);
    if (!role) {
      throw new HttpError(
        'Você não tem permissão para acessar este recurso',
        403,
      );
    }
    if (!allowed.includes(role)) {
      throw new HttpError(
        'Você não tem permissão para esta ação',
        403,
      );
    }
    return { team, role };
  },

  async getTeamsByIds(teamIds: string[]): Promise<Team[]> {
    if (teamIds.length === 0) return [];
    const unique = Array.from(new Set(teamIds));
    const chunks: string[][] = [];
    for (let i = 0; i < unique.length; i += 100) {
      chunks.push(unique.slice(i, i + 100));
    }
    const all: Team[] = [];
    for (const chunk of chunks) {
      const result = await docClient.send(
        new BatchGetCommand({
          RequestItems: {
            [TABLES.TEAMS]: {
              Keys: chunk.map((teamId) => ({ teamId })),
            },
          },
        }),
      );
      const items = (result.Responses?.[TABLES.TEAMS] ?? []) as Team[];
      all.push(...items);
    }
    return all;
  },

  async searchPublic(query: string, limit = 50): Promise<Team[]> {
    const needle = query.trim().toLowerCase();
    const items: Team[] = [];
    let lastKey: Record<string, unknown> | undefined;
    const MAX_PAGES = 5;
    let pages = 0;
    do {
      const result: {
        Items?: Record<string, unknown>[];
        LastEvaluatedKey?: Record<string, unknown>;
      } = await docClient.send(
        new ScanCommand({
          TableName: TABLES.TEAMS,
          Limit: 200,
          ExclusiveStartKey: lastKey,
        }),
      );
      const fromThisPage = (result.Items ?? []) as unknown as Team[];
      const filtered = fromThisPage.filter(
        (t) =>
          typeof t.name === 'string' &&
          (needle.length === 0 || t.name.toLowerCase().includes(needle)),
      );
      items.push(...filtered);
      lastKey = result.LastEvaluatedKey;
      pages += 1;
      if (items.length >= limit || pages >= MAX_PAGES) break;
    } while (lastKey);

    items.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
    return items.slice(0, limit);
  },

  async getPublicById(teamId: string): Promise<Team> {
    const team = await this.getById(teamId);
    if (!team) {
      throw new HttpError('Recurso não encontrado', 404);
    }
    return team;
  },

  async update(
    teamId: string,
    userId: string,
    input: UpdateTeamInput,
  ): Promise<Team> {
    const { team } = await this.getManagedTeam(teamId, userId);
    if (input.logoS3Key !== undefined) {
      ensureLogoKeyBelongsToTeam(input.logoS3Key, teamId);
    }

    const exprNames: Record<string, string> = { '#updatedAt': 'updatedAt' };
    const exprValues: Record<string, unknown> = {
      ':updatedAt': new Date().toISOString(),
    };
    const sets: string[] = ['#updatedAt = :updatedAt'];

    if (input.name !== undefined) {
      exprNames['#name'] = 'name';
      exprValues[':name'] = input.name;
      sets.push('#name = :name');
    }
    if (input.description !== undefined) {
      exprNames['#description'] = 'description';
      exprValues[':description'] = input.description;
      sets.push('#description = :description');
    }
    if (input.logoS3Key !== undefined) {
      exprNames['#logoS3Key'] = 'logoS3Key';
      exprValues[':logoS3Key'] = input.logoS3Key;
      sets.push('#logoS3Key = :logoS3Key');
    }

    const result = await docClient.send(
      new UpdateCommand({
        TableName: TABLES.TEAMS,
        Key: { teamId: team.teamId },
        UpdateExpression: `SET ${sets.join(', ')}`,
        ExpressionAttributeNames: exprNames,
        ExpressionAttributeValues: exprValues,
        ConditionExpression: 'attribute_exists(teamId)',
        ReturnValues: 'ALL_NEW',
      }),
    );
    return (result.Attributes as Team) ?? team;
  },

  async getLogoUploadUrl(
    team: Team,
    input: LogoUploadUrlInput,
  ): Promise<{ uploadUrl: string; s3Key: string }> {
    const safeName = sanitizeFileName(input.fileName);
    const s3Key = `${teamLogoS3Prefix(team.teamId)}${uuid()}-${safeName}`;
    const command = new PutObjectCommand({
      Bucket: BUCKET,
      Key: s3Key,
      ContentType: input.contentType,
    });
    const uploadUrl = await getSignedUrl(s3Client, command, {
      expiresIn: LOGO_UPLOAD_URL_EXPIRY_SECONDS,
    });
    return { uploadUrl, s3Key };
  },

  async reserveAndIncrementPhoto(team: Team): Promise<number> {
    const limit = PLAN_LIMITS[team.plan];
    try {
      const result = await docClient.send(
        new UpdateCommand({
          TableName: TABLES.TEAMS,
          Key: { teamId: team.teamId },
          UpdateExpression:
            'SET photoCount = if_not_exists(photoCount, :zero) + :one, updatedAt = :now',
          ConditionExpression: 'attribute_exists(teamId) AND photoCount < :limit',
          ExpressionAttributeValues: {
            ':zero': 0,
            ':one': 1,
            ':now': new Date().toISOString(),
            ':limit': limit,
          },
          ReturnValues: 'UPDATED_NEW',
        }),
      );
      const updated = result.Attributes?.photoCount;
      return typeof updated === 'number' ? updated : 0;
    } catch (err) {
      if (err instanceof ConditionalCheckFailedException) {
        throw new HttpError(
          'Limite de fotos atingido. Faça upgrade para o plano Pro.',
          403,
        );
      }
      throw err;
    }
  },

  async delete(teamId: string, ownerId: string): Promise<void> {
    const team = await this.getOwnedTeam(teamId, ownerId);

    // Helper: query by index and delete all matching items
    const deleteByIndex = async (
      table: string,
      indexName: string,
      keyCondition: string,
      exprValues: Record<string, unknown>,
      primaryKeyField: string,
    ) => {
      let lastKey: Record<string, unknown> | undefined;
      do {
        const result = await docClient.send(
          new QueryCommand({
            TableName: table,
            IndexName: indexName,
            KeyConditionExpression: keyCondition,
            ExpressionAttributeValues: exprValues,
            ExclusiveStartKey: lastKey,
          }),
        );
        for (const item of result.Items ?? []) {
          await docClient.send(
            new DeleteCommand({
              TableName: table,
              Key: { [primaryKeyField]: item[primaryKeyField] as string },
            }),
          );
        }
        lastKey = result.LastEvaluatedKey;
      } while (lastKey);
    };

    // Players: GSI teamId-index, PK playerId
    await deleteByIndex(
      TABLES.PLAYERS, 'teamId-index', 'teamId = :tid', { ':tid': teamId }, 'playerId',
    );

    // Games: GSI teamId-date-index, PK gameId
    await deleteByIndex(
      TABLES.GAMES, 'teamId-date-index', 'teamId = :tid', { ':tid': teamId }, 'gameId',
    );

    // Media: GSI teamId-createdAt-index, PK mediaId
    await deleteByIndex(
      TABLES.MEDIA, 'teamId-createdAt-index', 'teamId = :tid', { ':tid': teamId }, 'mediaId',
    );

    // Formations: GSI teamId-index, PK formationId
    await deleteByIndex(
      TABLES.FORMATIONS, 'teamId-index', 'teamId = :tid', { ':tid': teamId }, 'formationId',
    );

    // Championships: GSI ownerId-index, PK championshipId — filter by teamId in results
    {
      let lastKey: Record<string, unknown> | undefined;
      do {
        const result = await docClient.send(
          new QueryCommand({
            TableName: TABLES.CHAMPIONSHIPS,
            IndexName: 'ownerId-index',
            KeyConditionExpression: 'ownerId = :oid',
            FilterExpression: 'teamId = :tid',
            ExpressionAttributeValues: { ':oid': ownerId, ':tid': teamId },
            ExclusiveStartKey: lastKey,
          }),
        );
        for (const item of result.Items ?? []) {
          await docClient.send(
            new DeleteCommand({
              TableName: TABLES.CHAMPIONSHIPS,
              Key: { championshipId: item.championshipId as string },
            }),
          );
        }
        lastKey = result.LastEvaluatedKey;
      } while (lastKey);
    }

    // Memberships: PK teamId + SK userId
    {
      let lastKey: Record<string, unknown> | undefined;
      do {
        const result = await docClient.send(
          new QueryCommand({
            TableName: TABLES.TEAM_MEMBERSHIPS,
            KeyConditionExpression: 'teamId = :tid',
            ExpressionAttributeValues: { ':tid': teamId },
            ExclusiveStartKey: lastKey,
          }),
        );
        for (const item of result.Items ?? []) {
          await docClient.send(
            new DeleteCommand({
              TableName: TABLES.TEAM_MEMBERSHIPS,
              Key: { teamId, userId: item.userId as string },
            }),
          );
        }
        lastKey = result.LastEvaluatedKey;
      } while (lastKey);
    }

    // Role requests: PK teamId + SK requestId
    if (TABLES.TEAM_ROLE_REQUESTS) {
      let lastKey: Record<string, unknown> | undefined;
      do {
        const result = await docClient.send(
          new QueryCommand({
            TableName: TABLES.TEAM_ROLE_REQUESTS,
            KeyConditionExpression: 'teamId = :tid',
            ExpressionAttributeValues: { ':tid': teamId },
            ExclusiveStartKey: lastKey,
          }),
        );
        for (const item of result.Items ?? []) {
          await docClient.send(
            new DeleteCommand({
              TableName: TABLES.TEAM_ROLE_REQUESTS,
              Key: { teamId, requestId: item.requestId as string },
            }),
          );
        }
        lastKey = result.LastEvaluatedKey;
      } while (lastKey);
    }

    // Finally delete the team itself
    await docClient.send(
      new DeleteCommand({
        TableName: TABLES.TEAMS,
        Key: { teamId: team.teamId },
      }),
    );
  },

  async decrementPhotoCount(teamId: string): Promise<void> {
    try {
      await docClient.send(
        new UpdateCommand({
          TableName: TABLES.TEAMS,
          Key: { teamId },
          UpdateExpression: 'SET photoCount = photoCount - :one, updatedAt = :now',
          ConditionExpression: 'attribute_exists(teamId) AND photoCount > :zero',
          ExpressionAttributeValues: {
            ':one': 1,
            ':zero': 0,
            ':now': new Date().toISOString(),
          },
        }),
      );
    } catch (err) {
      if (err instanceof ConditionalCheckFailedException) {
        return;
      }
      throw err;
    }
  },
};
