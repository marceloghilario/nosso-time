import type {
  APIGatewayProxyEventV2WithJWTAuthorizer,
  APIGatewayProxyResultV2,
} from 'aws-lambda';
import { getUserId } from '../../utils/auth';
import { HttpError, success, handleError } from '../../utils/response';
import { membershipService } from '../../services/membershipService';
import { roleRequestService } from '../../services/roleRequestService';

/**
 * GET /teams/:teamId/admin-requests
 *
 * OWNER-only. Returns every admin request ever filed for the team (PENDING,
 * APPROVED, REJECTED), so the owner sees the full history.
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
    await membershipService.requireRole(teamId, userId, ['OWNER']);
    const items = await roleRequestService.listForTeam(teamId);
    items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return success(items);
  } catch (err) {
    return handleError(err);
  }
};
