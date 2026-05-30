import type { BulkEmailResult } from '../shared/cloudflare/email-send.service';

export type SentEmail = {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
};

export type MailFake = {
  readonly sentEmails: SentEmail[];
  sendEmail(to: string, subject: string, html: string, text?: string, from?: string): Promise<string>;
  sendBulkEmail(recipients: string[], subject: string, html: string, text?: string, from?: string): Promise<BulkEmailResult>;
  assertSent(subjectPattern: string): void;
  assertSentTo(email: string): void;
  assertNotSent(): void;
  assertCount(n: number): void;
  clear(): void;
};

/**
 * Create an in-memory fake for the email send service. Use in unit tests to assert emails
 * were sent without an actual SMTP/API connection.
 *
 * @example
 * const mail = createMailFake();
 * container.rebind(EmailSendService).toConstantValue(mail);
 * await service.sendWelcomeEmail(user);
 * mail.assertSentTo(user.email);
 */
export function createMailFake(): MailFake {
  const sentEmails: SentEmail[] = [];

  return {
    get sentEmails() {
      return sentEmails;
    },

    async sendEmail(to, subject, html, text, from): Promise<string> {
      sentEmails.push({ to, subject, html, text, from });
      return `fake-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    },

    async sendBulkEmail(recipients, subject, html, text, from): Promise<BulkEmailResult> {
      for (const to of recipients) {
        sentEmails.push({ to, subject, html, text, from });
      }
      return { success: recipients, failed: [] };
    },

    assertSent(subjectPattern: string): void {
      const found = sentEmails.some(e => e.subject.includes(subjectPattern) || e.html.includes(subjectPattern));
      if (!found) {
        throw new Error(
          `Expected an email matching "${subjectPattern}" to be sent, but none was found. ` +
          `Sent emails: [${sentEmails.map(e => `"${e.subject}" to ${e.to}`).join(', ')}]`
        );
      }
    },

    assertSentTo(email: string): void {
      const found = sentEmails.some(e => e.to === email);
      if (!found) {
        throw new Error(
          `Expected an email to be sent to "${email}", but none was found. ` +
          `Recipients: [${sentEmails.map(e => e.to).join(', ')}]`
        );
      }
    },

    assertNotSent(): void {
      if (sentEmails.length > 0) {
        throw new Error(
          `Expected no emails to be sent, but ${sentEmails.length} was sent. ` +
          `Sent to: [${sentEmails.map(e => e.to).join(', ')}]`
        );
      }
    },

    assertCount(n: number): void {
      if (sentEmails.length !== n) {
        throw new Error(`Expected ${n} email(s) to be sent, but ${sentEmails.length} was sent.`);
      }
    },

    clear(): void {
      sentEmails.length = 0;
    },
  };
}
