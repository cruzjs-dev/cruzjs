import { z } from 'zod';
import type { NotificationType } from '../database/schema';
import {
  NotificationTypeValues,
  NotificationChannelValues,
} from '../database/schema';

/**
 * Notification payload for routing through channels.
 */
export interface NotificationPayload {
  type: NotificationType;
  title: string;
  body: string;
  linkUrl?: string;
  metadata: Record<string, string>;
  recipientIds: string[];
}

/**
 * Channel configuration for notification routing.
 * Now backed by per-user preferences (opt-out model).
 */
export interface ChannelConfig {
  slack: boolean;
  email: boolean;
  inApp: boolean;
}

/**
 * Per-user preference for a specific event type + channel combination.
 */
export interface NotificationPreferenceSetting {
  eventType: string;
  channel: string;
  enabled: boolean;
}

// ============================================================================
// Zod Schemas for tRPC input validation
// ============================================================================

export const GetNotificationsInputSchema = z.object({
  cursor: z.string().optional(),
  limit: z.number().int().min(1).max(50).default(20),
  unreadOnly: z.boolean().default(false),
});
export type GetNotificationsInput = z.infer<typeof GetNotificationsInputSchema>;

export const MarkReadInputSchema = z.object({
  notificationIds: z.array(z.string()).min(1).max(100),
});
export type MarkReadInput = z.infer<typeof MarkReadInputSchema>;

export const ConfigureSlackInputSchema = z.object({
  webhookUrl: z.string().url(),
  channelName: z.string().optional(),
});
export type ConfigureSlackInput = z.infer<typeof ConfigureSlackInputSchema>;

export const TestSlackInputSchema = z.object({});
export type TestSlackInput = z.infer<typeof TestSlackInputSchema>;

// ============================================================================
// Notification Preference Schemas (Phase 7 - Plan 07-08)
// ============================================================================

export const UpdateNotificationPreferenceInputSchema = z.object({
  eventType: z.enum(NotificationTypeValues),
  channel: z.enum(NotificationChannelValues),
  enabled: z.boolean(),
});
export type UpdateNotificationPreferenceInput = z.infer<typeof UpdateNotificationPreferenceInputSchema>;

export const BulkUpdateNotificationPreferencesInputSchema = z.object({
  preferences: z.array(UpdateNotificationPreferenceInputSchema).min(1).max(50),
});
export type BulkUpdateNotificationPreferencesInput = z.infer<typeof BulkUpdateNotificationPreferencesInputSchema>;

// ============================================================================
// Push Subscription Schemas
// ============================================================================

export const SubscribePushInputSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
});
export type SubscribePushInput = z.infer<typeof SubscribePushInputSchema>;

export const UnsubscribePushInputSchema = z.object({
  endpoint: z.string().url(),
});
export type UnsubscribePushInput = z.infer<typeof UnsubscribePushInputSchema>;
