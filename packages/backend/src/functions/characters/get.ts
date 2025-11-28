import { APIGatewayProxyHandler } from 'aws-lambda';
import { CharacterRepository } from '../../lib/dynamodb/repositories/CharacterRepository';
import { getPresignedImageUrl } from '../../lib/s3/imageStorage';
import { successResponse, errorResponse } from '../../lib/utils/response';
import { Logger } from '../../lib/utils/logger';
import { UnauthorizedError, NotFoundError, getErrorStatusCode } from '../../lib/utils/errors';
import { getUserIdFromEvent } from '../../lib/utils/auth';

const logger = new Logger('GetCharacterFunction');
const characterRepo = new CharacterRepository();

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    logger.info('Get character request received');

    const userId = await getUserIdFromEvent(event);

    const characterId = event.pathParameters?.characterId;

    if (!characterId) {
      throw new NotFoundError('Character ID not provided');
    }

    const character = await characterRepo.getById(userId, characterId);

    if (!character) {
      throw new NotFoundError('Character not found');
    }

    if (character.avatar) {
      try {
        character.avatar = await getPresignedImageUrl(character.characterId);
      } catch (error) {
        logger.warn('Failed to refresh avatar URL', { characterId: character.characterId });
        character.avatar = undefined;
      }
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
