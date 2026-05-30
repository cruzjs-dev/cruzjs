---
title: Idempotency Keys
description: Prevent duplicate API mutations by making endpoints idempotent with Idempotency-Key headers.
---

Idempotency keys ensure that retrying a request (due to network failures, timeouts, or user double-clicks) does not cause duplicate side effects like double charges or duplicate records. CruzJS provides `IdempotencyService` and a `withIdempotency()` wrapper backed by Cloudflare KV.

## How It Works

1. The client sends a unique `Idempotency-Key` header with a mutation request
2. The server checks KV for an existing record with that key
3. If the key is new, the request is processed and the response is cached
4. If the key was already completed, the cached response is returned immediately
5. If the key is still processing (concurrent duplicate), a 409 Conflict is returned

```
Client                          Server                          KV
  │                               │                              │
  │── POST /payments ────────────>│                              │
  │   Idempotency-Key: abc-123    │── check('abc-123') ────────>│
  │                               │<── null (new key) ──────────│
  │                               │── markProcessing ──────────>│
  │                               │                              │
  │                               │── run handler ──>            │
  │                               │<── Response ────             │
  │                               │                              │
  │                               │── complete(status, body) ──>│
  │<── 200 { charged: true } ─────│                              │
  │                               │                              │
  │── POST /payments (retry) ────>│                              │
  │   Idempotency-Key: abc-123    │── check('abc-123') ────────>│
  │                               │<── { status: completed } ───│
  │<── 200 { charged: true } ─────│                              │
  │   X-Idempotent-Replayed: true │                              │
```

## Usage with withIdempotency()

Wrap any request handler to add idempotency protection:

```typescript
import { withIdempotency, IdempotencyService } from '@cruzjs/core';

export const action = async (args: ActionFunctionArgs) =>
  handleCruzAction([args], async ({ request, container }) => {
    const idempotencyService = container.resolve(IdempotencyService);

    return withIdempotency(request, async () => {
      // This code only runs once per unique Idempotency-Key
      const charge = await stripe.charges.create({
        amount: 1000,
        currency: 'usd',
      });

      return Response.json({ charged: true, chargeId: charge.id });
    }, idempotencyService);
  });
```

The `withIdempotency` function signature:

```typescript
function withIdempotency(
  request: Request,
  handler: () => Promise<Response>,
  service: IdempotencyService,
): Promise<Response>
```

If no `Idempotency-Key` header is present, the handler runs normally without any idempotency logic.

## Client Usage

Send a unique key with each mutation. Use a UUID generated client-side:

```typescript
const idempotencyKey = crypto.randomUUID();

const response = await fetch('/api/payments', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Idempotency-Key': idempotencyKey,
  },
  body: JSON.stringify({ amount: 1000 }),
});
```

For tRPC mutations, pass the key via a custom header in the HTTP link configuration.

## Replayed Responses

When a cached response is returned (the key was already completed), the response includes:

```
Idempotency-Key: abc-123
X-Idempotent-Replayed: true
```

Check for this header to detect replayed responses:

```typescript
const isReplay = response.headers.get('X-Idempotent-Replayed') === 'true';
```

## Conflict (409)

If a request with the same key is already being processed (concurrent duplicate), the server returns:

```json
{
  "error": "Conflict",
  "message": "A request with this idempotency key is already being processed."
}
```

Status code: **409 Conflict**

## TTL

Idempotency records are stored in KV with a **24-hour TTL** (86,400 seconds). After 24 hours, the key expires and can be reused.

If the handler throws an error, the record is stored as completed with a 500 status, allowing the client to retry with the same key after the error is resolved.
