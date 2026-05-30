---
title: "Recipe: API Keys"
description: Implementing API key management with generation, authentication, key rotation, and per-key rate limiting.
---

This recipe covers building a complete API key system for your CruzJS application. API keys allow external services and integrations to authenticate without user sessions.

## Schema

Create a table for storing API keys:

```typescript
// apps/web/src/database/schema.ts
import { sqliteTable, text, integer, index, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { createId } from '@paralleldrive/cuid2';

const generateId = () => createId();
const nowISO = () => new Date().toISOString();

export const apiKeys = sqliteTable('ApiKey', {
  id: text('id').primaryKey().$defaultFn(generateId),
  orgId: text('orgId').notNull(),
  name: text('name').notNull(),                    // Human-readable label
  keyPrefix: text('keyPrefix').notNull(),          // First 8 chars for identification
  keyHash: text('keyHash').notNull().unique(),     // SHA-256 hash of the full key
  permissions: text('permissions').default('[]'),  // JSON array of permission strings
  expiresAt: text('expiresAt'),                    // Optional expiration
  lastUsedAt: text('lastUsedAt'),                  // Track last usage
  createdBy: text('createdBy').notNull(),
  revokedAt: text('revokedAt'),                    // Soft revocation
  createdAt: text('createdAt').notNull().$defaultFn(nowISO),
}, (table) => ({
  orgIdIdx: index('ApiKey_orgId_idx').on(table.orgId),
  keyHashIdx: uniqueIndex('ApiKey_keyHash_idx').on(table.keyHash),
}));
```

Generate the migration:

```bash
cruz db generate
cruz db migrate
```

## API Key Service

```typescript
// apps/web/src/features/api-keys/api-key.service.ts
import { injectable, inject } from 'inversify';
import { DRIZZLE, type DrizzleDatabase } from '@cruzjs/core/shared/database/drizzle.service';
import { apiKeys } from '../../database/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { createHash, randomBytes } from 'crypto';

type CreateApiKeyInput = {
  name: string;
  permissions?: string[];
  expiresInDays?: number;
};

type ApiKeyResponse = {
  id: string;
  name: string;
  keyPrefix: string;
  permissions: string[];
  expiresAt: Date | null;
  lastUsedAt: Date | null;
  createdAt: Date;
};

@injectable()
export class ApiKeyService {
  constructor(@inject(DRIZZLE) private readonly db: DrizzleDatabase) {}

  /**
   * Generate a new API key
   * Returns the full key ONCE -- it cannot be retrieved later
   */
  async createKey(
    orgId: string,
    userId: string,
    input: CreateApiKeyInput
  ): Promise<{ key: string; apiKey: ApiKeyResponse }> {
    // Generate a secure random key
    const rawKey = `crz_${randomBytes(32).toString('hex')}`;
    const keyPrefix = rawKey.slice(0, 12); // "crz_XXXXXXXX"
    const keyHash = this.hashKey(rawKey);

    // Calculate expiration
    let expiresAt: string | null = null;
    if (input.expiresInDays) {
      const expiry = new Date();
      expiry.setDate(expiry.getDate() + input.expiresInDays);
      expiresAt = expiry.toISOString();
    }

    const [apiKey] = await this.db
      .insert(apiKeys)
      .values({
        orgId,
        name: input.name,
        keyPrefix,
        keyHash,
        permissions: JSON.stringify(input.permissions ?? []),
        expiresAt,
        createdBy: userId,
      })
      .returning();

    return {
      key: rawKey, // Only returned once!
      apiKey: this.mapToResponse(apiKey),
    };
  }

  /**
   * Validate an API key and return the associated org/permissions
   */
  async validateKey(rawKey: string): Promise<{
    orgId: string;
    permissions: string[];
    keyId: string;
  } | null> {
    const keyHash = this.hashKey(rawKey);

    const [apiKey] = await this.db
      .select()
      .from(apiKeys)
      .where(and(
        eq(apiKeys.keyHash, keyHash),
        isNull(apiKeys.revokedAt)
      ))
      .limit(1);

    if (!apiKey) return null;

    // Check expiration
    if (apiKey.expiresAt && apiKey.expiresAt < new Date().toISOString()) {
      return null;
    }

    // Update last used timestamp
    await this.db
      .update(apiKeys)
      .set({ lastUsedAt: new Date().toISOString() })
      .where(eq(apiKeys.id, apiKey.id));

    return {
      orgId: apiKey.orgId,
      permissions: JSON.parse(apiKey.permissions || '[]'),
      keyId: apiKey.id,
    };
  }

  /**
   * List all active API keys for an organization
   */
  async listKeys(orgId: string): Promise<ApiKeyResponse[]> {
    const keys = await this.db
      .select()
      .from(apiKeys)
      .where(and(eq(apiKeys.orgId, orgId), isNull(apiKeys.revokedAt)));

    return keys.map(this.mapToResponse);
  }

  /**
   * Revoke an API key (soft delete)
   */
  async revokeKey(orgId: string, keyId: string): Promise<void> {
    const [key] = await this.db
      .select()
      .from(apiKeys)
      .where(and(eq(apiKeys.id, keyId), eq(apiKeys.orgId, orgId)))
      .limit(1);

    if (!key) throw new Error('API key not found');
    if (key.revokedAt) throw new Error('API key already revoked');

    await this.db
      .update(apiKeys)
      .set({ revokedAt: new Date().toISOString() })
      .where(eq(apiKeys.id, keyId));
  }

  /**
   * Rotate a key -- revoke old, create new with same config
   */
  async rotateKey(
    orgId: string,
    keyId: string,
    userId: string
  ): Promise<{ key: string; apiKey: ApiKeyResponse }> {
    const [oldKey] = await this.db
      .select()
      .from(apiKeys)
      .where(and(eq(apiKeys.id, keyId), eq(apiKeys.orgId, orgId)))
      .limit(1);

    if (!oldKey) throw new Error('API key not found');

    // Revoke old key
    await this.revokeKey(orgId, keyId);

    // Create new key with same name and permissions
    return this.createKey(orgId, userId, {
      name: `${oldKey.name} (rotated)`,
      permissions: JSON.parse(oldKey.permissions || '[]'),
    });
  }

  private hashKey(rawKey: string): string {
    return createHash('sha256').update(rawKey).digest('hex');
  }

  private mapToResponse(key: typeof apiKeys.$inferSelect): ApiKeyResponse {
    return {
      id: key.id,
      name: key.name,
      keyPrefix: key.keyPrefix,
      permissions: JSON.parse(key.permissions || '[]'),
      expiresAt: key.expiresAt ? new Date(key.expiresAt) : null,
      lastUsedAt: key.lastUsedAt ? new Date(key.lastUsedAt) : null,
      createdAt: new Date(key.createdAt),
    };
  }
}
```

## Authentication Middleware

Create middleware to authenticate API key requests:

```typescript
// apps/web/src/features/api-keys/api-key.middleware.ts
import { getAppContainer } from '@cruzjs/core';
import { ApiKeyService } from './api-key.service';

type ApiKeyAuth = {
  orgId: string;
  permissions: string[];
  keyId: string;
};

/**
 * Require API key authentication
 * Reads the key from the Authorization header: Bearer crz_xxx
 */
export async function requireApiKey(request: Request): Promise<ApiKeyAuth> {
  const authHeader = request.headers.get('authorization');

  if (!authHeader?.startsWith('Bearer crz_')) {
    throw new Response(
      JSON.stringify({ error: 'Missing or invalid API key' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const rawKey = authHeader.slice(7); // Remove "Bearer "

  const container = await getAppContainer();
  const apiKeyService = container.get(ApiKeyService);
  const result = await apiKeyService.validateKey(rawKey);

  if (!result) {
    throw new Response(
      JSON.stringify({ error: 'Invalid or expired API key' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  return result;
}

/**
 * Require a specific permission on the API key
 */
export async function requireApiKeyPermission(
  request: Request,
  permission: string
): Promise<ApiKeyAuth> {
  const auth = await requireApiKey(request);

  if (!auth.permissions.includes(permission) && !auth.permissions.includes('*')) {
    throw new Response(
      JSON.stringify({ error: `API key lacks permission: ${permission}` }),
      { status: 403, headers: { 'Content-Type': 'application/json' } }
    );
  }

  return auth;
}
```

Use in API routes:

```typescript
// apps/web/src/routes/api/v1/projects.ts
import { requireApiKeyPermission } from '~/features/api-keys/api-key.middleware';

export async function loader({ request }: LoaderFunctionArgs) {
  const auth = await requireApiKeyPermission(request, 'projects:read');

  const container = await getAppContainer();
  const projectService = container.get(ProjectService);
  const projects = await projectService.list(auth.orgId);

  return Response.json({ data: projects });
}

export async function action({ request }: ActionFunctionArgs) {
  const auth = await requireApiKeyPermission(request, 'projects:write');
  const body = await request.json();

  const container = await getAppContainer();
  const projectService = container.get(ProjectService);
  const project = await projectService.create(auth.orgId, 'api-key', body);

  return Response.json({ data: project }, { status: 201 });
}
```

## tRPC Router for Key Management

```typescript
// apps/web/src/features/api-keys/api-key.router.ts
import { orgProcedure, router } from '@cruzjs/core/trpc/context';
import { z } from 'zod';
import { ApiKeyService } from './api-key.service';

export const apiKeyRouter = router({
  list: orgProcedure.query(async ({ ctx }) => {
    return ctx.container.get(ApiKeyService).listKeys(ctx.org.orgId);
  }),

  create: orgProcedure
    .input(z.object({
      name: z.string().min(1).max(100),
      permissions: z.array(z.string()).optional(),
      expiresInDays: z.number().min(1).max(365).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.container.get(ApiKeyService).createKey(
        ctx.org.orgId,
        ctx.session.user.id,
        input
      );
    }),

  revoke: orgProcedure
    .input(z.object({ keyId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.container.get(ApiKeyService).revokeKey(ctx.org.orgId, input.keyId);
      return { success: true };
    }),

  rotate: orgProcedure
    .input(z.object({ keyId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.container.get(ApiKeyService).rotateKey(
        ctx.org.orgId,
        input.keyId,
        ctx.session.user.id
      );
    }),
});
```

## Rate Limiting Per Key

Add per-key rate limiting using KV:

```typescript
// apps/web/src/features/api-keys/api-key-rate-limit.ts
import { KVCacheService } from '@cruzjs/core/shared/cloudflare/kv-cache.service';

const WINDOW_SECONDS = 60;
const MAX_REQUESTS = 100;

export async function checkApiKeyRateLimit(
  cache: KVCacheService,
  keyId: string
): Promise<{ allowed: boolean; remaining: number; resetIn: number }> {
  const key = `ratelimit:apikey:${keyId}`;
  const current = await cache.get<number>(key);

  if (current !== null && current >= MAX_REQUESTS) {
    return {
      allowed: false,
      remaining: 0,
      resetIn: WINDOW_SECONDS,
    };
  }

  const newCount = await cache.increment(key, 1);

  // Set TTL on first request in window
  if (newCount === 1) {
    await cache.set(key, 1, WINDOW_SECONDS);
  }

  return {
    allowed: true,
    remaining: Math.max(0, MAX_REQUESTS - newCount),
    resetIn: WINDOW_SECONDS,
  };
}
```

Add rate limit headers to responses:

```typescript
export async function loader({ request }: LoaderFunctionArgs) {
  const auth = await requireApiKey(request);

  const container = await getAppContainer();
  const cache = container.get(KVCacheService);
  const rateLimit = await checkApiKeyRateLimit(cache, auth.keyId);

  if (!rateLimit.allowed) {
    return new Response(
      JSON.stringify({ error: 'Rate limit exceeded' }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'X-RateLimit-Limit': String(MAX_REQUESTS),
          'X-RateLimit-Remaining': '0',
          'Retry-After': String(rateLimit.resetIn),
        },
      }
    );
  }

  // Process request...
  const data = await fetchData(auth.orgId);

  return new Response(JSON.stringify({ data }), {
    headers: {
      'Content-Type': 'application/json',
      'X-RateLimit-Limit': String(MAX_REQUESTS),
      'X-RateLimit-Remaining': String(rateLimit.remaining),
    },
  });
}
```

## Key Rotation Best Practices

1. **Generate the new key before revoking the old one** -- the `rotateKey` method handles this
2. **Give clients a grace period** -- optionally keep the old key active for a short time
3. **Log all key events** -- creation, revocation, and rotation should be audit-logged
4. **Set expiration dates** -- keys without expiration are a security risk
5. **Limit permissions** -- issue keys with the minimum permissions needed

## Next Steps

- [CRUD Feature Recipe](/recipes/crud-feature) -- Build features end-to-end
- [Permissions](/pro/permissions) -- Permission system details
- [KV Storage](/cloudflare/kv) -- Caching and rate limiting
