import type {
  APIGatewayProxyEventV2WithJWTAuthorizer,
  APIGatewayProxyResultV2,
} from 'aws-lambda';
import { getUserId } from '../../utils/auth';
import { CreatePlayerSchema, parseBody } from '../../utils/validators';
import { HttpError, success, handleError } from '../../utils/response';
import { teamService } from '../../services/teamService';
import { playerService } from '../../services/playerService';

export const handler = async (
  event: APIGatewayProxyEventV2WithJWTAuthorizer,
): Promise<APIGatewayProxyResultV2> => {
  try {
    const ownerId = getUserId(event);
    const teamId = event.pathParameters?.teamId;
    if (!teamId) {
      throw new HttpError('Recurso não encontrado', 404);
    }
    await teamService.getManagedTeam(teamId, ownerId);
    const input = parseBody(CreatePlayerSchema, event.body);
    const player = await playerService.create(teamId, input);
    return success(player, 201);
  } catch (err) {
    return handleError(err);
  }
};
