import type {
  APIGatewayProxyEventV2WithJWTAuthorizer,
  APIGatewayProxyResultV2,
} from 'aws-lambda';
import { getUserId } from '../../utils/auth';
import { LogoUploadUrlSchema, parseBody } from '../../utils/validators';
import { HttpError, success, handleError } from '../../utils/response';
import { teamService } from '../../services/teamService';

export const handler = async (
  event: APIGatewayProxyEventV2WithJWTAuthorizer,
): Promise<APIGatewayProxyResultV2> => {
  try {
    const ownerId = getUserId(event);
    const teamId = event.pathParameters?.teamId;
    if (!teamId) {
      throw new HttpError('Recurso não encontrado', 404);
    }
    const team = await teamService.getOwnedTeam(teamId, ownerId);
    const input = parseBody(LogoUploadUrlSchema, event.body);
    const result = await teamService.getLogoUploadUrl(team, input);
    return success(result);
  } catch (err) {
    return handleError(err);
  }
};
