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
    const formationId = event.pathParameters?.formationId;
    if (!teamId || !formationId) {
      throw new HttpError('Recurso não encontrado', 404);
    }
    const team = await teamService.getOwnedTeam(teamId, ownerId);
    await formationService.delete(team, formationId);
    return success({ message: 'Formação excluída' });
  } catch (err) {
    return handleError(err);
  }
};
