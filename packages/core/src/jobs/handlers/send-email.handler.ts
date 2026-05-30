import type { Job } from '../../database/schema';
import { EmailService, EMAIL_SERVICE } from '../../email/email.service';
import { SEND_EMAIL_JOB_TYPE, type SendEmailJobPayload } from '../job.types';
import type { JobHandler, JobHandlerMetadata, JobResult } from '../job.types';
import { inject, injectable } from 'inversify';

@injectable()
export class SendEmailJobHandler implements JobHandler {
  readonly metadata: JobHandlerMetadata = {
    jobType: SEND_EMAIL_JOB_TYPE,
    statuses: ['PENDING'],
    description: 'Sends emails dispatched via queue',
  };

  constructor(
    @inject(EMAIL_SERVICE) private readonly emailService: EmailService
  ) {}

  async run(job: Job): Promise<JobResult> {
    const payload = job.payload as unknown as SendEmailJobPayload;
    const { to, subject, html, text, template, metadata } = payload;

    if (!to || !subject || !html) {
      return { success: false, error: 'Missing required fields: to, subject, html' };
    }

    try {
      await this.emailService.sendEmail(to, subject, html, text, template, metadata);
      return {
        success: true,
        summary: { to, template, sentAt: new Date().toISOString() },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to send email';
      return { success: false, error: message };
    }
  }
}
