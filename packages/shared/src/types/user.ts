import { z } from 'zod';

export const SubscriptionTierSchema = z.enum(['free', 'basic', 'premium']);
export type SubscriptionTier = z.infer<typeof SubscriptionTierSchema>;

export const UserSchema = z.object({
  userId: z.string().uuid(),
  email: z.string().email(),
  username: z.string().min(3).max(30),
  cognitoId: z.string(),
  subscriptionTier: SubscriptionTierSchema,
  messageCredits: z.number().int().nonnegative(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  metadata: z.object({
    preferences: z.object({
      theme: z.string().optional(),
      language: z.string().optional(),
    }).optional(),
  }).optional(),
});

export type User = z.infer<typeof UserSchema>;

export interface UserProfileInput {
  username: string;
  email: string;
}

export interface UserUpdateInput {
  username?: string;
  metadata?: {
    preferences?: {
      theme?: string;
      language?: string;
    };
  };
}
