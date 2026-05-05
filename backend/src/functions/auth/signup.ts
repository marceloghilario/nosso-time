import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import {
  CognitoIdentityProviderClient,
  SignUpCommand,
  AdminConfirmSignUpCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import { SignupSchema, parseBody } from '../../utils/validators';
import { success, handleError, HttpError } from '../../utils/response';

const region = process.env.AWS_REGION ?? 'us-east-1';
const cognito = new CognitoIdentityProviderClient({ region });
const CLIENT_ID = process.env.COGNITO_CLIENT_ID ?? '';
const USER_POOL_ID = process.env.COGNITO_USER_POOL_ID ?? '';

interface CognitoErrorLike {
  name?: string;
  message?: string;
}

export const handler = async (
  event: APIGatewayProxyEventV2,
): Promise<APIGatewayProxyResultV2> => {
  try {
    const input = parseBody(SignupSchema, event.body);
    if (!CLIENT_ID || !USER_POOL_ID) {
      throw new HttpError('Configuração de autenticação ausente', 500);
    }

    await cognito.send(
      new SignUpCommand({
        ClientId: CLIENT_ID,
        Username: input.email,
        Password: input.password,
        UserAttributes: [{ Name: 'email', Value: input.email }],
      }),
    );

    await cognito.send(
      new AdminConfirmSignUpCommand({
        UserPoolId: USER_POOL_ID,
        Username: input.email,
      }),
    );

    return success({ email: input.email }, 201);
  } catch (err) {
    const cognitoErr = err as CognitoErrorLike;
    if (cognitoErr?.name === 'UsernameExistsException') {
      return handleError(new HttpError('E-mail já cadastrado', 409));
    }
    if (cognitoErr?.name === 'InvalidPasswordException') {
      return handleError(
        new HttpError(
          'Senha inválida. Use ao menos 8 caracteres com letras maiúsculas, minúsculas e números.',
          400,
        ),
      );
    }
    return handleError(err);
  }
};
