import { z } from 'zod';
import { SubscriptionTierSchema } from './user';

export const SubscriptionStatusSchema = z.enum(['active', 'cancelled', 'expired']);
export type SubscriptionStatus = z.infer<typeof SubscriptionStatusSchema>;

export const SubscriptionSchema = z.object({
  subscriptionId: z.string().uuid(),
  userId: z.string().uuid(),
  tier: SubscriptionTierSchema,
  status: SubscriptionStatusSchema,
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  autoRenew: z.boolean(),
  paymentMethod: z.string().optional(),
  usageThisMonth: z.object({
    messages: z.number().int().nonnegative(),
    tokens: z.number().int().nonnegative(),
  }),
  limits: z.object({
    messagesPerMonth: z.number().int().nonnegative(),
    charactersMax: z.number().int().nonnegative(),
    prioritySupport: z.boolean(),
  }),
});

export type Subscription = z.infer<typeof SubscriptionSchema>;

export const TIER_LIMITS = {
  free: {
    messagesPerMonth: 100,
    charactersMax: 2,
    prioritySupport: false,
  },
  basic: {
    messagesPerMonth: 1000,
    charactersMax: 10,
    prioritySupport: false,
  },
  premium: {
    messagesPerMonth: Infinity,
    charactersMax: Infinity,
    prioritySupport: true,
  },
} as const;
