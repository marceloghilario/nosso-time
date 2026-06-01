import type {
  APIGatewayProxyEventV2,
  APIGatewayProxyResultV2,
} from 'aws-lambda';
import {
  CognitoIdentityProviderClient,
  ConfirmForgotPasswordCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import { ResetPasswordSchema, parseBody } from '../../utils/validators';
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
    const input = parseBody(ResetPasswordSchema, event.body);
    if (!CLIENT_ID) {
      throw new HttpError('Configuração de autenticação ausente', 500);
    }

    await cognito.send(
      new ConfirmForgotPasswordCommand({
        ClientId: CLIENT_ID,
        Username: input.email,
        ConfirmationCode: input.code,
        Password: input.newPassword,
      }),
    );

    return success({ message: 'Senha redefinida com sucesso' });
  } catch (err) {
    const cognitoErr = err as CognitoErrorLike;
    if (
      cognitoErr?.name === 'CodeMismatchException' ||
      cognitoErr?.name === 'ExpiredCodeException'
    ) {
      return handleError(
        new HttpError(
          'Código inválido ou expirado. Solicite um novo link.',
          400,
        ),
      );
    }
    if (cognitoErr?.name === 'InvalidPasswordException') {
      return handleError(
        new HttpError(
          'Senha inválida. Use ao menos 8 caracteres com letras maiúsculas, minúsculas e números.',
          400,
        ),
      );
    }
    if (
      cognitoErr?.name === 'UserNotFoundException' ||
      cognitoErr?.name === 'NotAuthorizedException'
    ) {
      return handleError(
        new HttpError('Não foi possível redefinir a senha.', 400),
      );
    }
    if (cognitoErr?.name === 'LimitExceededException') {
      return handleError(
        new HttpError(
          'Muitas tentativas. Tente novamente em alguns minutos.',
          429,
        ),
      );
    }
    return handleError(err);
  }
};
