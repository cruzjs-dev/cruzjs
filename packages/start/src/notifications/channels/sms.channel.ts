import { Injectable, Inject, Optional } from '@cruzjs/core/di';
import { eq, inArray } from 'drizzle-orm';
import {
  DRIZZLE,
  type DrizzleDatabase,
} from '@cruzjs/core/shared/database/drizzle.service';
import { userProfile } from '../../database/schema';
import type { NotificationBase } from '../notification.base';
import { SMS_ADAPTER, type SmsAdapter } from '../adapters/sms.adapter';

/**
 * SmsChannel
 *
 * Sends SMS notifications via an injected SmsAdapter.
 * Looks up phone numbers from the UserProfile table.
 * Silently skips if no adapter is bound or if the notification has no toSms() method.
 */
@Injectable()
export class SmsChannel {
  constructor(
    @Inject(SMS_ADAPTER) @Optional() private readonly adapter: SmsAdapter | null,
    @Inject(DRIZZLE) private readonly db: DrizzleDatabase,
  ) {}

  /**
   * Send SMS to all recipients who have a phone number on file.
   */
  async send(recipientIds: string[], notification: NotificationBase): Promise<void> {
    if (!this.adapter || !notification.toSms) {
      return;
    }

    const data = notification.toSms();
    if (recipientIds.length === 0) {
      return;
    }

    // Look up phone numbers from user profiles
    const profiles = await this.db
      .select({ userId: userProfile.userId, phoneNumber: userProfile.phoneNumber })
      .from(userProfile)
      .where(inArray(userProfile.userId, recipientIds));

    for (const profile of profiles) {
      if (!profile.phoneNumber) {
        continue;
      }

      try {
        await this.adapter.send(profile.phoneNumber, data.body);
      } catch (error) {
        console.error(
          `[SmsChannel] Failed to send SMS to user ${profile.userId}:`,
          error instanceof Error ? error.message : error,
        );
      }
    }
  }
}
