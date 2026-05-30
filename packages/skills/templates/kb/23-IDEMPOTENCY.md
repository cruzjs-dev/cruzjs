# Idempotency Keys

`IdempotencyService` and `withIdempotency()` prevent duplicate API mutations by tracking `Idempotency-Key` headers.

Located at `packages/core/src/shared/idempotency/idempotency.service.ts`.

## IdempotencyService

Backed by Cloudflare KV (via `KVCacheServiceFactory` with `'idempotency'` prefix). Decorated with `@Injectable()`.

### Methods

- `check(key)` -- returns `IdempotencyRecord | null`
- `markProcessing(key)` -- marks key as in-progress (with 24h TTL)
- `complete(key, status, body)` -- stores the completed response

### IdempotencyRecord

```typescript
interface IdempotencyRecord {
  key: string;
  status: 'processing' | 'completed';
  response?: { status: number; body: unknown };
  createdAt: string;
}
```

## withIdempotency()

Wraps a request handler with idempotency protection:

```typescript
import { withIdempotency, IdempotencyService } from '@cruzjs/core';

async function handlePayment(request: Request, service: IdempotencyService) {
  return withIdempotency(request, async () => {
    // Actual payment logic
    const charge = await stripe.charges.create({ ... });
    return Response.json({ charged: true, chargeId: charge.id });
  }, service);
}
```

### Signature

```typescript
function withIdempotency(
  request: Request,
  handler: () => Promise<Response>,
  service: IdempotencyService,
): Promise<Response>
```

### Behavior

1. **No `Idempotency-Key` header** -- handler runs normally (no idempotency)
2. **Key exists, status `completed`** -- cached response returned immediately with `X-Idempotent-Replayed: true` header
3. **Key exists, status `processing`** -- returns **409 Conflict** (`"A request with this idempotency key is already being processed."`)
4. **New key** -- marks as `processing`, runs handler, stores response as `completed`, returns response with `Idempotency-Key` header

### Error Handling

If the handler throws, the key is stored as `completed` with status 500 so the same key can be retried.

## Client Usage

Send the `Idempotency-Key` header with a UUID:

```typescript
const response = await fetch('/api/payments', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Idempotency-Key': crypto.randomUUID(),
  },
  body: JSON.stringify({ amount: 1000 }),
});

// Check if this was a replayed response:
if (response.headers.get('X-Idempotent-Replayed') === 'true') {
  console.log('This response was served from cache');
}
```

## TTL

Records expire after **24 hours** (86400 seconds). After that, the same key can be reused.
