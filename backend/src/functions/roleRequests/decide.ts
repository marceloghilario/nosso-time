import type {
  APIGatewayProxyEventV2WithJWTAuthorizer,
  APIGatewayProxyResultV2,
} from 'aws-lambda';
import { getUserId } from '../../utils/auth';
import { HttpError, success, handleError } from '../../utils/response';
import { parseBody, DecideAdminRequestSchema } from '../../utils/validators';
import { membershipService } from '../../services/membershipService';
import { roleRequestService } from '../../services/roleRequestService';

/**
 * PUT /teams/:teamId/admin-requests/:requestId
 *
 * OWNER-only. APPROVE promotes the requester to ADMIN; REJECT leaves them as
 * FOLLOWER. The request transitions to a final state and cannot be re-decided.
 */
export const handler = async (
  event: APIGatewayProxyEventV2WithJWTAuthorizer,
): Promise<APIGatewayProxyResultV2> => {
  try {
    const ownerId = getUserId(event);
    const teamId = event.pathParameters?.teamId;
    const requestId = event.pathParameters?.requestId;
    if (!teamId || !requestId) {
      throw new HttpError('Recurso não encontrado', 404);
    }
    await membershipService.requireRole(teamId, ownerId, ['OWNER']);
    const existing = await roleRequestService.getById(requestId);
    if (!existing) {
      throw new HttpError('Solicitação não encontrada', 404);
    }
    if (existing.teamId !== teamId) {
      throw new HttpError('Solicitação não pertence a este time', 400);
    }
    const input = parseBody(DecideAdminRequestSchema, event.body);
    const updated = await roleRequestService.decide(
      requestId,
      ownerId,
      input.action,
      input.note,
    );
    return success(updated);
  } catch (err) {
    return handleError(err);
  }
};
