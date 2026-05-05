import type { APIGatewayProxyResultV2 } from 'aws-lambda';

const baseHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
};

export const success = (
  data: unknown,
  statusCode = 200,
): APIGatewayProxyResultV2 => ({
  statusCode,
  headers: baseHeaders,
  body: JSON.stringify({ success: true, data }),
});

export const error = (
  message: string,
  statusCode = 400,
): APIGatewayProxyResultV2 => ({
  statusCode,
  headers: baseHeaders,
  body: JSON.stringify({ success: false, error: message }),
});

export class HttpError extends Error {
  statusCode: number;
  constructor(message: string, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
    this.name = 'HttpError';
  }
}

export const handleError = (err: unknown): APIGatewayProxyResultV2 => {
  if (err instanceof HttpError) {
    return error(err.message, err.statusCode);
  }
  if (err instanceof Error && err.name === 'ZodError') {
    return error(err.message, 400);
  }
  console.error('Unhandled error:', err);
  return error('Erro interno do servidor', 500);
};
