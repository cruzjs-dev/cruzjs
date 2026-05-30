---
title: Configuration
description: Configure CruzJS with cruz.config.ts, environment variables, and platform bindings.
---

CruzJS uses a typed configuration file (`cruz.config.ts`) in your app root to define deployment bindings, environment variables, and deployment settings. When deploying to Cloudflare (the default), the CLI reads this file to generate `wrangler.toml` and manage infrastructure. Other deployment targets use their respective adapter configuration.

## cruz.config.ts

Create a `cruz.config.ts` file in your app root (e.g., `apps/web/cruz.config.ts`):

```typescript
import { defineConfig } from '@cruzjs/cli/config';

export default defineConfig({
  name: 'myapp',
  compatibilityDate: '2024-12-01',
  compatibilityFlags: ['nodejs_compat'],

  bindings: {
    d1: true,        // D1 SQL database
    kv: true,        // KV key-value store (caching)
    r2: false,       // R2 object storage
    ai: false,       // Workers AI
    aiGateway: false, // AI Gateway
    vectorize: false, // Vectorize vector DB
    queues: false,    // Queues
    rateLimiting: false, // Rate limiting
  },

  email: {
    provider: 'mailchannels', // 'mailchannels' | 'resend' | 'none'
  },

  vars: {
    APP_NAME: 'My Application',
  },

  environments: {
    production: {
      vars: {
        NODE_ENV: 'production',
        APP_URL: 'https://myapp.example.com',
      },
      domain: 'myapp.example.com',
    },
    staging: {
      vars: {
        NODE_ENV: 'staging',
        APP_URL: 'https://staging.myapp.example.com',
      },
    },
  },
});
```

### Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `name` | `string` | (required) | App name. Used as a prefix for all cloud resources (e.g., `myapp-production-db`). |
| `compatibilityDate` | `string` | — | Cloudflare Workers compatibility date (Cloudflare adapter only). |
| `compatibilityFlags` | `string[]` | — | Cloudflare compatibility flags (Cloudflare adapter only). `nodejs_compat` is required for CruzJS on Cloudflare. |
| `bindings` | `CruzBindings` | `{ d1: true, kv: true }` | Which platform bindings your app uses. Each adapter maps these to native services. |
| `email` | `CruzEmailConfig` | `{ provider: 'none' }` | Email provider configuration. |
| `vars` | `Record<string, string>` | `{}` | Variables shared across all environments. |
| `migrationsDir` | `string` | `'./src/database/migrations'` | Path to Drizzle migration files relative to app root. |
| `environments` | `Record<string, CruzEnvironmentConfig>` | `{}` | Per-environment overrides. |

### Bindings Reference

| Binding | Description | Resource Created |
|---------|-------------|-----------------|
| `d1` | SQL database (Cloudflare D1, SQLite locally). | `<name>-<env>-db` |
| `kv` | Key-value cache (Cloudflare KV). | `<name>-<env>-kv` |
| `r2` | Object storage (Cloudflare R2). | `<name>-<env>-bucket` |
| `ai` | AI inference (Cloudflare Workers AI). | Platform-specific |
| `aiGateway` | AI request logging, caching, and rate limiting (Cloudflare AI Gateway). | `<name>-<env>-ai-gateway` |
| `vectorize` | Vector database for semantic search and RAG applications. | `<name>-<env>-vectorize` |
| `queues` | Message queues for async processing (Cloudflare Queues). | `<name>-<env>-queue` |
| `rateLimiting` | Built-in rate limiting for API endpoints. | Configured per route |

## Environment Variables

### .env Files

CruzJS supports multiple `.env` files for different environments:

| File | Purpose |
|------|---------|
| `.env` | Local development (default) |
| `.env.example` | Template for required variables (committed to source control) |

For production and staging, environment variables are set as Cloudflare secrets (not in `.env` files):

```bash
# Set a secret for an environment
cruz secrets set AUTH_SECRET --env production

# List secrets
cruz secrets list --env production
```

### Required Variables

| Variable | Description |
|----------|-------------|
| `AUTH_SECRET` | Session encryption key. Must be a strong random string (32+ characters). |
| `DATABASE_URL` | Local dev only. The value depends on your adapter (e.g., `file:./dev.db` for Cloudflare/SQLite, a PostgreSQL connection string for other adapters). In production, the adapter provides the database binding automatically. |

### Optional Variables

| Variable | Description |
|----------|-------------|
| `GOOGLE_CLIENT_ID` | Google OAuth client ID for social login. |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret. |
| `SCM_ENCRYPTION_KEY` | Encryption key for sensitive data fields. |
| `STRIPE_SECRET_KEY` | Stripe API key (only with `@cruzjs/saas` billing). |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret. |

### Accessing Variables at Runtime with ConfigService

Environment variables and `vars` from `cruz.config.ts` are accessible through the `ConfigService`:

```typescript
import { Injectable, Inject } from '@cruzjs/core/di';
import { ConfigService } from '@cruzjs/core/shared/config/config.service';

@Injectable()
export class MyService {
  constructor(
    @Inject(ConfigService) private readonly config: ConfigService
  ) {}

  doSomething() {
    // Get a required value (throws if missing)
    const appUrl = this.config.getOrThrow<string>('APP_URL');

    // Get an optional value with a default
    const appName = this.config.get<string>('APP_NAME', 'My App');
  }
}
```

Variables from `cruz.config.ts` are also bridged to `process.env` during Cloudflare context initialization, so they are available via standard Node.js patterns. However, using `ConfigService` is preferred for type safety and testability.

## Accessing Bindings in Code

CruzJS exposes platform bindings through injectable services rather than direct platform APIs. This keeps your application code portable across adapters.

### Database

The database is managed by Drizzle ORM. Inject the `DRIZZLE` token to access it:

```typescript
import { Injectable, Inject } from '@cruzjs/core/di';
import { DRIZZLE, type DrizzleDatabase } from '@cruzjs/core/shared/database/drizzle.service';

@Injectable()
export class MyService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDatabase) {}
}
```

The adapter determines the underlying driver automatically — D1 on Cloudflare, SQLite locally.

### Caching

Use `KVCacheService` for key-value caching. See [Caching](/advanced/caching) for full details:

```typescript
import { Injectable, Inject } from '@cruzjs/core/di';
import { KVCacheServiceFactory, KVCacheService } from '@cruzjs/core/shared/cloudflare/kv-cache.service';

@Injectable()
export class ProductService {
  private cache: KVCacheService;

  constructor(@Inject(KVCacheServiceFactory) cacheFactory: KVCacheServiceFactory) {
    this.cache = cacheFactory.create('products');
  }

  async getProduct(id: string) {
    const cached = await this.cache.get<Product>(`detail:${id}`);
    if (cached) return cached;
    // ... fetch from database and populate cache
  }
}
```

### File Storage

Use `StorageService` for file uploads and media. See [File Storage](/advanced/file-storage) for full details:

```typescript
import { Injectable, Inject } from '@cruzjs/core/di';
import { StorageService } from '@cruzjs/core/shared/storage/storage.service.server';

@Injectable()
export class DocumentService {
  constructor(@Inject(StorageService) private readonly storage: StorageService) {}

  async upload(key: string, content: Buffer) {
    const driver = this.storage.disk();
    await driver.put(key, content, { contentType: 'application/pdf' });
  }
}
```

### AI

Use `AIService` for text generation, embeddings, and more. See [AI Integration](/advanced/ai) for full details:

```typescript
import { Injectable, Inject } from '@cruzjs/core/di';
import { AIService } from '@cruzjs/core';

@Injectable()
export class SummaryService {
  constructor(@Inject(AIService) private readonly ai: AIService) {}

  async summarize(text: string) {
    return this.ai.chat({ prompt: text, system: 'Summarize concisely.' });
  }
}
```

:::note
If you are deploying to Cloudflare and need direct access to a raw binding (KV namespace, R2 bucket, queue, etc.), see [Cloudflare Platform](/cloudflare/overview).
:::

## Infrastructure Naming

When deploying to Cloudflare, CruzJS uses a consistent naming convention for all resources. Other adapters use the `name` field from `cruz.config.ts` as a resource prefix in their respective platforms.

```
<app-name>-<environment>-<resource-type>
```

For example, an app named `myapp` creates:

| Resource | Production | Staging |
|----------|-----------|---------|
| D1 Database | `myapp-production-db` | `myapp-staging-db` |
| KV Namespace | `myapp-production-kv` | `myapp-staging-kv` |
| R2 Bucket | `myapp-production-bucket` | `myapp-staging-bucket` |

This naming is handled automatically by `cruz init` and `cruz deploy`. You do not need to create or name resources manually.

## Next Steps

- [Directory Structure](/getting-started/directory-structure) — understand how the project is organized
- [First Application](/getting-started/first-application) — build a feature from schema to UI
- [Deployment](/getting-started/deployment) — deploy to Cloudflare Pages
