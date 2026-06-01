import type {
  APIGatewayProxyEventV2WithJWTAuthorizer,
  APIGatewayProxyResultV2,
} from 'aws-lambda';
import { getUserId } from '../../utils/auth';
import { HttpError, success, handleError } from '../../utils/response';
import { teamService } from '../../services/teamService';
import { membershipService } from '../../services/membershipService';

/**
 * POST /teams/:teamId/follow
 *
 * Idempotent: creates a FOLLOWER membership if the caller has no relation
 * with the team. OWNER and ADMIN memberships are preserved (their role
 * implicitly includes following).
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
    const team = await teamService.getById(teamId);
    if (!team) {
      throw new HttpError('Recurso não encontrado', 404);
    }
    const role = await membershipService.follow(teamId, userId);
    return success({ teamId, role });
  } catch (err) {
    return handleError(err);
  }
};
