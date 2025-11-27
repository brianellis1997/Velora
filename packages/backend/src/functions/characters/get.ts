import { APIGatewayProxyHandler } from 'aws-lambda';
import { CharacterRepository } from '../../lib/dynamodb/repositories/CharacterRepository';
import { successResponse, errorResponse } from '../../lib/utils/response';
import { Logger } from '../../lib/utils/logger';
import { UnauthorizedError, NotFoundError, getErrorStatusCode } from '../../lib/utils/errors';

const logger = new Logger('GetCharacterFunction');
const characterRepo = new CharacterRepository();

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    logger.info('Get character request received');

    const userId = event.requestContext.authorizer?.jwt?.claims?.sub;

    if (!userId) {
      throw new UnauthorizedError('User not authenticated');
    }

    const characterId = event.pathParameters?.characterId;

    if (!characterId) {
      throw new NotFoundError('Character ID not provided');
    }

    const character = await characterRepo.getById(userId, characterId);

    if (!character) {
      throw new NotFoundError('Character not found');
    }

    logger.info('Character retrieved successfully', { characterId });

    return successResponse({ character });
  } catch (error: any) {
    logger.error('Get character failed', error);

    return errorResponse(
      error.message || 'Failed to get character',
      getErrorStatusCode(error),
      error.name
    );
  }
};
