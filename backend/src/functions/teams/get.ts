import type {
  APIGatewayProxyEventV2WithJWTAuthorizer,
  APIGatewayProxyResultV2,
} from 'aws-lambda';
import { getUserId } from '../../utils/auth';
import { HttpError, success, handleError } from '../../utils/response';
import { enrichTeamWithLogoUrl, teamService } from '../../services/teamService';
import { playerService } from '../../services/playerService';
import { gameService } from '../../services/gameService';
import { championshipService } from '../../services/championshipService';

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
    const enriched = await enrichTeamWithLogoUrl(team);
    const [players, games, championshipCount] = await Promise.all([
      playerService.listByTeam(teamId),
      gameService.listByTeam(teamId),
      championshipService.countByTeamParticipation(teamId),
    ]);
    return success({
      ...enriched,
      playerCount: players.length,
      gameCount: games.length,
      championshipCount,
    });
  } catch (err) {
    return handleError(err);
  }
};
