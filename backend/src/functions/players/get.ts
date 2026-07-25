import type {
  APIGatewayProxyEventV2WithJWTAuthorizer,
  APIGatewayProxyResultV2,
} from 'aws-lambda';
import { getUserId } from '../../utils/auth';
import { HttpError, success, handleError } from '../../utils/response';
import { teamService } from '../../services/teamService';
import { playerService } from '../../services/playerService';

export const handler = async (
  event: APIGatewayProxyEventV2WithJWTAuthorizer,
): Promise<APIGatewayProxyResultV2> => {
  try {
    const userId = getUserId(event);
    const teamId = event.pathParameters?.teamId;
    const playerId = event.pathParameters?.playerId;
    if (!teamId || !playerId) {
      throw new HttpError('Recurso não encontrado', 404);
    }
    await teamService.getManagedTeam(teamId, userId);
    const player = await playerService.getPlayerOfTeam(teamId, playerId);
    return success(player);
  } catch (err) {
    return handleError(err);
  }
};
