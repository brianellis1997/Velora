import { APIGatewayProxyHandler } from 'aws-lambda';
import { CharacterRepository } from '../../lib/dynamodb/repositories/CharacterRepository';
import { successResponse, errorResponse } from '../../lib/utils/response';
import { Logger } from '../../lib/utils/logger';
import { UnauthorizedError, NotFoundError, getErrorStatusCode } from '../../lib/utils/errors';

const logger = new Logger('UpdateCharacterFunction');
const characterRepo = new CharacterRepository();

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    logger.info('Update character request received');

    const userId = event.requestContext.authorizer?.jwt?.claims?.sub;

    if (!userId) {
      throw new UnauthorizedError('User not authenticated');
    }

    const characterId = event.pathParameters?.characterId;

    if (!characterId) {
      throw new NotFoundError('Character ID not provided');
    }

    const body = JSON.parse(event.body || '{}');

    const character = await characterRepo.update(userId, characterId, body);

    logger.info('Character updated successfully', { characterId });

    return successResponse({ character });
  } catch (error: any) {
    logger.error('Update character failed', error);

    return errorResponse(
      error.message || 'Failed to update character',
      getErrorStatusCode(error),
      error.name
    );
  }
};
