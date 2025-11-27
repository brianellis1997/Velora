import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({});

export const docClient = DynamoDBDocumentClient.from(client, {
  marshallOptions: {
    removeUndefinedValues: true,
    convertClassInstanceToMap: true,
  },
});

export const TABLE_NAMES = {
  USERS: process.env.USERS_TABLE || 'velora-users',
  CHARACTERS: process.env.CHARACTERS_TABLE || 'velora-characters',
  CONVERSATIONS: process.env.CONVERSATIONS_TABLE || 'velora-conversations',
  MESSAGES: process.env.MESSAGES_TABLE || 'velora-messages',
  SUBSCRIPTIONS: process.env.SUBSCRIPTIONS_TABLE || 'velora-subscriptions',
};
