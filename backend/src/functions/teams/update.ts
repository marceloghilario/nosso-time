import type {
  APIGatewayProxyEventV2WithJWTAuthorizer,
  APIGatewayProxyResultV2,
} from 'aws-lambda';
import { getUserId } from '../../utils/auth';
import { UpdateTeamSchema, parseBody } from '../../utils/validators';
import { HttpError, success, handleError } from '../../utils/response';
import { enrichTeamWithLogoUrl, teamService } from '../../services/teamService';

export const handler = async (
  event: APIGatewayProxyEventV2WithJWTAuthorizer,
): Promise<APIGatewayProxyResultV2> => {
  try {
    const ownerId = getUserId(event);
    const teamId = event.pathParameters?.teamId;
    if (!teamId) {
      throw new HttpError('Recurso não encontrado', 404);
    }
    const input = parseBody(UpdateTeamSchema, event.body);
    const updated = await teamService.update(teamId, ownerId, input);
    const enriched = await enrichTeamWithLogoUrl(updated);
    return success(enriched);
  } catch (err) {
    return handleError(err);
  }
};
