import { PutCommand, GetCommand, QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, TABLE_NAMES } from '../client';
import { Conversation } from '@velora/shared';
import { v4 as uuidv4 } from 'uuid';

export class ConversationRepository {
  async create(data: {
    userId: string;
    characterId: string;
    title?: string;
  }): Promise<Conversation> {
    const now = new Date().toISOString();
    const conversationId = uuidv4();

    const conversation: Conversation = {
      conversationId,
      userId: data.userId,
      characterId: data.characterId,
      title: data.title || `Conversation ${new Date().toLocaleDateString()}`,
      lastMessageAt: now,
      messageCount: 0,
      createdAt: now,
    };

    await docClient.send(
      new PutCommand({
        TableName: TABLE_NAMES.CONVERSATIONS,
        Item: {
          PK: `USER#${data.userId}`,
          SK: `CONV#${conversationId}`,
          ...conversation,
          characterId: data.characterId,
        },
      })
    );

    return conversation;
  }

  async getById(userId: string, conversationId: string): Promise<Conversation | null> {
    const result = await docClient.send(
      new GetCommand({
        TableName: TABLE_NAMES.CONVERSATIONS,
        Key: {
          PK: `USER#${userId}`,
          SK: `CONV#${conversationId}`,
        },
      })
    );

    if (!result.Item) return null;

    const { PK, SK, ...conversation } = result.Item;
    return conversation as Conversation;
  }

  async listByUserId(userId: string, limit: number = 50): Promise<Conversation[]> {
    const result = await docClient.send(
      new QueryCommand({
        TableName: TABLE_NAMES.CONVERSATIONS,
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
        ExpressionAttributeValues: {
          ':pk': `USER#${userId}`,
          ':sk': 'CONV#',
        },
        Limit: limit,
        ScanIndexForward: false,
      })
    );

    if (!result.Items) return [];

    return result.Items.map(item => {
      const { PK, SK, ...conversation } = item;
      return conversation as Conversation;
    });
  }

  async updateLastMessage(userId: string, conversationId: string): Promise<void> {
    await docClient.send(
      new UpdateCommand({
        TableName: TABLE_NAMES.CONVERSATIONS,
        Key: {
          PK: `USER#${userId}`,
          SK: `CONV#${conversationId}`,
        },
        UpdateExpression: 'SET lastMessageAt = :timestamp, messageCount = messageCount + :inc',
        ExpressionAttributeValues: {
          ':timestamp': new Date().toISOString(),
          ':inc': 1,
        },
      })
    );
  }
}
