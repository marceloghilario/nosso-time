import type {
  APIGatewayProxyEventV2WithJWTAuthorizer,
  APIGatewayProxyResultV2,
} from 'aws-lambda';
import { success, handleError } from '../../utils/response';
import { formationService } from '../../services/formationService';

export const handler = async (
  event: APIGatewayProxyEventV2WithJWTAuthorizer,
): Promise<APIGatewayProxyResultV2> => {
  try {
    const teamId = event.pathParameters?.teamId;
    if (!teamId) {
      return { statusCode: 404, body: '{"success":false,"error":"Recurso não encontrado"}' };
    }
    const formation = await formationService.getPrimary(teamId);
    return success(formation);
  } catch (err) {
    return handleError(err);
  }
};
