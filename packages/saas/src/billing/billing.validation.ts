/**
 * Billing Validation Schemas
 *
 * Zod schemas for billing inputs.
 */

import { z } from 'zod';

export const createCheckoutSchema = z.object({
  planId: z.string().min(1),
  successUrl: z.string().url(),
  cancelUrl: z.string().url(),
  quantity: z.number().int().min(1).optional(),
});

export const createPortalSchema = z.object({
  returnUrl: z.string().url(),
});

export const cancelSubscriptionSchema = z.object({
  atPeriodEnd: z.boolean().default(true),
});

export const updateSeatsSchema = z.object({
  seats: z.number().int().min(1).max(10000),
});

export const checkFeatureSchema = z.object({
  feature: z.string().min(1),
});

export const getUsageSchema = z.object({
  metric: z.string().min(1),
  from: z.string().datetime(),
  to: z.string().datetime(),
});

export const recordUsageSchema = z.object({
  metric: z.string().min(1),
  quantity: z.number().int().min(1),
});

export type CreateCheckoutInput = z.infer<typeof createCheckoutSchema>;
export type CreatePortalInput = z.infer<typeof createPortalSchema>;
export type CancelSubscriptionInput = z.infer<typeof cancelSubscriptionSchema>;
export type UpdateSeatsInput = z.infer<typeof updateSeatsSchema>;
export type CheckFeatureInput = z.infer<typeof checkFeatureSchema>;
export type GetUsageInput = z.infer<typeof getUsageSchema>;
export type RecordUsageInput = z.infer<typeof recordUsageSchema>;
