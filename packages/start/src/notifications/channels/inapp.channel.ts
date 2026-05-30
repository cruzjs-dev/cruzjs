import { Injectable, Inject } from '@cruzjs/core/di';
import {
  DRIZZLE,
  type DrizzleDatabase,
} from '@cruzjs/core/shared/database/drizzle.service';
import { notifications } from '../../database/schema';
import type { NotificationPayload } from '../notification.types';

/**
 * InAppChannel
 *
 * Stores notifications in the D1 notifications table for in-app display.
 * Uses db.batch() to minimize D1 writes when notifying multiple recipients.
 */
@Injectable()
export class InAppChannel {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDatabase
  ) {}

  /**
   * Store in-app notifications for all recipients.
   * Uses db.batch() for efficient multi-row insert.
   */
  async send(
    orgId: string,
    recipientIds: string[],
    payload: NotificationPayload
  ): Promise<void> {
    if (recipientIds.length === 0) return;

    const now = new Date().toISOString();

    // Build insert statements for batch execution
    const insertStatements = recipientIds.map((userId) =>
      this.db.insert(notifications).values({
        orgId,
        userId,
        type: payload.type,
        title: payload.title,
        body: payload.body || null,
        linkUrl: payload.linkUrl || null,
        metadata: JSON.stringify(payload.metadata),
        isRead: false,
        createdAt: now,
      })
    );

    try {
      if (insertStatements.length === 1) {
        // Single insert -- no need for batch
        await insertStatements[0];
      } else {
        // Batch insert to minimize D1 writes
        await (this.db as any).batch(insertStatements);
      }
    } catch (error) {
      console.error(
        '[InAppChannel] Failed to store notifications:',
        error instanceof Error ? error.message : error
      );
    }
  }
}
