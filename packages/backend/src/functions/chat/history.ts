import { APIGatewayProxyHandler } from 'aws-lambda';
import { MessageRepository } from '../../lib/dynamodb/repositories/MessageRepository';
import { ConversationRepository } from '../../lib/dynamodb/repositories/ConversationRepository';
import { successResponse, errorResponse } from '../../lib/utils/response';
import { Logger } from '../../lib/utils/logger';
import { UnauthorizedError, NotFoundError, getErrorStatusCode } from '../../lib/utils/errors';
import { getUserIdFromEvent } from '../../lib/utils/auth';

const logger = new Logger('GetMessagesFunction');
const messageRepo = new MessageRepository();
const conversationRepo = new ConversationRepository();

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    logger.info('Get messages request received');

    const userId = await getUserIdFromEvent(event);

    const conversationId = event.pathParameters?.conversationId;

    if (!conversationId) {
      throw new NotFoundError('Conversation ID not provided');
    }

    const conversation = await conversationRepo.getById(userId, conversationId);

    if (!conversation) {
      throw new NotFoundError('Conversation not found');
    }

    const limit = event.queryStringParameters?.limit
      ? parseInt(event.queryStringParameters.limit, 10)
      : 50;

    const { messages, lastEvaluatedKey } = await messageRepo.listByConversationId(
      conversationId,
      limit
    );

    logger.info('Messages retrieved successfully', {
      conversationId,
      count: messages.length,
    });

    return successResponse({
      messages,
      hasMore: !!lastEvaluatedKey,
      nextToken: lastEvaluatedKey ? JSON.stringify(lastEvaluatedKey) : undefined,
    });
  } catch (error: any) {
    logger.error('Get messages failed', error);

    return errorResponse(
      error.message || 'Failed to get messages',
      getErrorStatusCode(error),
      error.name
    );
  }
};
