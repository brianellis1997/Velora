import { APIGatewayProxyHandler } from 'aws-lambda';
import { UserRepository } from '../../lib/dynamodb/repositories/UserRepository';
import { successResponse, errorResponse } from '../../lib/utils/response';
import { Logger } from '../../lib/utils/logger';
import { UnauthorizedError, NotFoundError, ValidationError, getErrorStatusCode } from '../../lib/utils/errors';
import { getUserIdFromEvent } from '../../lib/utils/auth';
import { UserProfileSchema } from '@velora/shared';

const logger = new Logger('UpdateProfileFunction');
const userRepo = new UserRepository();

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    logger.info('Update profile request received');

    const userId = await getUserIdFromEvent(event);

    const body = JSON.parse(event.body || '{}');

    const validatedProfile = UserProfileSchema.parse(body.profile);
    const preferences = body.metadata?.preferences;

    const updates: any = {};
    if (validatedProfile !== undefined) {
      updates.profile = validatedProfile;
    }
    if (preferences !== undefined) {
      updates.metadata = { preferences };
    }

    const updatedUser = await userRepo.update(userId, updates);

    logger.info('Profile updated successfully', { userId });

    return successResponse({
      user: {
        userId: updatedUser.userId,
        email: updatedUser.email,
        username: updatedUser.username,
        profile: updatedUser.profile,
        metadata: updatedUser.metadata,
      },
    });
  } catch (error: any) {
    logger.error('Update profile failed', error);

    return errorResponse(
      error.message || 'Failed to update profile',
      getErrorStatusCode(error),
      error.name
    );
  }
};
