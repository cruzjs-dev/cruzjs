---
title: Rate Limiting
description: Distributed rate limiting with KV/Redis backends and standard response headers in CruzJS
---

CruzJS provides distributed rate limiting through the `RateLimitModule`. On Cloudflare, rate limit state is stored in KV for cross-isolate consistency. Container deployments use Redis.

## Setup

Register the `RateLimitModule` in your application:

```typescript
// src/app.server.ts
import { registerModules } from '@cruzjs/core/framework/module-registry';
import { StartModule } from '@cruzjs/start/start.module';
import { RateLimitModule } from '@cruzjs/core/rate-limiting';

registerModules([StartModule, RateLimitModule]);
```

## RateLimitAdapter Interface

All backends implement the same interface:

```typescript
interface RateLimitAdapter {
  hit(key: string, limit: number, windowSeconds: number): Promise<RateLimitResult>;
  reset(key: string): Promise<void>;
  getRemaining(key: string, limit: number, windowSeconds: number): Promise<number>;
}
```

## Platform Backends

| Platform | Adapter | Storage |
|----------|---------|---------|
| Cloudflare | `CloudflareKVRateLimitAdapter` | KV namespace with TTL-based windows |
| Docker / Containers | Redis-based adapter | Redis `INCR` + `EXPIRE` |

### Cloudflare KV Backend

The KV adapter uses a read-modify-write pattern: it reads the current count, increments it, and writes back with a TTL matching the window duration.

:::note
Cloudflare KV is eventually consistent, which means there is a small window where concurrent requests may slightly exceed the limit. This is acceptable for rate limiting (you are protecting against abuse, not enforcing exact counts).
:::

## RateLimitService

The `RateLimitService` wraps the adapter with a convenient API:

```typescript
import { Injectable, Inject } from '@cruzjs/core/di';
import { RateLimitService } from '@cruzjs/core/rate-limiting';

@Injectable()
export class MyService {
  constructor(
    @Inject(RateLimitService) private readonly rateLimit: RateLimitService,
  ) {}

  async processRequest(userId: string) {
    const result = await this.rateLimit.check(
      `api:${userId}`,  // key
      100,               // limit
      60,                // window in seconds
    );

    if (!result.allowed) {
      throw new Error(`Rate limit exceeded. Retry after ${result.retryAfter}s`);
    }

    // Process the request...
  }
}
```

### Check Result

```typescript
type RateLimitResult = {
  allowed: boolean;     // Whether the request is within limits
  remaining: number;    // Requests remaining in the current window
  limit: number;        // Total requests allowed per window
  retryAfter: number;   // Seconds until the window resets (0 if allowed)
};
```

## Response Headers

When applying rate limiting, return standard headers so clients can track their usage:

| Header | Description |
|--------|-------------|
| `X-RateLimit-Limit` | Maximum requests allowed in the window |
| `X-RateLimit-Remaining` | Requests remaining in the current window |
| `X-RateLimit-Reset` | Seconds until the window resets |

```typescript
const result = await rateLimit.check(`api:${userId}`, 100, 60);

return new Response(body, {
  headers: {
    'X-RateLimit-Limit': String(result.limit),
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset': String(result.retryAfter),
  },
});
```

## Using in tRPC Middleware

Inject `RateLimitService` and check before processing:

```typescript
import { RateLimitService } from '@cruzjs/core/rate-limiting';
import { TRPCError } from '@trpc/server';

const rateLimitedProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  const rateLimit = ctx.container.get(RateLimitService);
  const result = await rateLimit.check(
    `api:${ctx.user.id}`,
    100,
    60,
  );

  if (!result.allowed) {
    throw new TRPCError({
      code: 'TOO_MANY_REQUESTS',
      message: `Rate limit exceeded. Retry in ${result.retryAfter} seconds.`,
    });
  }

  return next();
});
```

## Using in React Router Loaders/Actions

The same pattern applies in route loaders and actions:

```typescript
export async function action({ request, context }: ActionFunctionArgs) {
  const rateLimit = context.container.get(RateLimitService);
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown';

  const result = await rateLimit.check(`auth:${ip}`, 5, 900); // 5 per 15 min

  if (!result.allowed) {
    throw new Response('Too many requests', {
      status: 429,
      headers: {
        'Retry-After': String(result.retryAfter),
      },
    });
  }

  // Process the action...
}
```

## tRPC Procedures

| Procedure | Type | Description |
|-----------|------|-------------|
| `rateLimit.check` | query | Check rate limit status for a key (admin) |

## Key Naming Conventions

Use consistent key prefixes to organize rate limits:

```typescript
// By category and identifier
`auth:${ip}`           // Auth endpoints by IP
`api:${userId}`        // API calls by user
`upload:${userId}`     // File uploads by user
`webhook:${orgId}`     // Webhook dispatches by org
```
