# Advanced Cache Patterns

CruzJS cache services (`KVCacheService` for Cloudflare KV, `CacheService` for Redis) implement the `ICacheService` interface with `remember()`, `rememberTagged()`, and tag-based invalidation.

## remember()

Fetch from cache or compute on miss. Replaces the manual "check cache, query DB, populate" pattern:

```typescript
// Before: manual read-through
const cached = await this.cache.get<Product[]>('featured');
if (cached) return cached;
const products = await this.db.select().from(schema.products).where(eq(schema.products.featured, true));
await this.cache.set('featured', products, 3600);
return products;

// After: one-liner
const products = await this.cache.remember<Product[]>('featured', 3600, async () => {
  return this.db.select().from(schema.products).where(eq(schema.products.featured, true));
});
```

### Signature

```typescript
remember<T>(key: string, ttlSeconds: number, callback: () => Promise<T>): Promise<T>
```

- **key** -- cache key (auto-prefixed by the service's namespace)
- **ttlSeconds** -- TTL in seconds
- **callback** -- async function invoked only on cache miss; return value is stored and returned

## rememberTagged()

Same as `remember()` but associates the cache entry with one or more tags for grouped invalidation:

```typescript
const products = await this.cache.rememberTagged<Product[]>(
  `org:${orgId}:products`,
  3600,
  ['products', `org:${orgId}`],
  async () => {
    return this.db.select().from(schema.products).where(eq(schema.products.orgId, orgId));
  },
);
```

### Signature

```typescript
rememberTagged<T>(
  key: string,
  ttlSeconds: number,
  tags: string[],
  callback: () => Promise<T>,
): Promise<T>
```

Internally, each tag maintains a list of associated cache keys:
- **KV**: stored as a JSON array at `_tags:{tagName}`
- **Redis**: stored as a Redis set at `tag:{tagName}`

## flushTag()

Delete all cache entries associated with a tag:

```typescript
// After creating/updating/deleting a product:
await this.cache.flushTag('products');
// Also flush the org-specific tag:
await this.cache.flushTag(`org:${orgId}`);
```

Returns the number of keys deleted.

## tags()

Fluent alternative to `flushTag()`:

```typescript
await this.cache.tags('products').flush();
```

Returns `{ flush: () => Promise<number> }`.

## Full Example

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

  async listByOrg(orgId: string): Promise<Product[]> {
    return this.cache.rememberTagged(
      `org:${orgId}:list`,
      1800,
      ['products', `org:${orgId}`],
      () => this.db.select().from(products).where(eq(products.orgId, orgId)),
    );
  }

  async create(orgId: string, input: CreateProductInput): Promise<Product> {
    const [product] = await this.db.insert(products).values({ ...input, orgId }).returning();
    // Invalidate all product caches for this org
    await this.cache.flushTag(`org:${orgId}`);
    return product;
  }
}
```

## Implementation Notes

- Both `KVCacheService` and `CacheService` (Redis) implement the same interface
- On cache miss, `remember` / `rememberTagged` call the callback, store the result, then return it
- `flushTag` deletes all tagged keys plus the tag tracking entry itself
- Tags are not cross-service -- each cache instance (prefix) tracks its own tags
