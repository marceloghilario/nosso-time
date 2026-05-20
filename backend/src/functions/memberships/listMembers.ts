import type {
  APIGatewayProxyEventV2WithJWTAuthorizer,
  APIGatewayProxyResultV2,
} from 'aws-lambda';
import { getUserId } from '../../utils/auth';
import { HttpError, success, handleError } from '../../utils/response';
import { membershipService } from '../../services/membershipService';

/**
 * GET /teams/:teamId/members
 *
 * OWNER-only. Returns every membership row (owner + admins + followers) so
 * the owner UI can list and manage them.
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
    const members = await membershipService.listMembersOfTeam(teamId);
    members.sort((a, b) => a.role.localeCompare(b.role));
    return success(members);
  } catch (err) {
    return handleError(err);
  }
};
