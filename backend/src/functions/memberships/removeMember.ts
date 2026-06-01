import type {
  APIGatewayProxyEventV2WithJWTAuthorizer,
  APIGatewayProxyResultV2,
} from 'aws-lambda';
import { getUserId } from '../../utils/auth';
import { HttpError, success, handleError } from '../../utils/response';
import { membershipService } from '../../services/membershipService';

/**
 * DELETE /teams/:teamId/members/:userId
 *
 * OWNER-only. Demotes an existing ADMIN back to FOLLOWER. The OWNER row
 * cannot be removed by this endpoint (ownership transfer is a separate flow).
 */
export const handler = async (
  event: APIGatewayProxyEventV2WithJWTAuthorizer,
): Promise<APIGatewayProxyResultV2> => {
  try {
    const callerId = getUserId(event);
    const teamId = event.pathParameters?.teamId;
    const targetUserId = event.pathParameters?.userId;
    if (!teamId || !targetUserId) {
      throw new HttpError('Recurso não encontrado', 404);
    }
    await membershipService.requireRole(teamId, callerId, ['OWNER']);
    if (callerId === targetUserId) {
      throw new HttpError('Você não pode rebaixar a si mesmo', 400);
    }
    await membershipService.demoteAdmin(teamId, targetUserId);
    return success({ teamId, userId: targetUserId, role: 'FOLLOWER' });
  } catch (err) {
    return handleError(err);
  }
};
