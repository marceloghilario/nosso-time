import type {
  APIGatewayProxyEventV2WithJWTAuthorizer,
  APIGatewayProxyResultV2,
} from 'aws-lambda';
import { getUserId } from '../../utils/auth';
import { HttpError, success, handleError } from '../../utils/response';
import { parseBody, CreateAdminRequestSchema } from '../../utils/validators';
import { roleRequestService } from '../../services/roleRequestService';

/**
 * POST /teams/:teamId/admin-requests
 *
 * Authenticated. Creates a PENDING admin request for the caller. Also
 * auto-follows the team if there is no membership yet. Returns 409 if the
 * caller already has a PENDING request for the same team.
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
    const input = event.body
      ? parseBody(CreateAdminRequestSchema, event.body)
      : { note: undefined };
    const request = await roleRequestService.createAdminRequest(
      teamId,
      userId,
      input.note,
    );
    return success(request, 201);
  } catch (err) {
    return handleError(err);
  }
};
