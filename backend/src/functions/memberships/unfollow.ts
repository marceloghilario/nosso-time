import type {
  APIGatewayProxyEventV2WithJWTAuthorizer,
  APIGatewayProxyResultV2,
} from 'aws-lambda';
import { getUserId } from '../../utils/auth';
import { HttpError, success, handleError } from '../../utils/response';
import { membershipService } from '../../services/membershipService';

/**
 * DELETE /teams/:teamId/follow
 *
 * Idempotent: only removes FOLLOWER memberships. OWNER/ADMIN are preserved.
 */
export const handler = async (
  event: APIGatewayProxyEventV2WithJWTAuthorizer,
): Promise<APIGatewayProxyResultV2> => {
  try {
    const userId = getUserId(event);
    const teamId = event.pathParameters?.teamId;
    if (!teamId) {
      throw new HttpError('Recurso não encontrado', 404);
    }
    await membershipService.unfollow(teamId, userId);
    return success({ teamId });
  } catch (err) {
    return handleError(err);
  }
};
