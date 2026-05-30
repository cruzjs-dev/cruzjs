/**
 * Abstract Notification base class.
 *
 * Provides a class-based notification pattern where each notification type
 * declares which channels it should be sent on and how to render its content
 * for each channel. This is opt-in -- the existing string-based NotificationPayload
 * system continues to work unchanged.
 *
 * Usage:
 * ```typescript
 * class InvoicePaidNotification extends Notification {
 *   constructor(private readonly invoice: Invoice) { super(); }
 *
 *   via(): string[] { return ['IN_APP', 'EMAIL', 'SLACK']; }
 *
 *   toMail(): MailNotificationData {
 *     return { subject: 'Invoice Paid', body: `<p>Invoice #${this.invoice.number} was paid.</p>` };
 *   }
 *
 *   toDatabase(): DatabaseNotificationData {
 *     return { type: 'INVOICE_PAID', title: 'Invoice Paid', message: `Invoice #${this.invoice.number} was paid.` };
 *   }
 * }
 * ```
 */

export type MailNotificationData = {
  subject: string;
  body: string;
  text?: string;
};

export type SmsNotificationData = {
  body: string;
};

export type PushNotificationData = {
  title: string;
  body: string;
  icon?: string;
  url?: string;
  badge?: string;
};

export type SlackNotificationData = {
  text: string;
  blocks?: unknown[];
  attachments?: unknown[];
};

export type DatabaseNotificationData = {
  type: string;
  title: string;
  message: string;
  actionUrl?: string;
  metadata?: Record<string, unknown>;
};

export abstract class NotificationBase {
  /** Which channels to send on (e.g. ['IN_APP', 'EMAIL', 'SMS', 'SLACK', 'PUSH', 'WEBHOOK_CHANNEL']) */
  abstract via(): string[];

  /** Render for email channel (optional) */
  toMail?(): MailNotificationData;

  /** Render for SMS channel (optional) */
  toSms?(): SmsNotificationData;

  /** Render for Slack channel (optional) */
  toSlack?(): SlackNotificationData;

  /** Render for in-app database channel (optional) */
  toDatabase?(): DatabaseNotificationData;

  /** Render for push channel (optional) */
  toPush?(): PushNotificationData;

  /** Render for webhook channel (optional) */
  toWebhook?(): Record<string, unknown>;
}
