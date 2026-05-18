import type {
  APIGatewayProxyEventV2WithJWTAuthorizer,
  APIGatewayProxyResultV2,
} from 'aws-lambda';
import { getUserId } from '../../utils/auth';
import {
  CreateChampionshipSchema,
  parseBody,
} from '../../utils/validators';
import { success, handleError } from '../../utils/response';
import { championshipService } from '../../services/championshipService';

export const handler = async (
  event: APIGatewayProxyEventV2WithJWTAuthorizer,
): Promise<APIGatewayProxyResultV2> => {
  try {
    const ownerId = getUserId(event);
    const input = parseBody(CreateChampionshipSchema, event.body);
    const championship = await championshipService.create(ownerId, input);
    return success(championship, 201);
  } catch (err) {
    return handleError(err);
  }
};
