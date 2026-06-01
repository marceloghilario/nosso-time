import type {
  APIGatewayProxyEventV2WithJWTAuthorizer,
  APIGatewayProxyResultV2,
} from 'aws-lambda';
import { getUserId } from '../../utils/auth';
import { HttpError, success, handleError } from '../../utils/response';
import { teamService } from '../../services/teamService';
import { formationService } from '../../services/formationService';

export const handler = async (
  event: APIGatewayProxyEventV2WithJWTAuthorizer,
): Promise<APIGatewayProxyResultV2> => {
  try {
    const ownerId = getUserId(event);
    const teamId = event.pathParameters?.teamId;
    if (!teamId) {
      throw new HttpError('Recurso não encontrado', 404);
    }
    await teamService.getManagedTeam(teamId, ownerId);
    const formation = await formationService.getActive(teamId);
    if (!formation) {
      throw new HttpError('Nenhuma formação ativa', 404);
    }
    return success(formation);
  } catch (err) {
    return handleError(err);
  }
};
