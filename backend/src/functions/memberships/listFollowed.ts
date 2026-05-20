import type {
  APIGatewayProxyEventV2WithJWTAuthorizer,
  APIGatewayProxyResultV2,
} from 'aws-lambda';
import { getUserId } from '../../utils/auth';
import { success, handleError } from '../../utils/response';
import { membershipService } from '../../services/membershipService';
import { enrichTeamWithLogoUrl, teamService } from '../../services/teamService';

/**
 * GET /me/followed-teams
 *
 * Returns only FOLLOWER memberships (teams the caller follows but does not
 * manage). Useful to render the "Seguindo" section in the My Teams page.
 */
export const handler = async (
  event: APIGatewayProxyEventV2WithJWTAuthorizer,
): Promise<APIGatewayProxyResultV2> => {
  try {
    const userId = getUserId(event);
    const memberships = await membershipService.listTeamsOfUser(userId);
    const followerTeamIds = memberships
      .filter((m) => m.role === 'FOLLOWER')
      .map((m) => m.teamId);
    const teams = await teamService.getTeamsByIds(followerTeamIds);
    const enriched = await Promise.all(teams.map(enrichTeamWithLogoUrl));
    const items = enriched.map((t) => ({
      teamId: t.teamId,
      name: t.name,
      description: t.description,
      logoUrl: t.logoUrl,
      photoCount: t.photoCount,
      myRole: 'FOLLOWER' as const,
    }));
    items.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
    return success(items);
  } catch (err) {
    return handleError(err);
  }
};
