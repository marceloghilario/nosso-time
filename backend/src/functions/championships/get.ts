import type {
  APIGatewayProxyEventV2WithJWTAuthorizer,
  APIGatewayProxyResultV2,
} from 'aws-lambda';
import { getUserId } from '../../utils/auth';
import { HttpError, success, handleError } from '../../utils/response';
import { championshipService } from '../../services/championshipService';

/**
 * GET /championships/:id — public to any logged-in user. The championship
 * creator (ownerId) keeps editing rights; everyone else gets read-only access.
 * Authorization for mutating endpoints lives in updateGame / linkGame / delete.
 */
export const handler = async (
  event: APIGatewayProxyEventV2WithJWTAuthorizer,
): Promise<APIGatewayProxyResultV2> => {
  try {
    const requesterId = getUserId(event);
    const championshipId = event.pathParameters?.championshipId;
    if (!championshipId) {
      throw new HttpError('Campeonato não encontrado', 404);
    }
    const championship = await championshipService.getById(championshipId);
    return success({
      ...championship,
      viewerIsCreator: championship.ownerId === requesterId,
    });
  } catch (err) {
    return handleError(err);
  }
};
