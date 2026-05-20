import type {
  APIGatewayProxyEventV2WithJWTAuthorizer,
  APIGatewayProxyResultV2,
} from 'aws-lambda';
import { HttpError, success, handleError } from '../../utils/response';
import { enrichTeamWithLogoUrl, teamService } from '../../services/teamService';
import { playerService } from '../../services/playerService';
import { gameService } from '../../services/gameService';
import { mediaService } from '../../services/mediaService';
import { championshipService } from '../../services/championshipService';

export const handler = async (
  event: APIGatewayProxyEventV2WithJWTAuthorizer,
): Promise<APIGatewayProxyResultV2> => {
  try {
    const teamId = event.pathParameters?.teamId;
    if (!teamId) {
      throw new HttpError('Recurso não encontrado', 404);
    }
    const team = await teamService.getPublicById(teamId);
    const enriched = await enrichTeamWithLogoUrl(team);
    const [players, games, media, championshipCount] = await Promise.all([
      playerService.listByTeam(teamId),
      gameService.listByTeam(teamId),
      mediaService.listByTeam(teamId),
      championshipService.countByTeamParticipation(teamId),
    ]);

    return success({
      team: {
        teamId: enriched.teamId,
        name: enriched.name,
        description: enriched.description,
        photoCount: enriched.photoCount,
        logoUrl: enriched.logoUrl,
        createdAt: enriched.createdAt,
        playerCount: players.length,
        gameCount: games.length,
        championshipCount,
      },
      players: players.map((p) => ({
        playerId: p.playerId,
        name: p.name,
        position: p.position,
        number: p.number,
        characteristics: p.characteristics,
      })),
      games: games.map((g) => ({
        gameId: g.gameId,
        date: g.date,
        time: g.time,
        location: g.location,
        opponent: g.opponent,
        status: g.status,
        result: g.result,
      })),
      media: media.map((m) => ({
        mediaId: m.mediaId,
        gameId: m.gameId,
        type: m.type,
        s3Key: m.s3Key,
        caption: m.caption,
        createdAt: m.createdAt,
        url: m.url,
      })),
    });
  } catch (err) {
    return handleError(err);
  }
};
