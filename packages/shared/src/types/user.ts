import { z } from 'zod';

export const SubscriptionTierSchema = z.enum(['free', 'basic', 'premium']);
export type SubscriptionTier = z.infer<typeof SubscriptionTierSchema>;

export const UserProfileSchema = z.object({
  fullName: z.string().max(100).optional(),
  age: z.number().int().min(13).max(120).optional(),
  location: z.string().max(100).optional(),
  bio: z.string().max(500).optional(),
  interests: z.array(z.string().max(50)).max(10).optional(),
}).optional();

export type UserProfile = z.infer<typeof UserProfileSchema>;

export const UserSchema = z.object({
  userId: z.string().uuid(),
  email: z.string().email(),
  username: z.string().min(3).max(30),
  cognitoId: z.string(),
  subscriptionTier: SubscriptionTierSchema,
  messageCredits: z.number().int().nonnegative(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  profile: UserProfileSchema,
  metadata: z.object({
    preferences: z.object({
      theme: z.string().optional(),
      language: z.string().optional(),
      voiceEnabled: z.boolean().optional(),
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
