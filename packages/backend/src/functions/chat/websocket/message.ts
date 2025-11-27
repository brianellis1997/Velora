import { APIGatewayProxyHandler } from 'aws-lambda';
import { ApiGatewayManagementApiClient, PostToConnectionCommand } from '@aws-sdk/client-apigatewaymanagementapi';
import { MessageRepository } from '../../../lib/dynamodb/repositories/MessageRepository';
import { ConversationRepository } from '../../../lib/dynamodb/repositories/ConversationRepository';
import { CharacterRepository } from '../../../lib/dynamodb/repositories/CharacterRepository';
import { streamChatCompletion } from '../../../lib/groq/client';
import { wsSuccessResponse, wsErrorResponse } from '../../../lib/utils/response';
import { Logger } from '../../../lib/utils/logger';
import { ChatContextMessage, StreamTokenResponse } from '@velora/shared';

const logger = new Logger('WsMessageFunction');
const messageRepo = new MessageRepository();
const conversationRepo = new ConversationRepository();
const characterRepo = new CharacterRepository();

export const handler: APIGatewayProxyHandler = async (event) => {
  const connectionId = event.requestContext.connectionId!;
  const domain = event.requestContext.domainName!;
  const stage = event.requestContext.stage!;

  const apiGateway = new ApiGatewayManagementApiClient({
    endpoint: `https://${domain}/${stage}`,
  });

  const sendToClient = async (data: StreamTokenResponse) => {
    try {
      await apiGateway.send(
        new PostToConnectionCommand({
          ConnectionId: connectionId,
          Data: JSON.stringify(data),
        })
      );
    } catch (error: any) {
      logger.error('Failed to send to client', error);
    }
  };

  try {
    const body = JSON.parse(event.body || '{}');
    const { conversationId, content, userId } = body;

    if (!conversationId || !content || !userId) {
      await sendToClient({
        type: 'error',
        error: 'Missing required fields: conversationId, content, userId',
      });
      return wsErrorResponse('Missing required fields', 400);
    }

    logger.info('Processing chat message', { conversationId, userId });

    const conversation = await conversationRepo.getById(userId, conversationId);

    if (!conversation) {
      await sendToClient({
        type: 'error',
        error: 'Conversation not found',
      });
      return wsErrorResponse('Conversation not found', 404);
    }

    const character = await characterRepo.getById(userId, conversation.characterId);

    if (!character) {
      await sendToClient({
        type: 'error',
        error: 'Character not found',
      });
      return wsErrorResponse('Character not found', 404);
    }

    const userMessage = await messageRepo.create({
      conversationId,
      role: 'user',
      content,
    });

    const recentMessages = await messageRepo.getRecentMessages(conversationId, 20);

    const contextMessages: ChatContextMessage[] = [
      { role: 'system', content: character.systemPrompt },
      ...recentMessages.map(msg => ({
        role: msg.role,
        content: msg.content,
      })),
    ];

    let fullResponse = '';
    let tokenCount = 0;

    const { content: responseContent, tokens, model } = await streamChatCompletion(
      contextMessages,
      async (token: string) => {
        fullResponse += token;
        tokenCount++;
        await sendToClient({
          type: 'token',
          content: token,
        });
      }
    );

    const assistantMessage = await messageRepo.create({
      conversationId,
      role: 'assistant',
      content: responseContent,
      tokens,
      model,
    });

    await conversationRepo.updateLastMessage(userId, conversationId);

    await characterRepo.incrementUsageCount(userId, character.characterId);

    await sendToClient({
      type: 'done',
      messageId: assistantMessage.messageId,
      tokens: tokens,
    });

    logger.info('Chat message processed successfully', {
      conversationId,
      tokens,
    });

    return wsSuccessResponse({ message: 'Message processed' });
  } catch (error: any) {
    logger.error('WebSocket message processing failed', error);

    await sendToClient({
      type: 'error',
      error: error.message || 'Failed to process message',
    });

    return wsErrorResponse(error.message || 'Message processing failed', 500);
  }
};
