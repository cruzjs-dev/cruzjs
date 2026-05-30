import { Injectable, Inject } from '@cruzjs/core/di';
import { eq, and } from 'drizzle-orm';
import {
  DRIZZLE,
  type DrizzleDatabase,
} from '@cruzjs/core/shared/database/drizzle.service';
import { slackConnections } from '../../database/schema';
import type { NotificationPayload } from '../notification.types';

/**
 * SlackChannel
 *
 * Sends notifications to Slack via incoming webhook using Block Kit format.
 * Each org can configure one Slack webhook for gate review notifications.
 */
@Injectable()
export class SlackChannel {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDatabase
  ) {}

  /**
   * Send a notification to the org's configured Slack channel.
   * Silently skips if no active Slack connection exists.
   */
  async send(orgId: string, payload: NotificationPayload): Promise<void> {
    // Look up active Slack connection for org
    const [connection] = await this.db
      .select()
      .from(slackConnections)
      .where(
        and(
          eq(slackConnections.orgId, orgId),
          eq(slackConnections.isActive, true)
        )
      )
      .limit(1);

    if (!connection) {
      // No active Slack connection -- skip silently
      return;
    }

    // Build Block Kit message
    const blocks: unknown[] = [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*${payload.title}*\n${payload.body}`,
        },
      },
    ];

    // Add metadata fields if present
    const metadataEntries = Object.entries(payload.metadata);
    if (metadataEntries.length > 0) {
      blocks.push({
        type: 'section',
        fields: metadataEntries.map(([key, value]) => ({
          type: 'mrkdwn',
          text: `*${key}*\n${value}`,
        })),
      });
    }

    // Add action button if link URL present
    if (payload.linkUrl) {
      blocks.push({
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: { type: 'plain_text', text: 'Review in App' },
            url: payload.linkUrl,
          },
        ],
      });
    }

    const slackPayload = {
      text: payload.title, // Fallback for non-Block Kit clients
      blocks,
    };

    try {
      const response = await fetch(connection.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(slackPayload),
      });

      if (response.status === 429) {
        console.warn(
          `[SlackChannel] Rate limited for org ${orgId}. Notification dropped.`
        );
        return;
      }

      if (!response.ok) {
        const text = await response.text().catch(() => 'unknown');
        console.error(
          `[SlackChannel] Failed to send to org ${orgId}: ${response.status} - ${text}`
        );
      }
    } catch (error) {
      console.error(
        `[SlackChannel] Network error for org ${orgId}:`,
        error instanceof Error ? error.message : error
      );
    }
  }

  /**
   * Send a test message to verify the webhook is working.
   */
  async sendTest(orgId: string): Promise<{ success: boolean; error?: string }> {
    const [connection] = await this.db
      .select()
      .from(slackConnections)
      .where(
        and(
          eq(slackConnections.orgId, orgId),
          eq(slackConnections.isActive, true)
        )
      )
      .limit(1);

    if (!connection) {
      return { success: false, error: 'No active Slack connection configured' };
    }

    try {
      const response = await fetch(connection.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: 'Test notification',
          blocks: [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: 'Slack integration test successful!',
              },
            },
          ],
        }),
      });

      if (!response.ok) {
        const text = await response.text().catch(() => 'unknown');
        return { success: false, error: `Slack returned ${response.status}: ${text}` };
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
      };
    }
  }
}
