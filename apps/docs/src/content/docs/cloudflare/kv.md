---
title: KV Storage
description: Using Cloudflare KV for caching, sessions, and rate limiting in CruzJS via the KVCacheService.
---

Cloudflare KV is a globally distributed key-value store optimized for high-read, low-write workloads. CruzJS uses KV for caching, session storage, and rate limiting through the `KVCacheService` class.

## Accessing KV

KV is accessed through `CloudflareContext.kv`, which returns the KV namespace bound in your `wrangler.toml`:

```toml
# wrangler.toml
[[kv_namespaces]]
binding = "CACHE_KV"
id = "your-kv-namespace-id"
```

In most cases, you should use `KVCacheService` instead of accessing KV directly.

## KVCacheService

The `KVCacheService` provides a high-level caching API with key prefixing, JSON serialization, and TTL support:

```typescript
import { injectable, inject } from 'inversify';
import { KVCacheService } from '@cruzjs/core/shared/cloudflare/kv-cache.service';

@injectable()
export class ProjectService {
  constructor(
    @inject(KVCacheService) private readonly cache: KVCacheService,
  ) {}

  async getProject(id: string) {
    // Check cache first
    const cached = await this.cache.get<Project>(`project:${id}`);
    if (cached) return cached;

    // Fetch from database
    const project = await this.fetchFromDb(id);

    // Cache for 5 minutes
    await this.cache.set(`project:${id}`, project, 300);

    return project;
  }

  async updateProject(id: string, data: UpdateProjectInput) {
    const updated = await this.updateInDb(id, data);

    // Invalidate cache
    await this.cache.delete(`project:${id}`);

    return updated;
  }
}
```

### Core Methods

```typescript
// Get a value (returns null on cache miss)
const value = await cache.get<MyType>('key');

// Set a value with optional TTL in seconds
await cache.set('key', { data: 'value' }, 3600); // 1 hour TTL
await cache.set('key', 'string-value');           // No expiration

// Delete a key
await cache.delete('key');

// Delete multiple keys
await cache.deleteMany(['key1', 'key2', 'key3']);

// Check existence
const exists = await cache.exists('key');

// List keys by prefix
const keys = await cache.keys('project:*');

// Atomic-ish increment/decrement (not truly atomic in KV)
const newCount = await cache.increment('page-views', 1);
const decreased = await cache.decrement('remaining-credits', 1);

// Clear all keys with the service's prefix
await cache.clear();
```

### Key Prefixing

`KVCacheService` automatically prefixes all keys with a namespace to prevent collisions. The default prefix is `app`:

```typescript
// These are equivalent:
await cache.set('user:123', data);
// Stored in KV as: "app:user:123"
```

Use the `KVCacheServiceFactory` to create instances with different prefixes:

```typescript
import { KVCacheServiceFactory } from '@cruzjs/core/shared/cloudflare/kv-cache.service';

@injectable()
export class MyService {
  private billingCache: KVCacheService;

  constructor(@inject(KVCacheServiceFactory) factory: KVCacheServiceFactory) {
    this.billingCache = factory.create('billing');
  }

  async getCachedPlan(orgId: string) {
    // Stored in KV as "billing:plan:org-123"
    return this.billingCache.get(`plan:${orgId}`);
  }
}
```

## Eventual Consistency

KV is **eventually consistent**. After a write, reads from other edge locations may return stale data for up to 60 seconds. Design your application with this in mind:

- Use KV for data that can tolerate staleness (caching, feature flags, rate limit counters)
- Do not use KV as a primary data store -- use D1 for that
- After a write, return the written data directly instead of re-reading from KV
- For session data, the eventual consistency window is typically acceptable since subsequent requests from the same user hit the same edge location

## TTL (Time-To-Live)

Set expiration times when writing values:

```typescript
// Expires in 5 minutes
await cache.set('session:abc', sessionData, 300);

// Expires in 24 hours
await cache.set('daily-report:2024-01-15', report, 86400);

// No expiration (persists until explicitly deleted)
await cache.set('config:feature-flags', flags);
```

KV automatically removes expired keys -- no cleanup needed.

## Common Use Cases

### Caching Database Queries

```typescript
async getOrgSettings(orgId: string) {
  const cacheKey = `org-settings:${orgId}`;
  const cached = await this.cache.get<OrgSettings>(cacheKey);
  if (cached) return cached;

  const settings = await this.db
    .select()
    .from(organizations)
    .where(eq(organizations.id, orgId))
    .limit(1);

  if (settings[0]) {
    await this.cache.set(cacheKey, settings[0], 600); // 10 min
  }
  return settings[0] ?? null;
}
```

### Session Storage

```typescript
async createSession(userId: string): Promise<string> {
  const token = crypto.randomUUID();
  const session = { userId, createdAt: Date.now() };

  // Store session in KV with 24-hour TTL
  await this.cache.set(`session:${token}`, session, 86400);

  return token;
}

async getSession(token: string) {
  return this.cache.get<SessionData>(`session:${token}`);
}
```

### Rate Limiting

```typescript
async checkRateLimit(identifier: string, maxRequests: number, windowSeconds: number): Promise<boolean> {
  const key = `ratelimit:${identifier}`;
  const current = await this.cache.get<number>(key);

  if (current !== null && current >= maxRequests) {
    return false; // Rate limited
  }

  await this.cache.increment(key, 1);
  if (current === null) {
    // First request in window -- set TTL
    await this.cache.set(key, 1, windowSeconds);
  }

  return true;
}
```

:::caution
KV increment/decrement operations are not truly atomic. For high-concurrency rate limiting, consider using Durable Objects or the built-in `RateLimitService` which uses in-memory state within a single isolate.
:::

## LocalKVNamespace (Development)

When running locally without wrangler, `CloudflareContext` automatically provides an in-memory `LocalKVNamespace` that implements the full `KVNamespace` interface:

- Supports `get`, `put`, `delete`, `list`, and `getWithMetadata`
- Handles TTL/expiration correctly
- Supports all value types: text, JSON, ArrayBuffer, and ReadableStream
- Data persists only for the lifetime of the dev server process

No configuration is needed -- the fallback is automatic:

```
[CloudflareContext] KV not available, using in-memory local facade
```

## wrangler.toml Configuration

```toml
# Create a KV namespace
# npx wrangler kv:namespace create CACHE_KV

[[kv_namespaces]]
binding = "CACHE_KV"
id = "your-namespace-id"

# For local development with wrangler (optional)
[[kv_namespaces]]
binding = "CACHE_KV"
id = "your-namespace-id"
preview_id = "your-preview-namespace-id"
```

## KV Limits

| Resource | Free | Paid |
|---|---|---|
| Reads/day | 100,000 | 10M+/month |
| Writes/day | 1,000 | 1M+/month |
| Max value size | 25 MB | 25 MB |
| Max key size | 512 bytes | 512 bytes |
| Max keys per namespace | Unlimited | Unlimited |

## Next Steps

- [R2 Storage](/cloudflare/r2) -- Object storage for files and media
- [D1 Database](/cloudflare/d1) -- Primary database storage
- [Queues](/cloudflare/queues) -- Asynchronous message processing
