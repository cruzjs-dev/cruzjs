import { Injectable, Inject } from '@cruzjs/core/di';
import { eq, and, inArray } from 'drizzle-orm';
import {
  DRIZZLE,
  type DrizzleDatabase,
} from '@cruzjs/core/shared/database/drizzle.service';
import { ConfigService } from '@cruzjs/core/shared/config/config.service';
import { pushSubscriptions } from '../../database/schema';
import type { NotificationBase } from '../notification.base';

/**
 * PushSubscription shape for Web Push API (VAPID).
 */
export type WebPushSubscription = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
};

/**
 * PushChannel
 *
 * Sends Web Push notifications using the VAPID protocol.
 * Manages push subscriptions stored in the PushSubscriptions table.
 *
 * Requires VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY env vars to be set.
 */
@Injectable()
export class PushChannel {
  constructor(
    @Inject(ConfigService) private readonly config: ConfigService,
    @Inject(DRIZZLE) private readonly db: DrizzleDatabase,
  ) {}

  /**
   * Send push notifications to all subscriptions for the given recipients.
   * Silently skips if the notification has no toPush() method or no VAPID keys are configured.
   */
  async send(recipientIds: string[], notification: NotificationBase): Promise<void> {
    if (!notification.toPush) {
      return;
    }

    const vapidPublicKey = this.config.get<string>('VAPID_PUBLIC_KEY');
    const vapidPrivateKey = this.config.get<string>('VAPID_PRIVATE_KEY');

    if (!vapidPublicKey || !vapidPrivateKey) {
      return;
    }

    if (recipientIds.length === 0) {
      return;
    }

    const data = notification.toPush();

    // Get all push subscriptions for the recipients
    const subscriptions = await this.db
      .select()
      .from(pushSubscriptions)
      .where(inArray(pushSubscriptions.userId, recipientIds));

    if (subscriptions.length === 0) {
      return;
    }

    const payload = JSON.stringify(data);

    for (const sub of subscriptions) {
      try {
        // Build the Web Push payload (VAPID auth)
        // In production this would use a web-push library or raw crypto.
        // For now, we use fetch with the push endpoint directly.
        await this.sendPushMessage(sub.endpoint, sub.p256dh, sub.auth, payload, vapidPublicKey, vapidPrivateKey);
      } catch (error) {
        // If subscription is expired/invalid (410 Gone), remove it
        if (error instanceof PushSubscriptionExpiredError) {
          await this.db
            .delete(pushSubscriptions)
            .where(eq(pushSubscriptions.id, sub.id));
        } else {
          console.error(
            `[PushChannel] Failed to send push to subscription ${sub.id}:`,
            error instanceof Error ? error.message : error,
          );
        }
      }
    }
  }

  /**
   * Register a push subscription for a user within an org.
   */
  async subscribe(userId: string, orgId: string, subscription: WebPushSubscription): Promise<void> {
    const now = new Date().toISOString();

    // Upsert: if endpoint already exists, update keys
    const [existing] = await this.db
      .select()
      .from(pushSubscriptions)
      .where(eq(pushSubscriptions.endpoint, subscription.endpoint))
      .limit(1);

    if (existing) {
      await this.db
        .update(pushSubscriptions)
        .set({
          userId,
          orgId,
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
        })
        .where(eq(pushSubscriptions.id, existing.id));
    } else {
      await this.db.insert(pushSubscriptions).values({
        userId,
        orgId,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        createdAt: now,
      });
    }
  }

  /**
   * Remove a push subscription by endpoint.
   */
  async unsubscribe(userId: string, endpoint: string): Promise<void> {
    await this.db
      .delete(pushSubscriptions)
      .where(
        and(
          eq(pushSubscriptions.userId, userId),
          eq(pushSubscriptions.endpoint, endpoint),
        ),
      );
  }

  /**
   * Get the VAPID public key (used by the client to subscribe).
   */
  getPublicKey(): string | undefined {
    return this.config.get<string>('VAPID_PUBLIC_KEY');
  }

  // ============================================================================
  // Private
  // ============================================================================

  /**
   * Send a push message to a subscription endpoint using VAPID.
   * This is a simplified implementation. In production, use the web-push protocol
   * with proper ECDH key exchange and JWT signing.
   */
  private async sendPushMessage(
    endpoint: string,
    _p256dh: string,
    _auth: string,
    payload: string,
    _vapidPublicKey: string,
    _vapidPrivateKey: string,
  ): Promise<void> {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'TTL': '86400',
      },
      body: payload,
    });

    if (response.status === 410 || response.status === 404) {
      throw new PushSubscriptionExpiredError(endpoint);
    }

    if (!response.ok) {
      const text = await response.text().catch(() => 'unknown');
      throw new Error(`Push endpoint returned ${response.status}: ${text}`);
    }
  }
}

/**
 * Error thrown when a push subscription has expired or been unsubscribed.
 */
class PushSubscriptionExpiredError extends Error {
  constructor(endpoint: string) {
    super(`Push subscription expired: ${endpoint}`);
    this.name = 'PushSubscriptionExpiredError';
  }
}
