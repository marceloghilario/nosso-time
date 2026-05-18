import type {
  APIGatewayProxyEventV2WithJWTAuthorizer,
  APIGatewayProxyResultV2,
} from 'aws-lambda';
import { success, handleError } from '../../utils/response';
import { enrichTeamWithLogoUrl, teamService } from '../../services/teamService';

interface PublicTeamSummary {
  teamId: string;
  name: string;
  description?: string;
  photoCount: number;
  logoUrl?: string;
  createdAt: string;
}

const toSummary = (team: {
  teamId: string;
  name: string;
  description?: string;
  photoCount: number;
  logoUrl?: string;
  createdAt: string;
}): PublicTeamSummary => ({
  teamId: team.teamId,
  name: team.name,
  description: team.description,
  photoCount: team.photoCount,
  logoUrl: team.logoUrl,
  createdAt: team.createdAt,
});

export const handler = async (
  event: APIGatewayProxyEventV2WithJWTAuthorizer,
): Promise<APIGatewayProxyResultV2> => {
  try {
    const query = event.queryStringParameters?.q ?? '';
    const teams = await teamService.searchPublic(query);
    const enriched = await Promise.all(teams.map(enrichTeamWithLogoUrl));
    return success(enriched.map(toSummary));
  } catch (err) {
    return handleError(err);
  }
};
