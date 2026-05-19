import type {
  APIGatewayProxyEventV2WithJWTAuthorizer,
  APIGatewayProxyResultV2,
} from 'aws-lambda';
import { z } from 'zod';
import { getUserId } from '../../utils/auth';
import { parseBody } from '../../utils/validators';
import { HttpError, success, handleError } from '../../utils/response';
import { championshipService } from '../../services/championshipService';

const LinkGameSchema = z.object({
  teamId: z.string().min(1),
});

export const handler = async (
  event: APIGatewayProxyEventV2WithJWTAuthorizer,
): Promise<APIGatewayProxyResultV2> => {
  try {
    const requesterId = getUserId(event);
    const championshipId = event.pathParameters?.championshipId;
    const gameId = event.pathParameters?.gameId;
    if (!championshipId || !gameId) {
      throw new HttpError('Jogo não encontrado', 404);
    }
    const input = parseBody(LinkGameSchema, event.body);
    const link = await championshipService.linkGame(
      championshipId,
      gameId,
      requesterId,
      { teamId: input.teamId },
    );
    return success(link);
  } catch (err) {
    return handleError(err);
  }
};
