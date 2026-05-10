import { PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuid } from 'uuid';
import { docClient, TABLES } from '../utils/dynamo';
import { HttpError } from '../utils/response';
import { PLAN_LIMITS } from '../models';
import type { Media, MediaType, Team } from '../models';
import { teamService } from './teamService';

const region = process.env.AWS_REGION ?? 'us-east-1';
const s3Client = new S3Client({ region });

const BUCKET = process.env.PHOTOS_BUCKET ?? '';
const UPLOAD_URL_EXPIRY_SECONDS = 5 * 60;
const VIEW_URL_EXPIRY_SECONDS = 60 * 60;

export interface MediaWithUrl extends Media {
  url: string;
}

const buildViewUrl = async (s3Key: string): Promise<string> => {
  const command = new GetObjectCommand({ Bucket: BUCKET, Key: s3Key });
  return getSignedUrl(s3Client, command, { expiresIn: VIEW_URL_EXPIRY_SECONDS });
};

const enrichWithUrls = async (items: Media[]): Promise<MediaWithUrl[]> =>
  Promise.all(items.map(async (item) => ({ ...item, url: await buildViewUrl(item.s3Key) })));

export interface UploadUrlInput {
  contentType: string;
  fileName: string;
  type: MediaType;
}

export interface CreateMediaInput {
  s3Key: string;
  contentType: string;
  type: MediaType;
  gameId?: string;
  caption?: string;
}

const sanitizeFileName = (name: string): string =>
  name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 100);

const ensurePhotoQuota = (team: Team): void => {
  const limit = PLAN_LIMITS[team.plan];
  if (team.photoCount >= limit) {
    throw new HttpError(
      'Limite de fotos atingido. Faça upgrade para o plano Pro.',
      403,
    );
  }
};

const teamS3Prefix = (teamId: string): string => `teams/${teamId}/`;

const ensureKeyBelongsToTeam = (s3Key: string, teamId: string): void => {
  if (!s3Key.startsWith(teamS3Prefix(teamId))) {
    throw new HttpError('Chave S3 inválida para este time', 400);
  }
};

export const mediaService = {
  async getUploadUrl(
    team: Team,
    input: UploadUrlInput,
  ): Promise<{ uploadUrl: string; s3Key: string }> {
    ensurePhotoQuota(team);
    const safeName = sanitizeFileName(input.fileName);
    const s3Key = `${teamS3Prefix(team.teamId)}${uuid()}-${safeName}`;
    const command = new PutObjectCommand({
      Bucket: BUCKET,
      Key: s3Key,
      ContentType: input.contentType,
    });
    const uploadUrl = await getSignedUrl(s3Client, command, {
      expiresIn: UPLOAD_URL_EXPIRY_SECONDS,
    });
    return { uploadUrl, s3Key };
  },

  async create(
    team: Team,
    ownerId: string,
    input: CreateMediaInput,
  ): Promise<Media> {
    ensureKeyBelongsToTeam(input.s3Key, team.teamId);
    await teamService.reserveAndIncrementPhoto(team);
    const now = new Date().toISOString();
    const media: Media = {
      mediaId: uuid(),
      teamId: team.teamId,
      gameId: input.gameId,
      ownerId,
      type: input.type,
      s3Key: input.s3Key,
      contentType: input.contentType,
      caption: input.caption,
      createdAt: now,
    };
    try {
      await docClient.send(
        new PutCommand({
          TableName: TABLES.MEDIA,
          Item: media,
          ConditionExpression: 'attribute_not_exists(mediaId)',
        }),
      );
    } catch (err) {
      await teamService.decrementPhotoCount(team.teamId);
      throw err;
    }
    return media;
  },

  async listByTeam(teamId: string): Promise<MediaWithUrl[]> {
    const result = await docClient.send(
      new QueryCommand({
        TableName: TABLES.MEDIA,
        IndexName: 'teamId-createdAt-index',
        KeyConditionExpression: 'teamId = :teamId',
        ExpressionAttributeValues: { ':teamId': teamId },
        ScanIndexForward: false,
      }),
    );
    return enrichWithUrls((result.Items ?? []) as Media[]);
  },

  async listByGame(teamId: string, gameId: string): Promise<MediaWithUrl[]> {
    const result = await docClient.send(
      new QueryCommand({
        TableName: TABLES.MEDIA,
        IndexName: 'gameId-createdAt-index',
        KeyConditionExpression: 'gameId = :gameId',
        FilterExpression: 'teamId = :teamId',
        ExpressionAttributeValues: { ':gameId': gameId, ':teamId': teamId },
        ScanIndexForward: false,
      }),
    );
    return enrichWithUrls((result.Items ?? []) as Media[]);
  },
};
