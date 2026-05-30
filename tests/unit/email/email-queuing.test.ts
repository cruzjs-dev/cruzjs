import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EmailService } from '@cruzjs/core/email/email.service';
import { EmailTemplateRegistry } from '@cruzjs/core/email/email-template.registry';
import { EmailTemplateService } from '@cruzjs/core/email/template.service';
import { SEND_EMAIL_JOB_TYPE } from '@cruzjs/core/jobs/job.types';

function makeEmailService(jobService?: { createJob: ReturnType<typeof vi.fn> }) {
  const registry = new EmailTemplateRegistry();
  const templateService = new EmailTemplateService(registry);

  const emailSendService = { sendEmail: vi.fn().mockResolvedValue('msg-id'), sendBulkEmail: vi.fn() };
  const emailLogService = {
    createLog: vi.fn().mockResolvedValue({ id: 'log-1' }),
    updateLog: vi.fn().mockResolvedValue(undefined),
  };
  const configService = { get: vi.fn(), getOrThrow: vi.fn().mockReturnValue('no-reply@example.com') };

  // EmailService constructor: emailSendService, templateService, emailLogService, configService, jobService?
  const service = new (EmailService as unknown as new (...args: unknown[]) => EmailService)(
    emailSendService,
    templateService,
    emailLogService,
    configService,
    jobService
  );

  return { service, emailSendService, emailLogService, configService };
}

describe('EmailService queue option', () => {
  it('dispatches SEND_EMAIL job when queue: true and jobService is available', async () => {
    const createJob = vi.fn().mockResolvedValue({ id: 'job-1' });
    const { service } = makeEmailService({ createJob });

    const result = await service.sendEmail(
      'user@example.com',
      'Hello',
      '<p>Hi</p>',
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      { queue: true }
    );

    expect(result).toBe('queued');
    expect(createJob).toHaveBeenCalledOnce();
    expect(createJob).toHaveBeenCalledWith(
      expect.objectContaining({ type: SEND_EMAIL_JOB_TYPE })
    );
  });

  it('sends synchronously when queue: true but no jobService', async () => {
    const { service, emailSendService } = makeEmailService(undefined);

    const result = await service.sendEmail(
      'user@example.com',
      'Hello',
      '<p>Hi</p>',
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      { queue: true }
    );

    expect(result).toBe('msg-id');
    expect(emailSendService.sendEmail).toHaveBeenCalledOnce();
  });

  it('sends synchronously when queue option is omitted', async () => {
    const createJob = vi.fn();
    const { service, emailSendService } = makeEmailService({ createJob });

    await service.sendEmail('user@example.com', 'Hello', '<p>Hi</p>');

    expect(emailSendService.sendEmail).toHaveBeenCalledOnce();
    expect(createJob).not.toHaveBeenCalled();
  });

  it('dispatches job with correct payload for sendTemplatedEmail', async () => {
    const createJob = vi.fn().mockResolvedValue({ id: 'job-1' });
    const { service } = makeEmailService({ createJob });

    const result = await service.sendTemplatedEmail(
      'user@example.com',
      'welcome',
      { name: 'Kerry', email: 'user@example.com', loginUrl: 'https://app.example.com' },
      { queue: true }
    );

    expect(result).toBe('queued');
    expect(createJob).toHaveBeenCalledOnce();
    const call = createJob.mock.calls[0][0];
    expect(call.type).toBe(SEND_EMAIL_JOB_TYPE);
    expect(call.payload.to).toBe('user@example.com');
    expect(typeof call.payload.html).toBe('string');
    expect(call.payload.html.length).toBeGreaterThan(0);
  });
});
