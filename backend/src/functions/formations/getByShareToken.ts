import type {
  APIGatewayProxyEventV2,
  APIGatewayProxyResultV2,
} from 'aws-lambda';
import { HttpError, success, handleError } from '../../utils/response';
import { formationService } from '../../services/formationService';

export const handler = async (
  event: APIGatewayProxyEventV2,
): Promise<APIGatewayProxyResultV2> => {
  try {
    const shareToken = event.pathParameters?.shareToken;
    if (!shareToken) {
      throw new HttpError('Recurso não encontrado', 404);
    }
    const view = await formationService.getByShareToken(shareToken);
    if (!view) {
      throw new HttpError('Recurso não encontrado', 404);
    }
    return success(view);
  } catch (err) {
    return handleError(err);
  }
};
