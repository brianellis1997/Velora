import { PutCommand, GetCommand, UpdateCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, TABLE_NAMES } from '../client';
import { User } from '@velora/shared';
import { v4 as uuidv4 } from 'uuid';

export class UserRepository {
  async create(data: {
    email: string;
    username: string;
    cognitoId: string;
  }): Promise<User> {
    const now = new Date().toISOString();
    const userId = uuidv4();

    const user: User = {
      userId,
      email: data.email,
      username: data.username,
      cognitoId: data.cognitoId,
      subscriptionTier: 'free',
      messageCredits: 0,
      createdAt: now,
      updatedAt: now,
    };

    await docClient.send(
      new PutCommand({
        TableName: TABLE_NAMES.USERS,
        Item: {
          PK: `USER#${userId}`,
          SK: 'PROFILE',
          ...user,
          email: data.email,
        },
      })
    );

    return user;
  }

  async getById(userId: string): Promise<User | null> {
    const result = await docClient.send(
      new GetCommand({
        TableName: TABLE_NAMES.USERS,
        Key: {
          PK: `USER#${userId}`,
          SK: 'PROFILE',
        },
      })
    );

    if (!result.Item) return null;

    const { PK, SK, ...user } = result.Item;
    return user as User;
  }

  async getByCognitoId(cognitoId: string): Promise<User | null> {
    const result = await docClient.send(
      new QueryCommand({
        TableName: TABLE_NAMES.USERS,
        IndexName: 'GSI1',
        KeyConditionExpression: 'cognitoId = :cognitoId',
        ExpressionAttributeValues: {
          ':cognitoId': cognitoId,
        },
        Limit: 1,
      })
    );

    if (!result.Items || result.Items.length === 0) return null;

    const { PK, SK, ...user } = result.Items[0];
    return user as User;
  }

  async getByEmail(email: string): Promise<User | null> {
    const result = await docClient.send(
      new QueryCommand({
        TableName: TABLE_NAMES.USERS,
        IndexName: 'GSI1',
        KeyConditionExpression: 'email = :email',
        ExpressionAttributeValues: {
          ':email': email,
        },
        Limit: 1,
      })
    );

    if (!result.Items || result.Items.length === 0) return null;

    const { PK, SK, ...user } = result.Items[0];
    return user as User;
  }

  async update(userId: string, updates: Partial<User>): Promise<User> {
    const updateExpressions: string[] = [];
    const expressionAttributeNames: Record<string, string> = {};
    const expressionAttributeValues: Record<string, any> = {};

    Object.entries(updates).forEach(([key, value], index) => {
      if (key !== 'userId' && key !== 'createdAt') {
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
        TableName: TABLE_NAMES.USERS,
        Key: {
          PK: `USER#${userId}`,
          SK: 'PROFILE',
        },
        UpdateExpression: `SET ${updateExpressions.join(', ')}`,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues,
      })
    );

    return this.getById(userId) as Promise<User>;
  }
}
