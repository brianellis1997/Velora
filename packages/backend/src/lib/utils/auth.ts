import { APIGatewayProxyEventV2 } from 'aws-lambda';
import { UserRepository } from '../dynamodb/repositories/UserRepository';
import { UnauthorizedError } from './errors';
import { Logger } from './logger';

const userRepo = new UserRepository();
const logger = new Logger('AuthHelper');

export async function getUserIdFromEvent(event: any): Promise<string> {
  const cognitoId = event.requestContext.authorizer?.jwt?.claims?.sub;

  if (!cognitoId) {
    throw new UnauthorizedError('User not authenticated');
  }

  let user = null;

  try {
    user = await userRepo.getByCognitoId(cognitoId);
  } catch (error: any) {
    if (error.message?.includes('backfilling')) {
      logger.warn('GSI3 is backfilling, using fallback lookup', { cognitoId });
    } else {
      logger.warn('Error looking up by cognitoId, using fallback', { error: error.message });
    }
  }

  if (!user) {
    logger.warn('User not found by cognitoId, attempting migration', { cognitoId });

    const email = event.requestContext.authorizer?.jwt?.claims?.email;
    const username = event.requestContext.authorizer?.jwt?.claims?.['cognito:username'];

    if (email) {
      user = await userRepo.getByEmail(email);
    }

    if (!user && username) {
      user = await userRepo.getByUsername(username);
    }

    if (user) {
      logger.info('Found user by email/username, updating cognitoId', { userId: user.userId });
      try {
        await userRepo.update(user.userId, { cognitoId });
      } catch (error: any) {
        logger.warn('Failed to update cognitoId, will retry later', { error: error.message });
      }
    }
  }

  if (!user) {
    throw new UnauthorizedError('User not found');
  }

  return user.userId;
}
