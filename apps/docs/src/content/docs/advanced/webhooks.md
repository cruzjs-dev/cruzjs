---
title: Webhooks
description: Outbound webhook management with HMAC signing, delivery logs, and automatic retries in CruzJS
---

CruzJS provides an outbound webhook system for notifying external services when events occur in your application. Webhooks are org-scoped, HMAC-signed, and include delivery logging with automatic retries.

## Setup

Register the `WebhookModule` in your application:

```typescript
// src/app.server.ts
import { registerModules } from '@cruzjs/core/framework/module-registry';
import { StartModule } from '@cruzjs/start/start.module';
import { WebhookModule } from '@cruzjs/core/webhooks';

registerModules([StartModule, WebhookModule]);
```

## Creating Webhooks

Each webhook has an endpoint URL, a signing secret, and a list of events it subscribes to:

```typescript
trpc.webhook.create.useMutation().mutate({
  url: 'https://example.com/webhooks/cruzjs',
  events: ['invoice.created', 'invoice.paid'],
});
```

The server generates a signing secret automatically and returns it in the response. Store this secret on the receiving end to verify webhook signatures.

## Dispatching Webhooks

Use `WebhookService.dispatch()` to send a webhook payload to all matching endpoints:

```typescript
import { Injectable, Inject } from '@cruzjs/core/di';
import { WebhookService } from '@cruzjs/core/webhooks';

@Injectable()
export class InvoiceService {
  constructor(
    @Inject(WebhookService) private readonly webhooks: WebhookService,
  ) {}

  async createInvoice(orgId: string, input: CreateInvoiceInput) {
    const invoice = await this.saveInvoice(input);

    await this.webhooks.dispatch('invoice.created', {
      id: invoice.id,
      amount: invoice.amount,
      currency: invoice.currency,
      createdAt: invoice.createdAt,
    }, orgId);

    return invoice;
  }
}
```

The `dispatch` method finds all webhooks in the org that subscribe to the given event name and sends an HTTP POST to each endpoint.

## HMAC-SHA256 Signing

Every webhook request includes an `X-Cruz-Signature` header containing an HMAC-SHA256 signature of the request body, signed with the webhook's secret:

```
X-Cruz-Signature: sha256=5d41402abc4b2a76b9719d911017c592
```

### Verifying on the Receiving End

```typescript
import { createHmac, timingSafeEqual } from 'crypto';

function verifyWebhookSignature(
  body: string,
  signature: string,
  secret: string,
): boolean {
  const expected = 'sha256=' + createHmac('sha256', secret)
    .update(body)
    .digest('hex');

  return timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected),
  );
}
```

:::caution
Always use timing-safe comparison to prevent timing attacks when verifying signatures.
:::

## Delivery Logs

Every webhook dispatch is logged with the response status, response body, and timestamp. View delivery history via tRPC:

```typescript
const { data: deliveries } = trpc.webhook.deliveries.useQuery({
  webhookId: 'wh_abc123',
});

// deliveries: [{ id, status, responseCode, responseBody, createdAt }, ...]
```

## Retry Logic

Failed deliveries (non-2xx responses or network errors) are retried with exponential backoff:

| Attempt | Delay |
|---------|-------|
| 1st retry | 1 minute |
| 2nd retry | 5 minutes |
| 3rd retry | 30 minutes |
| 4th retry | 2 hours |

After all retries are exhausted, the delivery is marked as failed in the delivery log.

## Testing Webhooks

Send a test payload to verify your endpoint is configured correctly:

```typescript
trpc.webhook.test.useMutation().mutate({
  webhookId: 'wh_abc123',
});
```

This sends a `webhook.test` event with a sample payload and returns the response status.

## tRPC Procedures

All procedures are org-scoped.

| Procedure | Type | Description |
|-----------|------|-------------|
| `webhook.list` | query | List all webhooks for the current org |
| `webhook.create` | mutation | Create a new webhook endpoint |
| `webhook.update` | mutation | Update URL or subscribed events |
| `webhook.delete` | mutation | Delete a webhook |
| `webhook.test` | mutation | Send a test event to a webhook |
| `webhook.deliveries` | query | View delivery logs for a webhook |

## Example: Domain Event Integration

Combine webhooks with domain events to automatically notify external systems:

```typescript
import { Module } from '@cruzjs/core/di';
import { InvoiceCreatedEvent } from './events';
import { getAppContainer } from '@cruzjs/core';
import { WebhookService } from '@cruzjs/core/webhooks';

async function dispatchInvoiceWebhook(event: InvoiceCreatedEvent) {
  const container = await getAppContainer();
  const webhooks = container.resolve(WebhookService);
  await webhooks.dispatch('invoice.created', {
    invoiceId: event.invoiceId,
    amount: event.amount,
    currency: event.currency,
  }, event.orgId);
}

@Module({
  events: [
    { event: InvoiceCreatedEvent, listener: dispatchInvoiceWebhook },
  ],
})
export class InvoiceWebhookModule {}
```
