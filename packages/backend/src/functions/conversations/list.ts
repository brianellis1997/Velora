import { APIGatewayProxyHandler } from 'aws-lambda';
import { ConversationRepository } from '../../lib/dynamodb/repositories/ConversationRepository';
import { successResponse, errorResponse } from '../../lib/utils/response';
import { Logger } from '../../lib/utils/logger';
import { UnauthorizedError, getErrorStatusCode } from '../../lib/utils/errors';
import { getUserIdFromEvent } from '../../lib/utils/auth';

const logger = new Logger('ListConversationsFunction');
const conversationRepo = new ConversationRepository();

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    logger.info('List conversations request received');

    const userId = await getUserIdFromEvent(event);

    const limit = event.queryStringParameters?.limit
      ? parseInt(event.queryStringParameters.limit, 10)
      : 50;

    const conversations = await conversationRepo.listByUserId(userId, limit);

    logger.info('Conversations listed successfully', {
      userId,
      count: conversations.length,
    });

    return successResponse({ conversations });
  } catch (error: any) {
    logger.error('List conversations failed', error);

    return errorResponse(
      error.message || 'Failed to list conversations',
      getErrorStatusCode(error),
      error.name
    );
  }
};
