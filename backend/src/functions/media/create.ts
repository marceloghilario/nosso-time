import type {
  APIGatewayProxyEventV2WithJWTAuthorizer,
  APIGatewayProxyResultV2,
} from 'aws-lambda';
import { getUserId } from '../../utils/auth';
import { CreateMediaSchema, parseBody } from '../../utils/validators';
import { HttpError, success, handleError } from '../../utils/response';
import { teamService } from '../../services/teamService';
import { mediaService } from '../../services/mediaService';

export const handler = async (
  event: APIGatewayProxyEventV2WithJWTAuthorizer,
): Promise<APIGatewayProxyResultV2> => {
  try {
    const ownerId = getUserId(event);
    const teamId = event.pathParameters?.teamId;
    if (!teamId) {
      throw new HttpError('Recurso não encontrado', 404);
    }
    const { team } = await teamService.getManagedTeam(teamId, ownerId);
    const input = parseBody(CreateMediaSchema, event.body);
    const media = await mediaService.create(team, ownerId, input);
    return success(media, 201);
  } catch (err) {
    return handleError(err);
  }
};
