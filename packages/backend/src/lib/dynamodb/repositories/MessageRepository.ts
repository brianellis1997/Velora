import { PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, TABLE_NAMES } from '../client';
import { Message, MessageRole } from '@velora/shared';
import { v4 as uuidv4 } from 'uuid';

export class MessageRepository {
  async create(data: {
    conversationId: string;
    role: MessageRole;
    content: string;
    tokens?: number;
    model?: string;
  }): Promise<Message> {
    const now = new Date().toISOString();
    const messageId = uuidv4();

    const message: Message = {
      messageId,
      conversationId: data.conversationId,
      role: data.role,
      content: data.content,
      timestamp: now,
      tokens: data.tokens,
      model: data.model,
    };

    const ttl = Math.floor(Date.now() / 1000) + 90 * 24 * 60 * 60;

    await docClient.send(
      new PutCommand({
        TableName: TABLE_NAMES.MESSAGES,
        Item: {
          PK: `CONV#${data.conversationId}`,
          SK: `MSG#${now}#${messageId}`,
          ...message,
          TTL: ttl,
        },
      })
    );

    return message;
  }

  async listByConversationId(
    conversationId: string,
    limit: number = 20,
    lastEvaluatedKey?: Record<string, any>
  ): Promise<{ messages: Message[]; lastEvaluatedKey?: Record<string, any> }> {
    const result = await docClient.send(
      new QueryCommand({
        TableName: TABLE_NAMES.MESSAGES,
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
        ExpressionAttributeValues: {
          ':pk': `CONV#${conversationId}`,
          ':sk': 'MSG#',
        },
        Limit: limit,
        ScanIndexForward: false,
        ExclusiveStartKey: lastEvaluatedKey,
      })
    );

    if (!result.Items) {
      return { messages: [] };
    }

    const messages = result.Items.map(item => {
      const { PK, SK, TTL, ...message } = item;
      return message as Message;
    });

    return {
      messages: messages.reverse(),
      lastEvaluatedKey: result.LastEvaluatedKey,
    };
  }

  async getRecentMessages(conversationId: string, limit: number = 20): Promise<Message[]> {
    const { messages } = await this.listByConversationId(conversationId, limit);
    return messages;
  }
}
