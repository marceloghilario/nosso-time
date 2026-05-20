import type {
  APIGatewayProxyEventV2WithJWTAuthorizer,
  APIGatewayProxyResultV2,
} from 'aws-lambda';
import { getUserId } from '../../utils/auth';
import { success, handleError } from '../../utils/response';
import { enrichTeamWithLogoUrl, teamService } from '../../services/teamService';
import { membershipService } from '../../services/membershipService';
import type { TeamRole } from '../../models';

/**
 * Returns the teams the caller "manages" (OWNER + ADMIN memberships).
 * The legacy ownerId-index is queried as well so legacy teams without a
 * membership row still appear; for those we lazily backfill an OWNER row.
 */
export const handler = async (
  event: APIGatewayProxyEventV2WithJWTAuthorizer,
): Promise<APIGatewayProxyResultV2> => {
  try {
    const userId = getUserId(event);
    const [memberships, ownedLegacy] = await Promise.all([
      membershipService.listTeamsOfUser(userId),
      teamService.listByOwner(userId),
    ]);

    const roleByTeam = new Map<string, TeamRole>();
    for (const m of memberships) {
      if (m.role === 'OWNER' || m.role === 'ADMIN') {
        roleByTeam.set(m.teamId, m.role);
      }
    }
    // Backfill OWNER rows for legacy teams not yet in TeamMemberships.
    for (const t of ownedLegacy) {
      if (!roleByTeam.has(t.teamId)) {
        roleByTeam.set(t.teamId, 'OWNER');
        await membershipService.putMembership({
          teamId: t.teamId,
          userId,
          role: 'OWNER',
          createdAt: t.createdAt,
        });
      }
    }

    const teamIds = Array.from(roleByTeam.keys());
    const teams = await teamService.getTeamsByIds(teamIds);
    const enriched = await Promise.all(teams.map(enrichTeamWithLogoUrl));
    const withRole = enriched.map((t) => ({
      ...t,
      myRole: roleByTeam.get(t.teamId) ?? 'OWNER',
    }));
    withRole.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
    return success(withRole);
  } catch (err) {
    return handleError(err);
  }
};
