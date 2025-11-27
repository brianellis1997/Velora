import { APIGatewayProxyHandler } from 'aws-lambda';
import { CharacterRepository } from '../../lib/dynamodb/repositories/CharacterRepository';
import { successResponse, errorResponse } from '../../lib/utils/response';
import { Logger } from '../../lib/utils/logger';
import { UnauthorizedError, NotFoundError, getErrorStatusCode } from '../../lib/utils/errors';

const logger = new Logger('DeleteCharacterFunction');
const characterRepo = new CharacterRepository();

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    logger.info('Delete character request received');

    const userId = event.requestContext.authorizer?.jwt?.claims?.sub;

    if (!userId) {
      throw new UnauthorizedError('User not authenticated');
    }

    const characterId = event.pathParameters?.characterId;

    if (!characterId) {
      throw new NotFoundError('Character ID not provided');
    }

    await characterRepo.delete(userId, characterId);

    logger.info('Character deleted successfully', { characterId });

    return successResponse({ message: 'Character deleted successfully' });
  } catch (error: any) {
    logger.error('Delete character failed', error);

    return errorResponse(
      error.message || 'Failed to delete character',
      getErrorStatusCode(error),
      error.name
    );
  }
};
