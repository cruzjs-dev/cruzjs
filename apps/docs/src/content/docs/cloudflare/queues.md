---
title: Queues
description: Using Cloudflare Queues for asynchronous message processing with producers and consumers in CruzJS.
---

Cloudflare Queues enable asynchronous message processing. Your CruzJS application sends messages to a queue (producer), and a standalone Worker processes them (consumer). Queues guarantee at-least-once delivery with configurable retries.

## Architecture

```
Main App (Pages)          Queue              Consumer (Worker)
     |                      |                      |
     |--- send message ---->|                      |
     |                      |--- deliver batch --->|
     |                      |                      |--- process
     |                      |<-- ack/retry --------|
```

## Sending Messages (Producer)

From your CruzJS application, send messages using `CloudflareContext.getQueue()`:

```typescript
import { injectable } from 'inversify';
import { CloudflareContext } from '@cruzjs/core/shared/cloudflare/context';

type EmailMessage = {
  to: string;
  subject: string;
  template: string;
  data: Record<string, unknown>;
};

@injectable()
export class QueueService {
  /**
   * Send a message to a queue
   */
  async send<T>(bindingName: string, message: T): Promise<void> {
    const queue = CloudflareContext.getQueue<T>(bindingName);
    if (!queue) {
      console.warn(`Queue binding '${bindingName}' not available`);
      return;
    }

    await queue.send(message);
  }

  /**
   * Send a batch of messages
   */
  async sendBatch<T>(bindingName: string, messages: T[]): Promise<void> {
    const queue = CloudflareContext.getQueue<T>(bindingName);
    if (!queue) {
      console.warn(`Queue binding '${bindingName}' not available`);
      return;
    }

    await queue.sendBatch(
      messages.map(body => ({ body }))
    );
  }
}
```

Use it in your tRPC routers or services:

```typescript
// In a tRPC router
export const notificationRouter = router({
  sendBulkNotification: orgProcedure
    .input(z.object({
      subject: z.string(),
      template: z.string(),
      recipientIds: z.array(z.string()),
    }))
    .mutation(async ({ ctx, input }) => {
      const queueService = ctx.container.get(QueueService);
      const members = await ctx.container.get(MemberService)
        .listMembers(ctx.org.orgId);

      const messages: EmailMessage[] = members
        .filter(m => input.recipientIds.includes(m.userId))
        .map(m => ({
          to: m.user.email,
          subject: input.subject,
          template: input.template,
          data: { name: m.user.name },
        }));

      await queueService.sendBatch('EMAIL_QUEUE', messages);

      return { queued: messages.length };
    }),
});
```

## Creating a Consumer

Scaffold a queue consumer Worker:

```bash
cruz new queue-worker email-sender --queue EMAIL_QUEUE
```

This creates `external-processes/email-sender/`:

```typescript
// external-processes/email-sender/src/index.ts
export interface Env {
  DB: D1Database;
  RESEND_API_KEY: string;
}

type EmailMessage = {
  to: string;
  subject: string;
  template: string;
  data: Record<string, unknown>;
};

export default {
  /**
   * Queue consumer handler
   * Receives batches of messages from the queue
   */
  async queue(
    batch: MessageBatch<EmailMessage>,
    env: Env,
    ctx: ExecutionContext
  ): Promise<void> {
    console.log(`Processing batch of ${batch.messages.length} messages`);

    for (const message of batch.messages) {
      try {
        await sendEmail(message.body, env);
        message.ack(); // Mark as successfully processed
      } catch (error) {
        console.error(`Failed to send email to ${message.body.to}:`, error);
        message.retry(); // Re-queue for retry
      }
    }
  },

  // Optional: HTTP handler for health checks
  async fetch(request: Request, env: Env): Promise<Response> {
    return new Response('Email sender worker is running');
  },
};

async function sendEmail(email: EmailMessage, env: Env) {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'noreply@myapp.com',
      to: email.to,
      subject: email.subject,
      html: renderTemplate(email.template, email.data),
    }),
  });

  if (!response.ok) {
    throw new Error(`Resend API error: ${response.status}`);
  }
}

function renderTemplate(template: string, data: Record<string, unknown>): string {
  // Template rendering logic
  return `<h1>${data.name}</h1>`;
}
```

## Batch Processing

Queues deliver messages in batches for efficiency. Configure batch size and timing:

```toml
# external-processes/email-sender/wrangler.toml
name = "my-app-email-sender"
main = "src/index.ts"
compatibility_date = "2024-01-01"

[[queues.consumers]]
queue = "my-app-email-queue"
max_batch_size = 10          # Up to 10 messages per batch
max_batch_timeout = 5        # Wait up to 5 seconds to fill batch
max_retries = 3              # Retry failed messages up to 3 times
dead_letter_queue = "my-app-email-dlq"  # Send failed messages here

[vars]
RESEND_API_KEY = "re_xxx"
```

Process entire batches when individual message handling is not needed:

```typescript
async queue(batch: MessageBatch<DataRow>, env: Env): Promise<void> {
  // Process all messages at once (e.g., bulk database insert)
  const rows = batch.messages.map(m => m.body);

  try {
    await bulkInsert(rows, env);
    batch.ackAll(); // Acknowledge entire batch
  } catch (error) {
    batch.retryAll(); // Retry entire batch
  }
}
```

## Dead Letter Queues

Messages that fail all retries are sent to a dead letter queue (DLQ) for investigation:

```toml
# Main queue
[[queues.producers]]
binding = "EMAIL_QUEUE"
queue = "my-app-email-queue"

# Dead letter queue for failed messages
[[queues.producers]]
binding = "EMAIL_DLQ"
queue = "my-app-email-dlq"
```

Create a separate consumer for the DLQ to log, alert, or retry:

```typescript
export default {
  async queue(batch: MessageBatch<EmailMessage>, env: Env): Promise<void> {
    for (const message of batch.messages) {
      console.error('Dead letter message:', JSON.stringify(message.body));

      // Log to database for admin review
      await env.DB.prepare(
        'INSERT INTO FailedMessage (type, payload, createdAt) VALUES (?, ?, ?)'
      ).bind('email', JSON.stringify(message.body), new Date().toISOString()).run();

      message.ack();
    }
  },
};
```

## Queue Bindings in wrangler.toml

### Producer (Main App)

```toml
# apps/web/wrangler.toml (or generated by cruz.config.ts)
[[queues.producers]]
binding = "EMAIL_QUEUE"
queue = "my-app-email-queue"

[[queues.producers]]
binding = "IMPORT_QUEUE"
queue = "my-app-import-queue"
```

### Consumer (External Process)

```toml
# external-processes/email-sender/wrangler.toml
[[queues.consumers]]
queue = "my-app-email-queue"
max_batch_size = 10
max_batch_timeout = 5
max_retries = 3
dead_letter_queue = "my-app-email-dlq"
```

### Queue Management

```bash
# Create a queue
cruz queue create my-app-email-queue

# List all queues
cruz queue list

# Delete a queue
cruz queue delete my-app-email-queue
```

## Queue Limits

| Resource | Free | Paid |
|---|---|---|
| Messages/month | 1M | Included in Workers Paid |
| Max message size | 128 KB | 128 KB |
| Max batch size | 100 | 100 |
| Max retries | 100 | 100 |
| Message retention | 4 days | 4 days |

## Next Steps

- [Workflows](/cloudflare/workflows) -- Multi-step durable execution
- [Workers](/cloudflare/workers) -- Standalone background Workers
- [Background Jobs](/advanced/jobs) -- Built-in job queue system
