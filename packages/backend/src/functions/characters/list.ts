import { APIGatewayProxyHandler } from 'aws-lambda';
import { CharacterRepository } from '../../lib/dynamodb/repositories/CharacterRepository';
import { successResponse, errorResponse } from '../../lib/utils/response';
import { Logger } from '../../lib/utils/logger';
import { UnauthorizedError, getErrorStatusCode } from '../../lib/utils/errors';

const logger = new Logger('ListCharactersFunction');
const characterRepo = new CharacterRepository();

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    logger.info('List characters request received');

    const userId = event.requestContext.authorizer?.jwt?.claims?.sub;

    if (!userId) {
      throw new UnauthorizedError('User not authenticated');
    }

    const limit = event.queryStringParameters?.limit
      ? parseInt(event.queryStringParameters.limit, 10)
      : 50;

    const characters = await characterRepo.listByUserId(userId, limit);

    logger.info('Characters listed successfully', {
      userId,
      count: characters.length,
    });

    return successResponse({ characters });
  } catch (error: any) {
    logger.error('List characters failed', error);

    return errorResponse(
      error.message || 'Failed to list characters',
      getErrorStatusCode(error),
      error.name
    );
  }
};
