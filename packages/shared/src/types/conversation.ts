import { z } from 'zod';

export const ConversationSchema = z.object({
  conversationId: z.string().uuid(),
  userId: z.string().uuid(),
  characterId: z.string().uuid(),
  title: z.string().max(100),
  lastMessageAt: z.string().datetime(),
  messageCount: z.number().int().nonnegative(),
  createdAt: z.string().datetime(),
  metadata: z.object({
    tags: z.array(z.string()).optional(),
    archived: z.boolean().optional(),
  }).optional(),
});

export type Conversation = z.infer<typeof ConversationSchema>;

export const CreateConversationInputSchema = z.object({
  characterId: z.string().uuid(),
  title: z.string().max(100).optional(),
});

export type CreateConversationInput = z.infer<typeof CreateConversationInputSchema>;

export interface UpdateConversationInput {
  title?: string;
  metadata?: {
    tags?: string[];
    archived?: boolean;
  };
}
