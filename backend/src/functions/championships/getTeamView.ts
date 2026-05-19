import type {
  APIGatewayProxyEventV2WithJWTAuthorizer,
  APIGatewayProxyResultV2,
} from 'aws-lambda';
import { getUserId } from '../../utils/auth';
import { HttpError, success, handleError } from '../../utils/response';
import { championshipService } from '../../services/championshipService';

/**
 * GET /championships/:championshipId/games/:gameId/team-view/:teamId
 *
 * Read-only view of team-side data (confirmed players, guests, lineup) of a
 * linked Game record. Restricted to the championship creator.
 */
export const handler = async (
  event: APIGatewayProxyEventV2WithJWTAuthorizer,
): Promise<APIGatewayProxyResultV2> => {
  try {
    const ownerId = getUserId(event);
    const championshipId = event.pathParameters?.championshipId;
    const gameId = event.pathParameters?.gameId;
    const teamId = event.pathParameters?.teamId;
    if (!championshipId || !gameId || !teamId) {
      throw new HttpError('Recurso não encontrado', 404);
    }
    const view = await championshipService.getTeamView(
      championshipId,
      gameId,
      teamId,
      ownerId,
    );
    return success(view);
  } catch (err) {
    return handleError(err);
  }
};
