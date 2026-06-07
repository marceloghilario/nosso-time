import type {
  APIGatewayProxyEventV2WithJWTAuthorizer,
  APIGatewayProxyResultV2,
} from 'aws-lambda';
import { getUserId } from '../../utils/auth';
import { HttpError, success, handleError } from '../../utils/response';
import { enrichTeamWithLogoUrl, teamService } from '../../services/teamService';
import { playerService } from '../../services/playerService';
import { gameService } from '../../services/gameService';
import { mediaService } from '../../services/mediaService';
import { championshipService } from '../../services/championshipService';
import { membershipService } from '../../services/membershipService';
import { roleRequestService } from '../../services/roleRequestService';
import { formationService } from '../../services/formationService';

export const handler = async (
  event: APIGatewayProxyEventV2WithJWTAuthorizer,
): Promise<APIGatewayProxyResultV2> => {
  try {
    const userId = getUserId(event);
    const teamId = event.pathParameters?.teamId;
    if (!teamId) {
      throw new HttpError('Recurso não encontrado', 404);
    }
    const team = await teamService.getPublicById(teamId);
    const enriched = await enrichTeamWithLogoUrl(team);
    const [players, games, media, championshipCount, myRole, pendingRequest, primaryFormation] =
      await Promise.all([
        playerService.listByTeam(teamId),
        gameService.listByTeam(teamId),
        mediaService.listByTeam(teamId),
        championshipService.countByTeamParticipation(teamId),
        membershipService.getOrBackfillRole(teamId, userId),
        roleRequestService.findPending(teamId, userId),
        formationService.getPrimary(teamId),
      ]);

    return success({
      team: {
        teamId: enriched.teamId,
        name: enriched.name,
        description: enriched.description,
        modality: enriched.modality,
        photoCount: enriched.photoCount,
        logoUrl: enriched.logoUrl,
        createdAt: enriched.createdAt,
        playerCount: players.length,
        gameCount: games.length,
        championshipCount,
      },
      myRole,
      pendingAdminRequest: pendingRequest
        ? {
            requestId: pendingRequest.requestId,
            createdAt: pendingRequest.createdAt,
            note: pendingRequest.note,
          }
        : null,
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
      primaryFormation: primaryFormation
        ? {
            formationId: primaryFormation.formationId,
            name: primaryFormation.name,
            scheme: primaryFormation.scheme,
            playerPositions: primaryFormation.playerPositions,
          }
        : null,
    });
  } catch (err) {
    return handleError(err);
  }
};
