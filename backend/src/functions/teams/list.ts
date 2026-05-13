import type {
  APIGatewayProxyEventV2WithJWTAuthorizer,
  APIGatewayProxyResultV2,
} from 'aws-lambda';
import { getUserId } from '../../utils/auth';
import { success, handleError } from '../../utils/response';
import { enrichTeamWithLogoUrl, teamService } from '../../services/teamService';

export const handler = async (
  event: APIGatewayProxyEventV2WithJWTAuthorizer,
): Promise<APIGatewayProxyResultV2> => {
  try {
    const ownerId = getUserId(event);
    const teams = await teamService.listByOwner(ownerId);
    const enriched = await Promise.all(teams.map(enrichTeamWithLogoUrl));
    return success(enriched);
  } catch (err) {
    return handleError(err);
  }
};
