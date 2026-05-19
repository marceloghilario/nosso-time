import type {
  APIGatewayProxyEventV2WithJWTAuthorizer,
  APIGatewayProxyResultV2,
} from 'aws-lambda';
import { getUserId } from '../../utils/auth';
import {
  UpdateChampionshipGameSchema,
  parseBody,
} from '../../utils/validators';
import { HttpError, success, handleError } from '../../utils/response';
import { championshipService } from '../../services/championshipService';

export const handler = async (
  event: APIGatewayProxyEventV2WithJWTAuthorizer,
): Promise<APIGatewayProxyResultV2> => {
  try {
    const ownerId = getUserId(event);
    const championshipId = event.pathParameters?.championshipId;
    const gameId = event.pathParameters?.gameId;
    if (!championshipId || !gameId) {
      throw new HttpError('Jogo não encontrado', 404);
    }
    const input = parseBody(UpdateChampionshipGameSchema, event.body);
    const winnerByPenalties =
      input.winnerByPenalties === null
        ? null
        : input.winnerByPenalties ?? undefined;
    const championship = await championshipService.updateGame(
      championshipId,
      gameId,
      ownerId,
      {
        date: input.date,
        time: input.time,
        location: input.location,
        homeScore: input.homeScore,
        awayScore: input.awayScore,
        winnerByPenalties,
        goals: input.goals,
        clear: input.clear,
      },
    );
    return success(championship);
  } catch (err) {
    return handleError(err);
  }
};
