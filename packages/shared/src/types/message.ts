import { z } from 'zod';

export const MessageRoleSchema = z.enum(['user', 'assistant', 'system']);
export type MessageRole = z.infer<typeof MessageRoleSchema>;

export const MessageSchema = z.object({
  messageId: z.string().uuid(),
  conversationId: z.string().uuid(),
  role: MessageRoleSchema,
  content: z.string(),
  timestamp: z.string().datetime(),
  tokens: z.number().int().nonnegative().optional(),
  model: z.string().optional(),
});

export type Message = z.infer<typeof MessageSchema>;

export const CreateMessageInputSchema = z.object({
  conversationId: z.string().uuid(),
  content: z.string().min(1).max(4000),
});

export type CreateMessageInput = z.infer<typeof CreateMessageInputSchema>;

export interface ChatContextMessage {
  role: MessageRole;
  content: string;
}

export interface StreamTokenResponse {
  type: 'token' | 'done' | 'error';
  content?: string;
  error?: string;
  messageId?: string;
  tokens?: number;
}
