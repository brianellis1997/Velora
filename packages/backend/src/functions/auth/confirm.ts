import { APIGatewayProxyHandler } from 'aws-lambda';
import { CognitoIdentityProviderClient, ConfirmSignUpCommand } from '@aws-sdk/client-cognito-identity-provider';
import { successResponse, errorResponse } from '../../lib/utils/response';
import { Logger } from '../../lib/utils/logger';
import { ValidationError, getErrorStatusCode } from '../../lib/utils/errors';

const logger = new Logger('ConfirmFunction');
const cognito = new CognitoIdentityProviderClient({});

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    logger.info('Confirm signup request received');

    const body = JSON.parse(event.body || '{}');
    const { username, code } = body;

    if (!username || !code) {
      throw new ValidationError('Username and confirmation code are required');
    }

    const clientId = process.env.COGNITO_CLIENT_ID;
    if (!clientId) {
      throw new Error('COGNITO_CLIENT_ID not configured');
    }

    await cognito.send(
      new ConfirmSignUpCommand({
        ClientId: clientId,
        Username: username,
        ConfirmationCode: code,
      })
    );

    logger.info('User confirmed successfully', { username });

    return successResponse({
      message: 'Email confirmed successfully',
    });
  } catch (error: any) {
    logger.error('Confirmation failed', error);

    if (error.name === 'CodeMismatchException') {
      return errorResponse('Invalid confirmation code', 400, 'INVALID_CODE');
    }

    if (error.name === 'ExpiredCodeException') {
      return errorResponse('Confirmation code has expired', 400, 'EXPIRED_CODE');
    }

    if (error.name === 'NotAuthorizedException') {
      return errorResponse('User already confirmed', 400, 'ALREADY_CONFIRMED');
    }

    return errorResponse(
      error.message || 'Confirmation failed',
      getErrorStatusCode(error),
      error.name
    );
  }
};
