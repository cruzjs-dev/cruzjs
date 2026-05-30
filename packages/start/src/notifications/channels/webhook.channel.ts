import { Injectable, Inject } from '@cruzjs/core/di';
import { eq, and, sql } from 'drizzle-orm';
import {
  DRIZZLE,
  type DrizzleDatabase,
} from '@cruzjs/core/shared/database/drizzle.service';
import type { NotificationBase } from '../notification.base';

/**
 * WebhookNotificationChannel
 *
 * Dispatches notification payloads to org-registered webhook endpoints.
 * Integrates with the webhooks table from @cruzjs/core if available.
 *
 * This channel looks for webhooks subscribed to notification events
 * and posts the notification's toWebhook() payload to each endpoint.
 */
@Injectable()
export class WebhookNotificationChannel {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDatabase,
  ) {}

  /**
   * Send a webhook notification for an org.
   * Looks up active webhooks that subscribe to 'notification.*' events
   * and posts the payload to each.
   */
  async send(orgId: string, notification: NotificationBase): Promise<void> {
    if (!notification.toWebhook) {
      return;
    }

    const data = notification.toWebhook();

    // Try to find webhooks table -- it may not exist if @cruzjs/core webhooks module isn't loaded
    try {
      const webhooks = await this.findActiveWebhooks(orgId);

      for (const webhook of webhooks) {
        try {
          await this.deliverWebhook(webhook.url, webhook.secret, data);
        } catch (error) {
          console.error(
            `[WebhookNotificationChannel] Failed to deliver to ${webhook.url}:`,
            error instanceof Error ? error.message : error,
          );
        }
      }
    } catch {
      // Webhooks table may not exist -- skip silently
    }
  }

  // ============================================================================
  // Private
  // ============================================================================

  /**
   * Find active webhooks for an org that subscribe to notification events.
   */
  private async findActiveWebhooks(orgId: string): Promise<Array<{ url: string; secret: string | null }>> {
    // Use raw SQL to query the webhooks table since it may or may not be in the schema.
    // This avoids a hard dependency on the webhooks module.
    const result = await this.db.all<{ url: string; secret: string | null }>(
      sql`SELECT url, secret FROM Webhook WHERE orgId = ${orgId} AND isActive = 1 AND events LIKE '%notification%'` as any,
    );

    return result ?? [];
  }

  /**
   * Deliver a webhook payload with HMAC-SHA256 signature if a secret is configured.
   */
  private async deliverWebhook(
    url: string,
    secret: string | null,
    data: Record<string, unknown>,
  ): Promise<void> {
    const body = JSON.stringify(data);
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (secret) {
      const signature = await this.signPayload(body, secret);
      headers['X-Webhook-Signature'] = signature;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body,
    });

    if (!response.ok) {
      const text = await response.text().catch(() => 'unknown');
      throw new Error(`Webhook returned ${response.status}: ${text}`);
    }
  }

  /**
   * Sign a payload with HMAC-SHA256 using the webhook secret.
   */
  private async signPayload(payload: string, secret: string): Promise<string> {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign'],
    );
    const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
    return `sha256=${Array.from(new Uint8Array(signature)).map(b => b.toString(16).padStart(2, '0')).join('')}`;
  }
}
