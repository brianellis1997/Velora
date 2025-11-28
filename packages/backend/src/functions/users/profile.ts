import { APIGatewayProxyHandler } from 'aws-lambda';
import { UserRepository } from '../../lib/dynamodb/repositories/UserRepository';
import { successResponse, errorResponse } from '../../lib/utils/response';
import { Logger } from '../../lib/utils/logger';
import { UnauthorizedError, NotFoundError, getErrorStatusCode } from '../../lib/utils/errors';
import { getUserIdFromEvent } from '../../lib/utils/auth';

const logger = new Logger('GetProfileFunction');
const userRepo = new UserRepository();

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    logger.info('Get profile request received');

    const userId = await getUserIdFromEvent(event);

    const user = await userRepo.getById(userId);

    if (!user) {
      throw new NotFoundError('User not found');
    }

    logger.info('Profile retrieved successfully', { userId: user.userId });

    return successResponse({
      user: {
        userId: user.userId,
        email: user.email,
        username: user.username,
        subscriptionTier: user.subscriptionTier,
        messageCredits: user.messageCredits,
        createdAt: user.createdAt,
        profile: user.profile,
        metadata: user.metadata,
      },
    });
  } catch (error: any) {
    logger.error('Get profile failed', error);

    return errorResponse(
      error.message || 'Failed to get profile',
      getErrorStatusCode(error),
      error.name
    );
  }
};
