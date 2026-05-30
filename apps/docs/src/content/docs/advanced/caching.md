---
title: Caching
description: Cache data in CruzJS using the adapter's CacheBinding — KV on Cloudflare, Redis on AWS/GCP/Azure/Docker.
---

CruzJS caches data through the adapter's `CacheBinding` interface — Cloudflare KV on Cloudflare Workers/Pages, and Redis (ElastiCache, Memorystore, Redis Cache, or self-hosted) on all other adapters. In local development, an in-memory fallback is used automatically.

## How It Works

```
Your Service
    │
    ▼
KVCacheService (namespaced key-value API)
    │
    ▼
Adapter CacheBinding
    │
    ├── Production: Platform cache (KV / Redis)
    └── Development: In-memory fallback (dev)
```

The `KVCacheService` provides a Redis-like API on top of Cloudflare KV. Keys are automatically namespaced with a prefix to prevent collisions between different features.

## KVCacheService

### Creating an Instance

Use `KVCacheServiceFactory` to create namespaced cache instances:

```typescript
import { Injectable, Inject } from '@cruzjs/core/di';
import { KVCacheServiceFactory, KVCacheService } from '@cruzjs/core/shared/cloudflare/kv-cache.service';

@Injectable()
export class ProductService {
  private cache: KVCacheService;

  constructor(
    @Inject(KVCacheServiceFactory) cacheFactory: KVCacheServiceFactory,
  ) {
    this.cache = cacheFactory.create('products');
    // Keys will be prefixed as "products:..."
  }
}
```

### Get and Set

```typescript
// Store a value (auto-serialized to JSON for objects)
await this.cache.set('featured', { ids: ['p1', 'p2', 'p3'] });

// Store with TTL (seconds)
await this.cache.set('trending', trendingProducts, 3600); // 1 hour

// Retrieve a value (auto-parsed from JSON)
const featured = await this.cache.get<{ ids: string[] }>('featured');
if (featured) {
  console.log(featured.ids); // ['p1', 'p2', 'p3']
}
```

### Delete

```typescript
// Delete a single key
await this.cache.delete('featured');

// Delete multiple keys
const deletedCount = await this.cache.deleteMany(['key1', 'key2', 'key3']);
```

### Check Existence

```typescript
const exists = await this.cache.exists('featured');
```

### List Keys

```typescript
// List all keys with a prefix
const keys = await this.cache.keys('category:*');
// Returns: ['category:electronics', 'category:clothing', ...]
```

### Increment / Decrement

```typescript
// Increment a counter
const views = await this.cache.increment('page-views:home');

// Increment by a specific amount
const total = await this.cache.increment('api-calls', 5);

// Decrement
const remaining = await this.cache.decrement('credits:user-123');
```

Note: KV does not support atomic increment. These operations perform a read-modify-write cycle, which is not safe under concurrent writes. Use them for approximate counters, not for critical accounting.

### Clear All Keys

```typescript
// Delete all keys under this cache's prefix
const cleared = await this.cache.clear();
```

This operation lists and deletes all keys with the prefix. It can be expensive in KV — use sparingly.

## Cache Patterns

### Read-Through Cache

Check cache first, fall back to the database, and populate the cache on miss:

```typescript
@Injectable()
export class ProductService {
  private cache: KVCacheService;

  constructor(
    @Inject(KVCacheServiceFactory) cacheFactory: KVCacheServiceFactory,
    @Inject(DRIZZLE) private readonly db: DrizzleDatabase,
  ) {
    this.cache = cacheFactory.create('products');
  }

  async getProduct(id: string): Promise<Product | null> {
    // Check cache first
    const cached = await this.cache.get<Product>(`detail:${id}`);
    if (cached) {
      return cached;
    }

    // Cache miss — query database
    const [product] = await this.db
      .select()
      .from(products)
      .where(eq(products.id, id))
      .limit(1);

    if (product) {
      // Populate cache with 30-minute TTL
      await this.cache.set(`detail:${id}`, product, 1800);
    }

    return product ?? null;
  }
}
```

### Write-Through Cache

Update the cache when data changes:

```typescript
async updateProduct(id: string, input: UpdateProductInput): Promise<Product> {
  const [updated] = await this.db
    .update(products)
    .set(input)
    .where(eq(products.id, id))
    .returning();

  // Update cache immediately
  await this.cache.set(`detail:${id}`, updated, 1800);

  return updated;
}

async deleteProduct(id: string): Promise<void> {
  await this.db.delete(products).where(eq(products.id, id));

  // Invalidate cache
  await this.cache.delete(`detail:${id}`);
}
```

### Cache-Aside with Revalidation

For data that changes infrequently, use a long TTL and invalidate on write:

```typescript
async getSettings(orgId: string): Promise<OrgSettings> {
  const cacheKey = `settings:${orgId}`;
  const cached = await this.cache.get<OrgSettings>(cacheKey);
  if (cached) return cached;

  const settings = await this.loadSettingsFromDb(orgId);
  // Cache for 24 hours — invalidated on update
  await this.cache.set(cacheKey, settings, 86400);
  return settings;
}

async updateSettings(orgId: string, input: UpdateSettingsInput) {
  await this.saveSettingsToDb(orgId, input);
  // Invalidate so next read fetches fresh data
  await this.cache.delete(`settings:${orgId}`);
}
```

## Direct KV Access

For cases where you need the raw KV namespace (e.g., storing binary data or using KV metadata), access it directly via `CloudflareContext`:

```typescript
import { CloudflareContext } from '@cruzjs/core/shared/cloudflare/context';

const kv = CloudflareContext.kv;
if (kv) {
  // Raw KV operations
  await kv.put('raw-key', 'raw-value', { expirationTtl: 3600 });
  const value = await kv.get('raw-key');
  await kv.delete('raw-key');

  // Read as JSON
  const data = await kv.get('config', 'json');

  // List keys
  const list = await kv.list({ prefix: 'user:', limit: 100 });
}
```

## Local Development

When running locally without wrangler, `CloudflareContext` automatically provides a `LocalKVNamespace` — an in-memory implementation that supports the same API as Cloudflare KV:

- `get()`, `put()`, `delete()`, `list()` all work as expected
- TTL-based expiration is supported
- Metadata storage is supported
- Data lives only for the lifetime of the dev server process

No configuration is needed. The fallback is automatic when the `CACHE_KV` binding is not present.

## Wrangler Configuration

Bind a KV namespace in your `wrangler.toml`:

```toml
[[kv_namespaces]]
binding = "CACHE_KV"
id = "your-kv-namespace-id"
```

Create KV namespaces via the CLI:

```bash
cruz kv create my-app-cache
cruz kv list
```

## Advanced Patterns

### remember()

The `remember()` method replaces the manual "check cache, compute, store" pattern with a single call:

```typescript
const product = await this.cache.remember<Product>(
  `detail:${id}`,
  1800, // 30 minutes
  async () => {
    const [row] = await this.db
      .select()
      .from(products)
      .where(eq(products.id, id))
      .limit(1);
    return row;
  },
);
```

On cache hit, the cached value is returned immediately. On miss, the callback runs, the result is stored with the given TTL, and then returned.

### rememberTagged() with Tag Invalidation

`rememberTagged()` works like `remember()` but associates the cache entry with one or more tags. This enables bulk invalidation of related cache entries:

```typescript
// Cache a product list tagged with 'products' and the org
const products = await this.cache.rememberTagged<Product[]>(
  `org:${orgId}:products`,
  3600,
  ['products', `org:${orgId}`],
  async () => {
    return this.db.select().from(schema.products).where(eq(schema.products.orgId, orgId));
  },
);
```

Tags are tracked automatically:
- **KV backend:** stores a JSON array of associated keys at `_tags:{tagName}`
- **Redis backend:** stores keys in a Redis set at `tag:{tagName}`

### flushTag() for Cache Busting

When data changes, flush all cache entries for a tag:

```typescript
// After creating, updating, or deleting a product:
await this.cache.flushTag('products');

// Or use the fluent syntax:
await this.cache.tags(`org:${orgId}`).flush();
```

`flushTag()` deletes every cache key associated with the tag, plus the tag tracking entry itself. It returns the number of keys deleted.

This is particularly useful for invalidating list caches when individual items change, without needing to track every cache key manually.

## Best Practices

1. **Use namespaced caches.** Create separate `KVCacheService` instances for each feature with `cacheFactory.create('feature-name')`. This prevents key collisions and makes it easy to clear feature-specific caches.

2. **Always set a TTL.** KV storage has costs. Set appropriate TTLs to prevent unbounded growth. Cache frequently-read, rarely-changed data for longer (hours/days) and volatile data for shorter periods (minutes).

3. **Gracefully handle cache unavailability.** `KVCacheService` returns `null` on cache miss or when KV is unavailable. Never let a cache failure break your application — treat cache as optional.

4. **Invalidate on write.** When data changes, delete or update the corresponding cache entry immediately. Stale cache data is a common source of bugs.

5. **Do not use KV for atomic operations.** KV is eventually consistent and does not support atomic read-modify-write. Do not use `increment()` for critical counters like account balances.

6. **Keep cached values small.** KV has a 25 MB value limit, but smaller values (under 100 KB) provide the best performance. For large datasets, cache only the most-accessed subset.
