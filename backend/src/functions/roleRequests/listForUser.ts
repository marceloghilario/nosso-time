import type {
  APIGatewayProxyEventV2WithJWTAuthorizer,
  APIGatewayProxyResultV2,
} from 'aws-lambda';
import { getUserId } from '../../utils/auth';
import { success, handleError } from '../../utils/response';
import { roleRequestService } from '../../services/roleRequestService';

/**
 * GET /me/admin-requests
 *
 * Authenticated. Returns every admin request filed by the caller. Used by
 * the frontend to render badges like "Solicitação pendente".
 */
export const handler = async (
  event: APIGatewayProxyEventV2WithJWTAuthorizer,
): Promise<APIGatewayProxyResultV2> => {
  try {
    const userId = getUserId(event);
    const items = await roleRequestService.listForUser(userId);
    items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return success(items);
  } catch (err) {
    return handleError(err);
  }
};
