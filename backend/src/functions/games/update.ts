import type {
  APIGatewayProxyEventV2WithJWTAuthorizer,
  APIGatewayProxyResultV2,
} from 'aws-lambda';
import { getUserId } from '../../utils/auth';
import { UpdateGameSchema, parseBody } from '../../utils/validators';
import { HttpError, success, handleError } from '../../utils/response';
import { teamService } from '../../services/teamService';
import { gameService } from '../../services/gameService';

export const handler = async (
  event: APIGatewayProxyEventV2WithJWTAuthorizer,
): Promise<APIGatewayProxyResultV2> => {
  try {
    const ownerId = getUserId(event);
    const teamId = event.pathParameters?.teamId;
    const gameId = event.pathParameters?.gameId;
    if (!teamId || !gameId) {
      throw new HttpError('Recurso não encontrado', 404);
    }
    await teamService.getOwnedTeam(teamId, ownerId);
    const input = parseBody(UpdateGameSchema, event.body);
    const game = await gameService.update(teamId, gameId, input);
    return success(game);
  } catch (err) {
    return handleError(err);
  }
};
