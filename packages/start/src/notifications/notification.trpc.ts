import { orgProcedure, publicProcedure, router } from '@cruzjs/core/trpc/context';
import { NotificationService } from './notification.service';
import { SlackChannel } from './channels/slack.channel';
import { PushChannel } from './channels/push.channel';
import {
  GetNotificationsInputSchema,
  MarkReadInputSchema,
  ConfigureSlackInputSchema,
  TestSlackInputSchema,
  UpdateNotificationPreferenceInputSchema,
  BulkUpdateNotificationPreferencesInputSchema,
  SubscribePushInputSchema,
  UnsubscribePushInputSchema,
} from './notification.types';

/**
 * Notification Router
 *
 * tRPC endpoints for in-app notification management and Slack configuration.
 * All endpoints use orgProcedure for multi-tenant isolation.
 */
export const notificationTrpc = router({
  /**
   * Get paginated notifications for the current user.
   */
  getNotifications: orgProcedure
    .input(GetNotificationsInputSchema)
    .query(async ({ ctx, input }) => {
      const service = ctx.container.get<NotificationService>(NotificationService);
      return service.getNotifications(
        ctx.org.org.userId,
        ctx.org.org.orgId,
        input.cursor,
        input.limit,
        input.unreadOnly
      );
    }),

  /**
   * Get unread notification count for the current user.
   * Used by NotificationBell for badge display.
   */
  getUnreadCount: orgProcedure
    .query(async ({ ctx }) => {
      const service = ctx.container.get<NotificationService>(NotificationService);
      return service.getUnreadCount(ctx.org.org.userId, ctx.org.org.orgId);
    }),

  /**
   * Mark specific notifications as read.
   */
  markRead: orgProcedure
    .input(MarkReadInputSchema)
    .mutation(async ({ ctx, input }) => {
      const service = ctx.container.get<NotificationService>(NotificationService);
      await service.markRead(ctx.org.org.userId, input.notificationIds);
      return { success: true };
    }),

  /**
   * Mark all notifications as read for the current user in this org.
   */
  markAllRead: orgProcedure
    .mutation(async ({ ctx }) => {
      const service = ctx.container.get<NotificationService>(NotificationService);
      await service.markAllRead(ctx.org.org.userId, ctx.org.org.orgId);
      return { success: true };
    }),

  /**
   * Configure Slack integration for the org (admin-only).
   * Upserts the Slack connection webhook URL.
   */
  configureSlack: orgProcedure
    .input(ConfigureSlackInputSchema)
    .mutation(async ({ ctx, input }) => {
      const service = ctx.container.get<NotificationService>(NotificationService);
      return service.configureSlack(
        ctx.org.org.orgId,
        input.webhookUrl,
        input.channelName,
        ctx.org.org.userId
      );
    }),

  /**
   * Get Slack connection status for the org.
   */
  getSlackConfig: orgProcedure
    .query(async ({ ctx }) => {
      const service = ctx.container.get<NotificationService>(NotificationService);
      return service.getSlackConfig(ctx.org.org.orgId);
    }),

  /**
   * Send a test message to the configured Slack webhook.
   */
  testSlack: orgProcedure
    .input(TestSlackInputSchema)
    .mutation(async ({ ctx }) => {
      const slackChannel = ctx.container.get<SlackChannel>(SlackChannel);
      return slackChannel.sendTest(ctx.org.org.orgId);
    }),

  // ==========================================================================
  // Notification Preferences
  // ==========================================================================

  /**
   * Get all notification preferences for the current user.
   * Returns explicit opt-outs. Absence means enabled (default).
   */
  getPreferences: orgProcedure
    .query(async ({ ctx }) => {
      const service = ctx.container.get<NotificationService>(NotificationService);
      return service.getPreferences(ctx.org.org.userId, ctx.org.org.orgId);
    }),

  /**
   * Update a single notification preference.
   */
  updatePreference: orgProcedure
    .input(UpdateNotificationPreferenceInputSchema)
    .mutation(async ({ ctx, input }) => {
      const service = ctx.container.get<NotificationService>(NotificationService);
      await service.updatePreference(
        ctx.org.org.userId,
        ctx.org.org.orgId,
        input.eventType,
        input.channel,
        input.enabled
      );
      return { success: true };
    }),

  /**
   * Bulk update notification preferences.
   */
  bulkUpdatePreferences: orgProcedure
    .input(BulkUpdateNotificationPreferencesInputSchema)
    .mutation(async ({ ctx, input }) => {
      const service = ctx.container.get<NotificationService>(NotificationService);
      await service.bulkUpdatePreferences(
        ctx.org.org.userId,
        ctx.org.org.orgId,
        input.preferences
      );
      return { success: true };
    }),

  // ==========================================================================
  // Push Subscription Management
  // ==========================================================================

  /**
   * Register a push subscription for the current user.
   */
  subscribePush: orgProcedure
    .input(SubscribePushInputSchema)
    .mutation(async ({ ctx, input }) => {
      const pushChannel = ctx.container.get<PushChannel>(PushChannel);
      await pushChannel.subscribe(
        ctx.org.org.userId,
        ctx.org.org.orgId,
        { endpoint: input.endpoint, keys: input.keys },
      );
      return { success: true };
    }),

  /**
   * Remove a push subscription for the current user.
   */
  unsubscribePush: orgProcedure
    .input(UnsubscribePushInputSchema)
    .mutation(async ({ ctx, input }) => {
      const pushChannel = ctx.container.get<PushChannel>(PushChannel);
      await pushChannel.unsubscribe(ctx.org.org.userId, input.endpoint);
      return { success: true };
    }),

  /**
   * Get the VAPID public key for push subscription (public, no auth needed).
   */
  getPushKey: publicProcedure
    .query(({ ctx }) => {
      const pushChannel = ctx.container.get<PushChannel>(PushChannel);
      return { publicKey: pushChannel.getPublicKey() ?? null };
    }),
});
