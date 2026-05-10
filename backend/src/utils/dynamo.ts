import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

const region = process.env.AWS_REGION ?? 'us-east-1';

const baseClient = new DynamoDBClient({ region });

export const docClient = DynamoDBDocumentClient.from(baseClient, {
  marshallOptions: {
    removeUndefinedValues: true,
    convertEmptyValues: false,
    convertClassInstanceToMap: false,
  },
});

export const TABLES = {
  TEAMS: process.env.TEAMS_TABLE ?? '',
  PLAYERS: process.env.PLAYERS_TABLE ?? '',
  GAMES: process.env.GAMES_TABLE ?? '',
  MEDIA: process.env.MEDIA_TABLE ?? '',
} as const;
