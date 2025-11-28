import { APIGatewayProxyHandler } from 'aws-lambda';
import { CognitoIdentityProviderClient, InitiateAuthCommand } from '@aws-sdk/client-cognito-identity-provider';
import { UserRepository } from '../../lib/dynamodb/repositories/UserRepository';
import { successResponse, errorResponse } from '../../lib/utils/response';
import { Logger } from '../../lib/utils/logger';
import { ValidationError, UnauthorizedError, getErrorStatusCode } from '../../lib/utils/errors';

const logger = new Logger('LoginFunction');
const cognito = new CognitoIdentityProviderClient({});
const userRepo = new UserRepository();

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    logger.info('Login request received');

    const body = JSON.parse(event.body || '{}');
    const { email, password } = body;
    const username = email; // Frontend sends 'email' field which can be username or email

    if (!username || !password) {
      throw new ValidationError('Username/email and password are required');
    }

    const clientId = process.env.COGNITO_CLIENT_ID;
    if (!clientId) {
      throw new Error('COGNITO_CLIENT_ID not configured');
    }

    const authResult = await cognito.send(
      new InitiateAuthCommand({
        AuthFlow: 'USER_PASSWORD_AUTH',
        ClientId: clientId,
        AuthParameters: {
          USERNAME: username,
          PASSWORD: password,
        },
      })
    );

    if (!authResult.AuthenticationResult) {
      throw new UnauthorizedError('Authentication failed');
    }

    // Try to find user by email first, then by username
    let user = username.includes('@') ? await userRepo.getByEmail(username) : null;
    if (!user) {
      // If not found by email or input wasn't an email, search by username
      const allUsers = await userRepo.list();
      user = allUsers.find(u => u.username === username) || null;
    }

    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    logger.info('User logged in successfully', { userId: user.userId });

    return successResponse({
      user: {
        userId: user.userId,
        email: user.email,
        username: user.username,
        subscriptionTier: user.subscriptionTier,
      },
      tokens: {
        accessToken: authResult.AuthenticationResult.AccessToken,
        idToken: authResult.AuthenticationResult.IdToken,
        refreshToken: authResult.AuthenticationResult.RefreshToken,
        expiresIn: authResult.AuthenticationResult.ExpiresIn,
      },
    });
  } catch (error: any) {
    logger.error('Login failed', error);

    if (error.name === 'NotAuthorizedException' || error.name === 'UserNotFoundException') {
      return errorResponse('Invalid email or password', 401, 'INVALID_CREDENTIALS');
    }

    return errorResponse(
      error.message || 'Login failed',
      getErrorStatusCode(error),
      error.name
    );
  }
};
