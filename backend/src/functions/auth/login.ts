import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import {
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import { LoginSchema, parseBody } from '../../utils/validators';
import { success, handleError, HttpError } from '../../utils/response';

const region = process.env.AWS_REGION ?? 'us-east-1';
const cognito = new CognitoIdentityProviderClient({ region });
const CLIENT_ID = process.env.COGNITO_CLIENT_ID ?? '';

interface CognitoErrorLike {
  name?: string;
  message?: string;
}

export const handler = async (
  event: APIGatewayProxyEventV2,
): Promise<APIGatewayProxyResultV2> => {
  try {
    const input = parseBody(LoginSchema, event.body);
    if (!CLIENT_ID) {
      throw new HttpError('Configuração de autenticação ausente', 500);
    }

    const result = await cognito.send(
      new InitiateAuthCommand({
        ClientId: CLIENT_ID,
        AuthFlow: 'USER_PASSWORD_AUTH',
        AuthParameters: {
          USERNAME: input.email,
          PASSWORD: input.password,
        },
      }),
    );

    const auth = result.AuthenticationResult;
    if (!auth?.IdToken || !auth.AccessToken) {
      throw new HttpError('Não foi possível autenticar', 401);
    }

    return success({
      idToken: auth.IdToken,
      accessToken: auth.AccessToken,
      refreshToken: auth.RefreshToken,
      expiresIn: auth.ExpiresIn,
      email: input.email,
    });
  } catch (err) {
    const cognitoErr = err as CognitoErrorLike;
    if (
      cognitoErr?.name === 'NotAuthorizedException' ||
      cognitoErr?.name === 'UserNotFoundException'
    ) {
      return handleError(new HttpError('E-mail ou senha inválidos', 401));
    }
    if (cognitoErr?.name === 'UserNotConfirmedException') {
      return handleError(new HttpError('Usuário não confirmado', 401));
    }
    return handleError(err);
  }
};
