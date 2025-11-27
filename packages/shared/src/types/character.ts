import { z } from 'zod';

export const PersonalityToneSchema = z.enum(['playful', 'serious', 'romantic', 'professional', 'caring', 'adventurous']);
export type PersonalityTone = z.infer<typeof PersonalityToneSchema>;

export const PersonalityTraitsSchema = z.object({
  tone: PersonalityToneSchema,
  interests: z.array(z.string()).max(10),
  background: z.string().max(500),
  speakingStyle: z.string().max(200),
  customAttributes: z.record(z.any()).optional(),
});

export type PersonalityTraits = z.infer<typeof PersonalityTraitsSchema>;

export const CharacterSchema = z.object({
  characterId: z.string().uuid(),
  userId: z.string().uuid(),
  name: z.string().min(1).max(50),
  avatar: z.string().url().optional(),
  systemPrompt: z.string(),
  personalityTraits: PersonalityTraitsSchema,
  isPublic: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  usageCount: z.number().int().nonnegative(),
});

export type Character = z.infer<typeof CharacterSchema>;

export const CreateCharacterInputSchema = z.object({
  prompt: z.string().min(10).max(1000).optional(),
  name: z.string().min(1).max(50).optional(),
  personalityTraits: PersonalityTraitsSchema.optional(),
});

export type CreateCharacterInput = z.infer<typeof CreateCharacterInputSchema>;

export interface UpdateCharacterInput {
  name?: string;
  avatar?: string;
  systemPrompt?: string;
  personalityTraits?: Partial<PersonalityTraits>;
  isPublic?: boolean;
}

export interface GeneratedCharacterProfile {
  name: string;
  tone: PersonalityTone;
  background: string;
  interests: string[];
  speakingStyle: string;
  systemPrompt: string;
}
