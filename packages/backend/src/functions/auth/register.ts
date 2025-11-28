import { APIGatewayProxyHandler } from 'aws-lambda';
import { CognitoIdentityProviderClient, SignUpCommand, AdminConfirmSignUpCommand } from '@aws-sdk/client-cognito-identity-provider';
import { UserRepository } from '../../lib/dynamodb/repositories/UserRepository';
import { successResponse, errorResponse } from '../../lib/utils/response';
import { Logger } from '../../lib/utils/logger';
import { ValidationError, getErrorStatusCode } from '../../lib/utils/errors';

const logger = new Logger('RegisterFunction');
const cognito = new CognitoIdentityProviderClient({});
const userRepo = new UserRepository();

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    logger.info('Register request received');

    const body = JSON.parse(event.body || '{}');
    const { email, password, username } = body;

    if (!email || !password || !username) {
      throw new ValidationError('Email, password, and username are required');
    }

    if (password.length < 8) {
      throw new ValidationError('Password must be at least 8 characters');
    }

    const clientId = process.env.COGNITO_CLIENT_ID;
    if (!clientId) {
      throw new Error('COGNITO_CLIENT_ID not configured');
    }

    const signUpResult = await cognito.send(
      new SignUpCommand({
        ClientId: clientId,
        Username: username,
        Password: password,
        UserAttributes: [
          { Name: 'email', Value: email },
        ],
      })
    );

    const cognitoId = signUpResult.UserSub!;

    if (process.env.AUTO_CONFIRM_USERS === 'true') {
      await cognito.send(
        new AdminConfirmSignUpCommand({
          UserPoolId: process.env.USER_POOL_ID!,
          Username: username,
        })
      );
    }

    const user = await userRepo.create({
      email,
      username,
      cognitoId,
    });

    logger.info('User registered successfully', { userId: user.userId });

    return successResponse({
      user: {
        userId: user.userId,
        email: user.email,
        username: user.username,
      },
      message: 'Registration successful. Please check your email to verify your account.',
    }, 201);
  } catch (error: any) {
    logger.error('Registration failed', error);

    if (error.name === 'UsernameExistsException') {
      return errorResponse('Email already registered', 400, 'EMAIL_EXISTS');
    }

    return errorResponse(
      error.message || 'Registration failed',
      getErrorStatusCode(error),
      error.name
    );
  }
};
