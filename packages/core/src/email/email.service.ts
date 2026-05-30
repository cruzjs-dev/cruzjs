import { createToken } from '../di';
import { EmailSendService } from '../shared/cloudflare';
import { ConfigService } from '../shared/config/config.service';
import { inject, injectable, optional } from 'inversify';
import { EmailLogService } from './email-log.service';
import type { EmailLog } from '../database/schema';
import {
  EmailTemplate,
  EmailTemplateData,
  EmailTemplateService,
} from './template.service';
import { JobService } from '../jobs/job.service';
import { SEND_EMAIL_JOB_TYPE, type SendEmailJobPayload } from '../jobs/job.types';

/**
 * Injection token for EmailService
 */
export const EMAIL_SERVICE = createToken<EmailService>('EmailService');

/**
 * Email sending service with retry logic
 */
@injectable()
export class EmailService {
  private maxRetries = 3;
  private retryDelay = 1000; // 1 second base delay

  constructor(
    @inject(EmailSendService) private readonly emailSendService: EmailSendService,
    @inject(EmailTemplateService)
    private readonly emailTemplateService: EmailTemplateService,
    @inject(EmailLogService) private readonly emailLogService: EmailLogService,
    @inject(ConfigService) private readonly configService: ConfigService,
    @optional() @inject(JobService) private readonly jobService?: JobService
  ) {}

  /**
   * Send email with retry logic
   * @param to - Recipient email address
   * @param subject - Email subject
   * @param html - HTML content
   * @param text - Plain text content (optional)
   * @returns Message ID
   */
  async sendEmail(
    to: string,
    subject: string,
    html: string,
    text?: string,
    template?: string,
    metadata?: Record<string, unknown>,
    from?: string,
    _cc?: string,
    options?: { queue?: boolean }
  ): Promise<string> {
    if (options?.queue && this.jobService) {
      const payload: SendEmailJobPayload = { to, subject, html, text, template, metadata };
      await this.jobService.createJob({ type: SEND_EMAIL_JOB_TYPE, payload: payload as unknown as Record<string, unknown> });
      return 'queued';
    }

    // Get from address from config if not provided
    const emailFrom =
      from || this.configService.getOrThrow<string>('EMAIL_FROM');

    // Create email log entry
    const log = await this.emailLogService.createLog({
      to,
      from: emailFrom,
      cc: _cc || undefined,
      subject,
      template,
      metadata,
    });

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const messageId = await this.emailSendService.sendEmail(
          to,
          subject,
          html,
          text,
          emailFrom
        );

        // Update log with success
        await this.emailLogService.updateLog(log.id, {
          status: 'SENT',
          messageId,
        });

        return messageId;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');

        if (attempt < this.maxRetries) {
          // Exponential backoff
          const delay = this.retryDelay * Math.pow(2, attempt - 1);
          await this.sleep(delay);
          continue;
        }
      }
    }

    // Update log with failure
    await this.emailLogService.updateLog(log.id, {
      status: 'FAILED',
      error: lastError?.message || 'Unknown error',
    });

    // Log failure after all retries
    console.error(
      `Failed to send email to ${to} after ${this.maxRetries} attempts:`,
      lastError
    );
    throw lastError || new Error('Failed to send email');
  }

  /**
   * Send bulk email with retry logic
   * @param recipients - Array of recipient email addresses
   * @param subject - Email subject
   * @param html - HTML content
   * @param text - Plain text content (optional)
   * @returns Results with success/failure for each recipient
   */
  async sendBulkEmail(
    recipients: string[],
    subject: string,
    html: string,
    text?: string,
    template?: string,
    metadata?: Record<string, unknown>,
    from?: string,
    cc?: string
  ): Promise<{
    success: string[];
    failed: Array<{ email: string; error: string }>;
  }> {
    // Get from address from config if not provided
    const emailFrom =
      from || this.configService.getOrThrow<string>('EMAIL_FROM');

    // Create email log entries for all recipients
    const logs = await Promise.all(
      recipients.map((to) =>
        this.emailLogService.createLog({
          to,
          from: emailFrom,
          cc: cc || undefined,
          subject,
          template,
          metadata,
        })
      )
    );

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const result = await this.emailSendService.sendBulkEmail(
          recipients,
          subject,
          html,
          text,
          emailFrom
        );

        // Update logs based on results
        await Promise.all(
          logs.map(async (log: EmailLog, index: number) => {
            const recipient = recipients[index];
            const successEntry = result.success.find((s: string) => s === recipient);
            const failedEntry = result.failed.find(
              (f: { email: string; error: string }) => f.email === recipient
            );

            if (successEntry) {
              await this.emailLogService.updateLog(log.id, {
                status: 'SENT',
                messageId: undefined, // Bulk sends don't return individual message IDs
              });
            } else if (failedEntry) {
              await this.emailLogService.updateLog(log.id, {
                status: 'FAILED',
                error: failedEntry.error,
              });
            }
          })
        );

        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');

        if (attempt < this.maxRetries) {
          // Exponential backoff
          const delay = this.retryDelay * Math.pow(2, attempt - 1);
          await this.sleep(delay);
          continue;
        }
      }
    }

    // Update all logs as failed
    await Promise.all(
      logs.map((log: EmailLog) =>
        this.emailLogService.updateLog(log.id, {
          status: 'FAILED',
          error: lastError?.message || 'Unknown error',
        })
      )
    );

    // Log failure after all retries
    console.error(
      `Failed to send bulk email after ${this.maxRetries} attempts:`,
      lastError
    );

    // Return all as failed if bulk send completely fails
    return {
      success: [],
      failed: recipients.map((email) => ({
        email,
        error: lastError?.message || 'Unknown error',
      })),
    };
  }

  /**
   * Send email using template
   * @param to - Recipient email address
   * @param template - Template name
   * @param data - Template data
   * @returns Message ID
   */
  async sendTemplatedEmail<T extends EmailTemplate>(
    to: string,
    template: T,
    data: EmailTemplateData[T],
    options?: { queue?: boolean }
  ): Promise<string> {
    const { html, text } = await this.emailTemplateService.renderTemplate(
      template,
      data
    );
    const subject = this.emailTemplateService.getSubject(template, data as Record<string, unknown>);

    return this.sendEmail(
      to,
      subject,
      html,
      text,
      template,
      data as Record<string, unknown>,
      undefined,
      undefined,
      options
    );
  }

  /**
   * Sleep utility for retry delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
