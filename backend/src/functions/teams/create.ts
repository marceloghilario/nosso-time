import type {
  APIGatewayProxyEventV2WithJWTAuthorizer,
  APIGatewayProxyResultV2,
} from 'aws-lambda';
import { getUserId } from '../../utils/auth';
import { CreateTeamSchema, parseBody } from '../../utils/validators';
import { success, handleError } from '../../utils/response';
import { teamService } from '../../services/teamService';

export const handler = async (
  event: APIGatewayProxyEventV2WithJWTAuthorizer,
): Promise<APIGatewayProxyResultV2> => {
  try {
    const ownerId = getUserId(event);
    const input = parseBody(CreateTeamSchema, event.body);
    const team = await teamService.create(ownerId, input);
    return success(team, 201);
  } catch (err) {
    return handleError(err);
  }
};
