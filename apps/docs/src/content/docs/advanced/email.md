---
title: Email
description: Send transactional emails with CruzJS — configure email providers (MailChannels, Resend, Mailgun), use templates, and queue emails via background jobs.
---

CruzJS provides an `EmailService` for sending transactional emails with template support, retry logic, and logging. It supports multiple email providers optimized for Cloudflare Workers, including MailChannels (free via Cloudflare Workers), Resend, and Mailgun.

## Email Providers

| Provider | Cost | Setup | Best For |
|----------|------|-------|----------|
| MailChannels | Free (via CF Workers) | DNS records only | Production on Cloudflare |
| Resend | Free tier available | API key | Simple setup, good DX |
| Mailgun | Pay-as-you-go | API key + domain | High volume |
| Console | Free | None | Local development |

In development, emails are logged to the console by default. No email provider configuration is needed for local dev.

## Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `EMAIL_PROVIDER` | Provider name: `mailchannels`, `resend`, `mailgun`, or `console` | No (defaults to `console`) |
| `EMAIL_FROM` | Default sender address (e.g., `noreply@myapp.com`) | Yes (for sending) |
| `EMAIL_FROM_NAME` | Default sender name | No |
| `EMAIL_API_KEY` | API key for Resend or Mailgun | For Resend/Mailgun |
| `MAILGUN_DOMAIN` | Mailgun sending domain | For Mailgun |
| `DKIM_DOMAIN` | DKIM signing domain (MailChannels) | No |
| `DKIM_SELECTOR` | DKIM selector (defaults to `mailchannels`) | No |
| `DKIM_PRIVATE_KEY` | DKIM private key for signing | No |

### MailChannels Setup

MailChannels is free when called from Cloudflare Workers. It requires DNS configuration but no API key:

1. Add an SPF record to your domain:
   ```
   v=spf1 a mx include:relay.mailchannels.net ~all
   ```

2. Add a Domain Lockdown TXT record:
   ```
   _mailchannels.yourdomain.com  TXT  "v=mc1 cfid=your-account-id"
   ```

3. (Optional) Add DKIM for better deliverability by setting `DKIM_DOMAIN`, `DKIM_SELECTOR`, and `DKIM_PRIVATE_KEY`.

### Resend Setup

```bash
cruz secrets set EMAIL_PROVIDER resend
cruz secrets set EMAIL_API_KEY re_your_api_key
cruz secrets set EMAIL_FROM noreply@myapp.com
```

### Mailgun Setup

```bash
cruz secrets set EMAIL_PROVIDER mailgun
cruz secrets set EMAIL_API_KEY your-mailgun-key
cruz secrets set MAILGUN_DOMAIN mg.myapp.com
cruz secrets set EMAIL_FROM noreply@myapp.com
```

## Sending Emails

### Direct HTML Email

```typescript
import { Injectable, Inject } from '@cruzjs/core/di';
import { EmailService } from '@cruzjs/core/email/email.service';

@Injectable()
export class NotificationService {
  constructor(
    @Inject(EmailService) private readonly emailService: EmailService,
  ) {}

  async sendWelcome(email: string, name: string) {
    await this.emailService.sendEmail(
      email,                         // to
      'Welcome to MyApp!',           // subject
      `<h1>Welcome, ${name}!</h1>
       <p>Your account has been created.</p>`,  // html
      `Welcome, ${name}! Your account has been created.`,  // text (optional)
    );
  }
}
```

### Templated Email

Use the template system for consistent, maintainable emails:

```typescript
await this.emailService.sendTemplatedEmail(
  'user@example.com',
  'welcome',              // template name
  { userName: 'Jane' },   // template data
);
```

The `EmailTemplateService` renders the template to HTML and text, and provides the subject line. Templates are registered in the `EmailTemplateService`.

### Bulk Email

Send to multiple recipients with automatic per-recipient error handling:

```typescript
const result = await this.emailService.sendBulkEmail(
  ['user1@example.com', 'user2@example.com', 'user3@example.com'],
  'Weekly Update',
  '<h1>This week at MyApp</h1>...',
  'This week at MyApp...',
);

console.log(`Sent: ${result.success.length}`);
console.log(`Failed: ${result.failed.length}`);
for (const failure of result.failed) {
  console.error(`${failure.email}: ${failure.error}`);
}
```

## Sending Emails via Background Jobs

For non-blocking email delivery, dispatch emails as background jobs using the built-in `SendEmailJobHandler`:

```typescript
import { Injectable, Inject } from '@cruzjs/core/di';
import { JobService, JobPriority } from '@cruzjs/core';

@Injectable()
export class InvoiceService {
  constructor(
    @Inject(JobService) private readonly jobService: JobService,
  ) {}

  async sendInvoiceEmail(userEmail: string, invoiceId: string) {
    await this.jobService.createJob({
      type: 'send-email',
      payload: {
        to: userEmail,
        template: 'invoice-created',
        data: { invoiceId },
      },
      priority: JobPriority.HIGH,
      lookupKey: `invoice-${invoiceId}`,
    });
  }
}
```

The `SendEmailJobHandler` processes these jobs asynchronously. If email is not configured, the job completes successfully with a warning rather than failing — it will not block other job processing.

## Email Logging

Every email sent through `EmailService` is logged in the database via `EmailLogService`. Each log entry tracks:

- Recipient, sender, and subject
- Template name and metadata
- Status (`SENT` or `FAILED`)
- Message ID from the email provider
- Error message on failure

This provides an audit trail for debugging delivery issues.

## Retry Logic

`EmailService` includes built-in retry with exponential backoff:

- **Max retries:** 3 attempts
- **Base delay:** 1 second
- **Backoff:** Exponential (1s, 2s, 4s)

If all retries fail, the email log is updated with the error and the failure is logged. When sending via background jobs, the job system provides an additional retry layer.

## Best Practices

1. **Use MailChannels for production on Cloudflare.** It is free, requires no API key, and is optimized for the Workers runtime. Set up DKIM for improved deliverability.

2. **Send non-critical emails via background jobs.** Use `JobService.createJob({ type: 'send-email', ... })` so email delivery does not block HTTP responses.

3. **Always provide a plain text fallback.** Pass both `html` and `text` parameters. Some email clients strip HTML, and plain text improves spam scoring.

4. **Use templates for repeated emails.** Templates ensure consistent formatting and make it easy to update email content without changing service code.

5. **Monitor email logs.** Check the email log table or admin dashboard for delivery failures. MailChannels returns 202 Accepted but may still fail downstream.
