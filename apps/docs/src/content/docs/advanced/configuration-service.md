---
title: Configuration Service
description: Access typed configuration values in CruzJS with ConfigService — validated environment variables, default values, and dynamic config access.
---

CruzJS provides a `ConfigService` for accessing environment variables with type safety and validation. It follows the same interface as NestJS's `ConfigService`, making it familiar if you have worked with that framework.

## How It Works

In Cloudflare Workers, environment variables are provided via bindings rather than `process.env`. CruzJS's `CloudflareContext.init()` bridges these bindings to `process.env` so that `ConfigService` works consistently across local development and production.

```
Cloudflare env bindings
        │
        ▼
CloudflareContext.init()  ──►  Bridges string values to process.env
        │
        ▼
ConfigService.get()       ──►  Reads from validated env schema
```

## Using ConfigService

Inject `ConfigService` into any service:

```typescript
import { Injectable, Inject } from '@cruzjs/core/di';
import { ConfigService } from '@cruzjs/core/shared/config/config.service';

@Injectable()
export class PaymentService {
  private stripeKey: string;
  private webhookSecret: string;

  constructor(
    @Inject(ConfigService) private readonly config: ConfigService,
  ) {
    // Required config — throws if not set
    this.stripeKey = this.config.getOrThrow<string>('STRIPE_SECRET_KEY');
    this.webhookSecret = this.config.getOrThrow<string>('STRIPE_WEBHOOK_SECRET');
  }
}
```

## API Reference

### `get<T>(key, defaultValue?)`

Returns the value for a configuration key, or the default value if not set. Returns `undefined` if no default is provided and the key is not set.

```typescript
// With default value
const port = config.get<number>('PORT', 3000);

// Without default (may be undefined)
const analyticsId = config.get<string>('ANALYTICS_ID');
if (analyticsId) {
  // analytics is configured
}
```

### `getOrThrow<T>(key)`

Returns the value for a configuration key, throwing an error if the key is not set. Use this for required configuration.

```typescript
// Throws: 'Configuration key "DATABASE_URL" is required but not set'
const dbUrl = config.getOrThrow<string>('DATABASE_URL');
```

### `getEnv()`

Returns the full validated environment object. Useful when you need multiple values at once:

```typescript
const env = config.getEnv();
// Access all validated environment variables
```

### `getRaw(key)`

Returns a raw environment variable value from `process.env`, bypassing the validated schema. Use this for dynamic configuration that is not part of the validated env schema:

```typescript
const customEndpoint = config.getRaw('CUSTOM_API_ENDPOINT');
```

### `getRawByPrefix(prefix)`

Returns all environment variables matching a prefix as a `Map`. Useful for dynamic or plugin-based configuration:

```typescript
// Get all STORAGE_DRIVER_* variables
const storageConfig = config.getRawByPrefix('STORAGE_DRIVER_');
// Map { 'S3_ENDPOINT' => 'https://...', 'S3_REGION' => 'us-east-1' }
```

### `getAllRaw()`

Returns all environment variables as a `Map<string, string>`:

```typescript
const allVars = config.getAllRaw();
```

## Common Configuration Keys

| Key | Description | Example |
|-----|-------------|---------|
| `APP_URL` | Application base URL | `https://myapp.com` |
| `EMAIL_FROM` | Default sender email | `noreply@myapp.com` |
| `EMAIL_PROVIDER` | Email provider | `mailchannels` |
| `EMAIL_API_KEY` | Email provider API key | `re_...` |
| `STORAGE_DRIVER` | Storage backend | `r2` or `local` |
| `R2_BUCKET` | R2 bucket name | `my-app-uploads` |
| `STRIPE_SECRET_KEY` | Stripe API key | `sk_live_...` |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook secret | `whsec_...` |

## Using Config in Different Contexts

### In Services

```typescript
@Injectable()
export class MyService {
  constructor(@Inject(ConfigService) private config: ConfigService) {}

  getApiUrl(): string {
    return this.config.getOrThrow<string>('APP_URL');
  }
}
```

### In tRPC Routers

```typescript
export const settingsRouter = router({
  getAppInfo: protectedProcedure.query(async () => {
    const container = await getAppContainer();
    const config = container.resolve(ConfigService);

    return {
      appUrl: config.getOrThrow<string>('APP_URL'),
      environment: config.get<string>('NODE_ENV', 'development'),
    };
  }),
});
```

### In Modules

Access `ConfigService` from any injectable service registered in your module:

```typescript
@Injectable()
export class ThirdPartyIntegration {
  constructor(@Inject(ConfigService) private config: ConfigService) {
    const apiKey = this.config.get<string>('THIRD_PARTY_API_KEY');
    if (apiKey) {
      this.initialize(apiKey);
    }
  }
}
```

## Setting Configuration

### Local Development

Set environment variables in your `.dev.vars` file (Cloudflare's local env file):

```ini
# .dev.vars
APP_URL=http://localhost:5173
EMAIL_PROVIDER=console
STORAGE_DRIVER=local
STRIPE_SECRET_KEY=sk_test_...
```

### Production

Use the CruzJS CLI to manage secrets:

```bash
# Set a secret
cruz secrets set STRIPE_SECRET_KEY sk_live_...

# List secrets
cruz secrets list
```

Or set them in your `wrangler.toml` for non-sensitive values:

```toml
[vars]
APP_URL = "https://myapp.com"
EMAIL_PROVIDER = "mailchannels"
STORAGE_DRIVER = "r2"
```

## Best Practices

1. **Use `getOrThrow()` for required config.** Fail fast at startup if critical configuration is missing, rather than encountering runtime errors later.

2. **Use `get()` with defaults for optional config.** Provide sensible defaults so your application works in development without extensive env setup.

3. **Do not access `process.env` directly.** Always use `ConfigService` for consistency. The config service handles the Cloudflare-to-process.env bridge and provides type safety.

4. **Keep secrets in `cruz secrets` or `.dev.vars`.** Never commit secrets to `wrangler.toml` or source control. Use `.dev.vars` for local development (it is gitignored by default) and `cruz secrets set` for deployed environments.

5. **Group related config with prefixes.** Use prefixes like `EMAIL_`, `STORAGE_`, `STRIPE_` to organize configuration. Use `getRawByPrefix()` to load groups of related config.
