import { APIGatewayProxyHandler } from 'aws-lambda';
import { ConversationRepository } from '../../lib/dynamodb/repositories/ConversationRepository';
import { CharacterRepository } from '../../lib/dynamodb/repositories/CharacterRepository';
import { successResponse, errorResponse } from '../../lib/utils/response';
import { Logger } from '../../lib/utils/logger';
import { UnauthorizedError, NotFoundError, ValidationError, getErrorStatusCode } from '../../lib/utils/errors';
import { CreateConversationInputSchema } from '@velora/shared';

const logger = new Logger('CreateConversationFunction');
const conversationRepo = new ConversationRepository();
const characterRepo = new CharacterRepository();

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    logger.info('Create conversation request received');

    const userId = event.requestContext.authorizer?.jwt?.claims?.sub;

    if (!userId) {
      throw new UnauthorizedError('User not authenticated');
    }

    const body = JSON.parse(event.body || '{}');
    const validatedInput = CreateConversationInputSchema.parse(body);

    const character = await characterRepo.getById(userId, validatedInput.characterId);

    if (!character) {
      throw new NotFoundError('Character not found');
    }

    const conversation = await conversationRepo.create({
      userId,
      characterId: validatedInput.characterId,
      title: validatedInput.title,
    });

    logger.info('Conversation created successfully', {
      conversationId: conversation.conversationId,
    });

    return successResponse({ conversation }, 201);
  } catch (error: any) {
    logger.error('Create conversation failed', error);

    return errorResponse(
      error.message || 'Failed to create conversation',
      getErrorStatusCode(error),
      error.name
    );
  }
};
