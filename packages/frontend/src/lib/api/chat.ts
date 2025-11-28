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

export async function transcribeAudio(
  audioBlob: Blob,
  token: string
): Promise<{ text: string }> {
  const base64Audio = await blobToBase64(audioBlob);

  return apiRequest('/chat/transcribe', {
    method: 'POST',
    body: { audio: base64Audio },
    token,
  });
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      const base64Data = base64String.split(',')[1];
      resolve(base64Data);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
