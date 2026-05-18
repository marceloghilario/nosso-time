import type {
  APIGatewayProxyEventV2WithJWTAuthorizer,
  APIGatewayProxyResultV2,
} from 'aws-lambda';
import { getUserId } from '../../utils/auth';
import {
  UpdateChampionshipSchema,
  parseBody,
} from '../../utils/validators';
import { HttpError, success, handleError } from '../../utils/response';
import { championshipService } from '../../services/championshipService';

export const handler = async (
  event: APIGatewayProxyEventV2WithJWTAuthorizer,
): Promise<APIGatewayProxyResultV2> => {
  try {
    const ownerId = getUserId(event);
    const championshipId = event.pathParameters?.championshipId;
    if (!championshipId) {
      throw new HttpError('Campeonato não encontrado', 404);
    }
    const input = parseBody(UpdateChampionshipSchema, event.body);
    const championship = await championshipService.update(
      championshipId,
      ownerId,
      input,
    );
    return success(championship);
  } catch (err) {
    return handleError(err);
  }
};
