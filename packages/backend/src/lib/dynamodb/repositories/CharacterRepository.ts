import { PutCommand, GetCommand, UpdateCommand, QueryCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, TABLE_NAMES } from '../client';
import { Character, PersonalityTraits } from '@velora/shared';
import { v4 as uuidv4 } from 'uuid';

export class CharacterRepository {
  async create(data: {
    userId: string;
    name: string;
    systemPrompt: string;
    personalityTraits: PersonalityTraits;
    avatar?: string;
  }): Promise<Character> {
    const now = new Date().toISOString();
    const characterId = uuidv4();

    const character: Character = {
      characterId,
      userId: data.userId,
      name: data.name,
      systemPrompt: data.systemPrompt,
      personalityTraits: data.personalityTraits,
      avatar: data.avatar,
      isPublic: false,
      usageCount: 0,
      createdAt: now,
      updatedAt: now,
    };

    await docClient.send(
      new PutCommand({
        TableName: TABLE_NAMES.CHARACTERS,
        Item: {
          PK: `USER#${data.userId}`,
          SK: `CHARACTER#${characterId}`,
          ...character,
          userId: data.userId,
        },
      })
    );

    return character;
  }

  async getById(userId: string, characterId: string): Promise<Character | null> {
    const result = await docClient.send(
      new GetCommand({
        TableName: TABLE_NAMES.CHARACTERS,
        Key: {
          PK: `USER#${userId}`,
          SK: `CHARACTER#${characterId}`,
        },
      })
    );

    if (!result.Item) return null;

    const { PK, SK, ...character } = result.Item;
    return character as Character;
  }

  async listByUserId(userId: string, limit: number = 50): Promise<Character[]> {
    const result = await docClient.send(
      new QueryCommand({
        TableName: TABLE_NAMES.CHARACTERS,
        IndexName: 'GSI1',
        KeyConditionExpression: 'userId = :userId',
        ExpressionAttributeValues: {
          ':userId': userId,
        },
        Limit: limit,
        ScanIndexForward: false,
      })
    );

    if (!result.Items) return [];

    return result.Items.map(item => {
      const { PK, SK, ...character } = item;
      return character as Character;
    });
  }

  async update(userId: string, characterId: string, updates: Partial<Character>): Promise<Character> {
    const updateExpressions: string[] = [];
    const expressionAttributeNames: Record<string, string> = {};
    const expressionAttributeValues: Record<string, any> = {};

    Object.entries(updates).forEach(([key, value], index) => {
      if (key !== 'characterId' && key !== 'userId' && key !== 'createdAt') {
        updateExpressions.push(`#${key} = :val${index}`);
        expressionAttributeNames[`#${key}`] = key;
        expressionAttributeValues[`:val${index}`] = value;
      }
    });

    updateExpressions.push(`#updatedAt = :updatedAt`);
    expressionAttributeNames['#updatedAt'] = 'updatedAt';
    expressionAttributeValues[':updatedAt'] = new Date().toISOString();

    await docClient.send(
      new UpdateCommand({
        TableName: TABLE_NAMES.CHARACTERS,
        Key: {
          PK: `USER#${userId}`,
          SK: `CHARACTER#${characterId}`,
        },
        UpdateExpression: `SET ${updateExpressions.join(', ')}`,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues,
      })
    );

    return this.getById(userId, characterId) as Promise<Character>;
  }

  async delete(userId: string, characterId: string): Promise<void> {
    await docClient.send(
      new DeleteCommand({
        TableName: TABLE_NAMES.CHARACTERS,
        Key: {
          PK: `USER#${userId}`,
          SK: `CHARACTER#${characterId}`,
        },
      })
    );
  }

  async incrementUsageCount(userId: string, characterId: string): Promise<void> {
    await docClient.send(
      new UpdateCommand({
        TableName: TABLE_NAMES.CHARACTERS,
        Key: {
          PK: `USER#${userId}`,
          SK: `CHARACTER#${characterId}`,
        },
        UpdateExpression: 'SET usageCount = usageCount + :inc',
        ExpressionAttributeValues: {
          ':inc': 1,
        },
      })
    );
  }
}
