import { Injectable, Inject } from '@cruzjs/core/di';
import { eq, inArray } from 'drizzle-orm';
import {
  DRIZZLE,
  type DrizzleDatabase,
} from '@cruzjs/core/shared/database/drizzle.service';
import { EmailService } from '@cruzjs/core/email/email.service';
import { authIdentity } from '../../database/schema';
import type { NotificationPayload } from '../notification.types';

/**
 * EmailChannel
 *
 * Sends notification emails to recipients using the existing EmailService.
 * Looks up recipient email addresses from authIdentity table.
 */
@Injectable()
export class EmailChannel {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDatabase,
    @Inject(EmailService) private readonly emailService: EmailService
  ) {}

  /**
   * Send notification emails to all recipients.
   * Silently skips recipients without valid email addresses.
   */
  async send(recipientIds: string[], payload: NotificationPayload): Promise<void> {
    if (recipientIds.length === 0) return;

    // Look up email addresses for all recipients
    const recipients = await this.db
      .select({ id: authIdentity.id, email: authIdentity.email })
      .from(authIdentity)
      .where(inArray(authIdentity.id, recipientIds));

    if (recipients.length === 0) return;

    // Build simple HTML email
    const html = this.buildEmailHtml(payload);
    const textContent = this.buildEmailText(payload);

    // Send to each recipient individually (EmailService handles retry)
    const emails = recipients.map((r) => r.email).filter(Boolean);
    if (emails.length === 0) return;

    try {
      if (emails.length === 1) {
        await this.emailService.sendEmail(
          emails[0],
          payload.title,
          html,
          textContent,
          'notification',
          { type: payload.type, linkUrl: payload.linkUrl }
        );
      } else {
        await this.emailService.sendBulkEmail(
          emails,
          payload.title,
          html,
          textContent,
          'notification',
          { type: payload.type, linkUrl: payload.linkUrl }
        );
      }
    } catch (error) {
      // Log but don't throw -- email failures should not block other channels
      console.error(
        '[EmailChannel] Failed to send notification email:',
        error instanceof Error ? error.message : error
      );
    }
  }

  /**
   * Build HTML email content for a notification.
   */
  private buildEmailHtml(payload: NotificationPayload): string {
    const metadataHtml = Object.entries(payload.metadata)
      .map(([key, value]) => `<p><strong>${this.escapeHtml(key)}:</strong> ${this.escapeHtml(value)}</p>`)
      .join('');

    const buttonHtml = payload.linkUrl
      ? `<p style="margin-top: 16px;">
          <a href="${this.escapeHtml(payload.linkUrl)}"
             style="display: inline-block; padding: 10px 20px; background-color: #4F46E5; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600;">
            View in App
          </a>
        </p>`
      : '';

    return `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #111827; margin-bottom: 8px;">${this.escapeHtml(payload.title)}</h2>
        <p style="color: #4B5563; line-height: 1.5;">${this.escapeHtml(payload.body)}</p>
        ${metadataHtml}
        ${buttonHtml}
        <hr style="border: none; border-top: 1px solid #E5E7EB; margin-top: 24px;" />
        <p style="color: #9CA3AF; font-size: 12px;">Sent by ${process.env.APP_NAME || 'CruzJS'}</p>
      </div>
    `;
  }

  /**
   * Build plain text email content.
   */
  private buildEmailText(payload: NotificationPayload): string {
    const metadataText = Object.entries(payload.metadata)
      .map(([key, value]) => `${key}: ${value}`)
      .join('\n');

    const parts = [payload.title, '', payload.body];
    if (metadataText) parts.push('', metadataText);
    if (payload.linkUrl) parts.push('', `View in App: ${payload.linkUrl}`);
    return parts.join('\n');
  }

  /**
   * Escape HTML special characters.
   */
  private escapeHtml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}
