import { Injectable, Inject, Optional } from '@cruzjs/core/di';
import { eq, and, desc, lt, sql } from 'drizzle-orm';
import {
  DRIZZLE,
  type DrizzleDatabase,
} from '@cruzjs/core/shared/database/drizzle.service';
import {
  notifications,
  slackConnections,
  notificationPreferences,
  type NotificationType,
  type NotificationChannel,
} from '../database/schema';
import type {
  NotificationPayload,
  NotificationPreferenceSetting,
} from './notification.types';
import { SlackChannel } from './channels/slack.channel';
import { EmailChannel } from './channels/email.channel';
import { InAppChannel } from './channels/inapp.channel';
import { SmsChannel } from './channels/sms.channel';
import { PushChannel } from './channels/push.channel';
import { WebhookNotificationChannel } from './channels/webhook.channel';
import type { NotificationBase } from './notification.base';

/**
 * NotificationService
 *
 * Routes notification payloads to configured channels (Slack, email, in-app).
 * Provides query methods for in-app notification management.
 *
 * Uses opt-out model for preferences: all channels enabled by default.
 * Users can disable specific event-type + channel combinations.
 */
@Injectable()
export class NotificationService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDatabase,
    @Inject(SlackChannel) private readonly slackChannel: SlackChannel,
    @Inject(EmailChannel) private readonly emailChannel: EmailChannel,
    @Inject(InAppChannel) private readonly inAppChannel: InAppChannel,
    @Inject(SmsChannel) @Optional() private readonly smsChannel: SmsChannel | null,
    @Inject(PushChannel) @Optional() private readonly pushChannel: PushChannel | null,
    @Inject(WebhookNotificationChannel) @Optional() private readonly webhookChannel: WebhookNotificationChannel | null,
  ) {}

  /**
   * Send a notification to configured channels, respecting per-user preferences.
   * Opt-out model: all channels enabled by default unless explicitly disabled.
   */
  async notify(orgId: string, payload: NotificationPayload): Promise<void> {
    // Get all opt-out preferences for recipients of this event type
    const disabledPrefs = await this.getDisabledPreferences(
      orgId,
      payload.recipientIds,
      payload.type
    );

    // Build per-channel recipient lists
    const inAppRecipients = payload.recipientIds.filter(
      uid => !disabledPrefs.some(p => p.userId === uid && p.channel === 'IN_APP')
    );
    const emailRecipients = payload.recipientIds.filter(
      uid => !disabledPrefs.some(p => p.userId === uid && p.channel === 'EMAIL')
    );
    const slackDisabled = disabledPrefs.some(p => p.channel === 'SLACK');

    // Send to channels in parallel -- failures in one channel don't block others
    await Promise.allSettled([
      inAppRecipients.length > 0
        ? this.inAppChannel.send(orgId, inAppRecipients, payload)
        : Promise.resolve(),
      !slackDisabled
        ? this.slackChannel.send(orgId, payload)
        : Promise.resolve(),
      emailRecipients.length > 0
        ? this.emailChannel.send(emailRecipients, payload)
        : Promise.resolve(),
    ]);
  }

  /**
   * Send a class-based Notification to multiple users.
   *
   * Dispatches to all channels declared by `notification.via()`, respecting
   * per-user opt-out preferences. This is the new recommended API for sending
   * notifications with per-channel rendering.
   *
   * Backward compatible -- existing `notify()` with NotificationPayload still works.
   */
  async notifyMany(
    orgId: string,
    userIds: string[],
    notification: NotificationBase,
  ): Promise<void> {
    if (userIds.length === 0) {
      return;
    }

    const channels = notification.via();
    const promises: Promise<void>[] = [];

    // Determine the event type for preference lookups
    const dbData = notification.toDatabase?.();
    const eventType = dbData?.type ?? 'GENERIC';

    // Get all disabled preferences for these users + event type
    const disabledPrefs = await this.getDisabledPreferences(orgId, userIds, eventType);

    for (const channel of channels) {
      const recipientsForChannel = userIds.filter(
        uid => !disabledPrefs.some(p => p.userId === uid && p.channel === channel),
      );

      if (recipientsForChannel.length === 0 && channel !== 'WEBHOOK_CHANNEL') {
        continue;
      }

      switch (channel) {
        case 'IN_APP': {
          if (notification.toDatabase) {
            const data = notification.toDatabase();
            const payload: NotificationPayload = {
              type: data.type as NotificationType,
              title: data.title,
              body: data.message,
              linkUrl: data.actionUrl,
              metadata: (data.metadata ?? {}) as Record<string, string>,
              recipientIds: recipientsForChannel,
            };
            promises.push(this.inAppChannel.send(orgId, recipientsForChannel, payload));
          }
          break;
        }
        case 'EMAIL': {
          if (notification.toMail) {
            const mailData = notification.toMail();
            const payload: NotificationPayload = {
              type: eventType as NotificationType,
              title: mailData.subject,
              body: mailData.body,
              metadata: {},
              recipientIds: recipientsForChannel,
            };
            promises.push(this.emailChannel.send(recipientsForChannel, payload));
          }
          break;
        }
        case 'SLACK': {
          if (notification.toSlack) {
            const slackData = notification.toSlack();
            const payload: NotificationPayload = {
              type: eventType as NotificationType,
              title: slackData.text,
              body: slackData.text,
              metadata: {},
              recipientIds: userIds,
            };
            promises.push(this.slackChannel.send(orgId, payload));
          }
          break;
        }
        case 'SMS': {
          if (this.smsChannel) {
            promises.push(this.smsChannel.send(recipientsForChannel, notification));
          }
          break;
        }
        case 'PUSH': {
          if (this.pushChannel) {
            promises.push(this.pushChannel.send(recipientsForChannel, notification));
          }
          break;
        }
        case 'WEBHOOK_CHANNEL': {
          if (this.webhookChannel) {
            promises.push(this.webhookChannel.send(orgId, notification));
          }
          break;
        }
      }
    }

    // Fire all channels in parallel -- failures in one don't block others
    await Promise.allSettled(promises);
  }

  /**
   * Get disabled notification preferences for a set of users and event type.
   */
  private async getDisabledPreferences(
    orgId: string,
    userIds: string[],
    eventType: string
  ) {
    if (userIds.length === 0) return [];

    return this.db
      .select()
      .from(notificationPreferences)
      .where(
        and(
          eq(notificationPreferences.orgId, orgId),
          eq(notificationPreferences.eventType, eventType),
          eq(notificationPreferences.enabled, false),
          sql`${notificationPreferences.userId} IN (${sql.join(userIds.map(id => sql`${id}`), sql`, `)})`
        )
      );
  }

  /**
   * Get paginated notifications for a user in an org.
   * Returns notifications and total unread count.
   */
  async getNotifications(
    userId: string,
    orgId: string,
    cursor?: string,
    limit: number = 20,
    unreadOnly: boolean = false
  ) {
    const conditions = [
      eq(notifications.userId, userId),
      eq(notifications.orgId, orgId),
    ];

    if (unreadOnly) {
      conditions.push(eq(notifications.isRead, false));
    }

    if (cursor) {
      conditions.push(lt(notifications.createdAt, cursor));
    }

    const items = await this.db
      .select()
      .from(notifications)
      .where(and(...conditions))
      .orderBy(desc(notifications.createdAt))
      .limit(limit + 1);

    const hasMore = items.length > limit;
    const results = hasMore ? items.slice(0, limit) : items;
    const nextCursor = hasMore ? results[results.length - 1].createdAt : undefined;

    // Get unread count
    const [countResult] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, userId),
          eq(notifications.orgId, orgId),
          eq(notifications.isRead, false)
        )
      );

    return {
      items: results,
      unreadCount: countResult?.count ?? 0,
      nextCursor,
      hasMore,
    };
  }

  /**
   * Get unread notification count for a user in an org.
   */
  async getUnreadCount(userId: string, orgId: string): Promise<number> {
    const [result] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, userId),
          eq(notifications.orgId, orgId),
          eq(notifications.isRead, false)
        )
      );

    return result?.count ?? 0;
  }

  /**
   * Mark specific notifications as read.
   */
  async markRead(userId: string, notificationIds: string[]): Promise<void> {
    if (notificationIds.length === 0) return;

    const now = new Date().toISOString();

    // Mark each individually to ensure userId ownership
    for (const id of notificationIds) {
      await this.db
        .update(notifications)
        .set({ isRead: true, readAt: now })
        .where(
          and(
            eq(notifications.id, id),
            eq(notifications.userId, userId)
          )
        );
    }
  }

  /**
   * Mark all notifications as read for a user in an org.
   */
  async markAllRead(userId: string, orgId: string): Promise<void> {
    const now = new Date().toISOString();

    await this.db
      .update(notifications)
      .set({ isRead: true, readAt: now })
      .where(
        and(
          eq(notifications.userId, userId),
          eq(notifications.orgId, orgId),
          eq(notifications.isRead, false)
        )
      );
  }

  // ==========================================================================
  // Slack Configuration Management
  // ==========================================================================

  /**
   * Configure Slack integration for an org (upsert).
   */
  async configureSlack(
    orgId: string,
    webhookUrl: string,
    channelName: string | undefined,
    createdBy: string
  ) {
    const now = new Date().toISOString();

    // Check if connection exists
    const [existing] = await this.db
      .select()
      .from(slackConnections)
      .where(eq(slackConnections.orgId, orgId))
      .limit(1);

    if (existing) {
      await this.db
        .update(slackConnections)
        .set({
          webhookUrl,
          channelName: channelName || existing.channelName,
          isActive: true,
          updatedAt: now,
        })
        .where(eq(slackConnections.id, existing.id));
      return { ...existing, webhookUrl, isActive: true, updatedAt: now };
    }

    const [created] = await this.db
      .insert(slackConnections)
      .values({
        orgId,
        webhookUrl,
        channelName: channelName || null,
        isActive: true,
        createdBy,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return created;
  }

  /**
   * Get Slack connection configuration for an org.
   */
  async getSlackConfig(orgId: string) {
    const [connection] = await this.db
      .select({
        id: slackConnections.id,
        channelName: slackConnections.channelName,
        isActive: slackConnections.isActive,
        createdAt: slackConnections.createdAt,
        updatedAt: slackConnections.updatedAt,
      })
      .from(slackConnections)
      .where(eq(slackConnections.orgId, orgId))
      .limit(1);

    return connection || null;
  }

  // ==========================================================================
  // Notification Preferences (opt-out model)
  // ==========================================================================

  /**
   * Get all notification preferences for a user in an org.
   * Returns explicit preferences (opt-outs). Absence means enabled (default).
   */
  async getPreferences(userId: string, orgId: string): Promise<NotificationPreferenceSetting[]> {
    const prefs = await this.db
      .select({
        eventType: notificationPreferences.eventType,
        channel: notificationPreferences.channel,
        enabled: notificationPreferences.enabled,
      })
      .from(notificationPreferences)
      .where(
        and(
          eq(notificationPreferences.userId, userId),
          eq(notificationPreferences.orgId, orgId)
        )
      );

    return prefs.map(p => ({
      eventType: p.eventType,
      channel: p.channel,
      enabled: p.enabled,
    }));
  }

  /**
   * Update a single notification preference (upsert).
   * If enabled=true, the row can be deleted (opt-out model: absence = enabled).
   */
  async updatePreference(
    userId: string,
    orgId: string,
    eventType: string,
    channel: string,
    enabled: boolean
  ): Promise<void> {
    const now = new Date().toISOString();

    // Check if preference exists
    const [existing] = await this.db
      .select()
      .from(notificationPreferences)
      .where(
        and(
          eq(notificationPreferences.userId, userId),
          eq(notificationPreferences.orgId, orgId),
          eq(notificationPreferences.eventType, eventType),
          eq(notificationPreferences.channel, channel)
        )
      )
      .limit(1);

    if (existing) {
      if (enabled) {
        // Remove the opt-out record (default is enabled)
        await this.db
          .delete(notificationPreferences)
          .where(eq(notificationPreferences.id, existing.id));
      } else {
        // Update to disabled
        await this.db
          .update(notificationPreferences)
          .set({ enabled: false, updatedAt: now })
          .where(eq(notificationPreferences.id, existing.id));
      }
    } else if (!enabled) {
      // Only create record for opt-outs
      await this.db
        .insert(notificationPreferences)
        .values({
          userId,
          orgId,
          eventType,
          channel,
          enabled: false,
          createdAt: now,
          updatedAt: now,
        });
    }
    // If enabled=true and no existing record, no-op (default is enabled)
  }

  /**
   * Bulk update notification preferences (upsert multiple).
   */
  async bulkUpdatePreferences(
    userId: string,
    orgId: string,
    preferences: Array<{ eventType: string; channel: string; enabled: boolean }>
  ): Promise<void> {
    for (const pref of preferences) {
      await this.updatePreference(userId, orgId, pref.eventType, pref.channel, pref.enabled);
    }
  }

  /**
   * Check whether a specific notification should be sent to a user.
   * Opt-out model: returns true unless user has explicitly disabled.
   */
  async shouldNotify(
    userId: string,
    orgId: string,
    eventType: string,
    channel: string
  ): Promise<boolean> {
    const [pref] = await this.db
      .select()
      .from(notificationPreferences)
      .where(
        and(
          eq(notificationPreferences.userId, userId),
          eq(notificationPreferences.orgId, orgId),
          eq(notificationPreferences.eventType, eventType),
          eq(notificationPreferences.channel, channel),
          eq(notificationPreferences.enabled, false)
        )
      )
      .limit(1);

    // If no disabled preference found, notification is allowed
    return !pref;
  }
}
