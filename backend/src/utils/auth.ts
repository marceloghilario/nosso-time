import type { APIGatewayProxyEventV2WithJWTAuthorizer } from 'aws-lambda';
import { HttpError } from './response';

export const getUserId = (event: APIGatewayProxyEventV2WithJWTAuthorizer): string => {
  const claims = event.requestContext.authorizer?.jwt?.claims;
  const sub = claims?.sub;
  if (typeof sub !== 'string' || sub.length === 0) {
    throw new HttpError('Token inválido ou expirado', 401);
  }
  return sub;
};
