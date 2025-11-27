import { apiRequest } from './client';
import { Conversation, Message } from '@velora/shared';

export async function createConversation(
  characterId: string,
  token: string,
  title?: string
): Promise<{ conversation: Conversation }> {
  return apiRequest('/conversations', {
    method: 'POST',
    body: { characterId, title },
    token,
  });
}

export async function listConversations(
  token: string
): Promise<{ conversations: Conversation[] }> {
  return apiRequest('/conversations', {
    method: 'GET',
    token,
  });
}

export async function getMessages(
  conversationId: string,
  token: string
): Promise<{ messages: Message[]; hasMore: boolean }> {
  return apiRequest(`/conversations/${conversationId}/messages`, {
    method: 'GET',
    token,
  });
}
