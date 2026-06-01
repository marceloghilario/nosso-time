import type {
  APIGatewayProxyEventV2,
  APIGatewayProxyResultV2,
} from 'aws-lambda';
import {
  CognitoIdentityProviderClient,
  ForgotPasswordCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import { ForgotPasswordSchema, parseBody } from '../../utils/validators';
import { success, handleError, HttpError } from '../../utils/response';

const region = process.env.AWS_REGION ?? 'us-east-1';
const cognito = new CognitoIdentityProviderClient({ region });
const CLIENT_ID = process.env.COGNITO_CLIENT_ID ?? '';

interface CognitoErrorLike {
  name?: string;
  message?: string;
}

const GENERIC_RESPONSE = {
  message:
    'Se o e-mail estiver cadastrado, enviamos as instruções para redefinir a senha.',
};

export const handler = async (
  event: APIGatewayProxyEventV2,
): Promise<APIGatewayProxyResultV2> => {
  try {
    const input = parseBody(ForgotPasswordSchema, event.body);
    if (!CLIENT_ID) {
      throw new HttpError('Configuração de autenticação ausente', 500);
    }

    try {
      await cognito.send(
        new ForgotPasswordCommand({
          ClientId: CLIENT_ID,
          Username: input.email,
        }),
      );
    } catch (err) {
      const cognitoErr = err as CognitoErrorLike;
      const benign = new Set([
        'UserNotFoundException',
        'InvalidParameterException',
        'LimitExceededException',
        'NotAuthorizedException',
      ]);
      if (cognitoErr?.name && benign.has(cognitoErr.name)) {
        // Don't leak whether the account exists or is rate-limited.
        return success(GENERIC_RESPONSE);
      }
      throw err;
    }

    return success(GENERIC_RESPONSE);
  } catch (err) {
    return handleError(err);
  }
};
