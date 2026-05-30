---
title: Resource Management
description: Managing Cloudflare Queues, Secrets, KV namespaces, and R2 buckets with the Cruz CLI.
---

CruzJS provides CLI commands for managing Cloudflare infrastructure resources directly from your terminal. These commands wrap the Wrangler CLI with a streamlined interface.

## Queues

Cloudflare Queues provide reliable message delivery between Workers. Use queues to offload background processing from your main application.

### cruz queue create

Creates a new Cloudflare Queue.

```bash
cruz queue create email-queue
cruz queue create order-processing
```

After creating a queue, you can scaffold a consumer worker for it:

```bash
cruz new queue-worker email-sender --queue email-queue
```

### cruz queue list

Lists all queues in your Cloudflare account.

```bash
cruz queue list
```

### cruz queue delete

Deletes a queue. This is a destructive operation -- any unprocessed messages are lost.

```bash
cruz queue delete email-queue
```

### Queue Workflow

A complete queue setup involves three steps:

```bash
# 1. Create the queue on Cloudflare
cruz queue create notification-queue

# 2. Scaffold a consumer worker
cruz new queue-worker notification-sender --queue notification-queue

# 3. Install dependencies and develop locally
cd external-processes/notification-sender
npm install
npx wrangler dev

# 4. Deploy everything (main app + workers)
cruz deploy production
```

### Sending Messages

From your main Pages application or any other Worker, send messages to a queue using the queue binding:

```typescript
// In a tRPC procedure or service
await env.NOTIFICATION_QUEUE.send({
  type: 'user.welcome',
  data: { userId: 'user_123', email: 'new@example.com' },
});
```

## Secrets

Secrets are encrypted environment variables stored on Cloudflare. They are available at runtime via the `env` parameter but are never exposed in logs or the dashboard.

### cruz secrets set

Sets a secret for a specific environment.

```bash
# Set a secret for production
cruz secrets set --env production --name STRIPE_SECRET_KEY --value sk_live_xxx

# Set a secret for staging
cruz secrets set --env staging --name API_KEY --value my-api-key
```

If you omit `--value`, the CLI prompts you to enter it interactively (useful for sensitive values you do not want in your shell history).

### cruz secrets list

Lists all secret names for an environment. Values are never displayed.

```bash
# List production secrets
cruz secrets list --env production
```

Example output:

```
  Secrets (production)

  AUTH_SECRET
  STRIPE_SECRET_KEY
  STRIPE_WEBHOOK_SECRET
  SCM_ENCRYPTION_KEY
```

### Common Secrets

| Secret | Description |
|--------|-------------|
| `AUTH_SECRET` | Session encryption key |
| `STRIPE_SECRET_KEY` | Stripe API key (if using billing) |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |
| `SCM_ENCRYPTION_KEY` | Encryption key for sensitive stored data |
| `GOOGLE_CLIENT_ID` | OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | OAuth client secret |

### Setting Secrets in CI

In CI/CD pipelines, pass secrets via environment variables and set them before deployment:

```bash
# In your CI script
cruz secrets set --env production --name AUTH_SECRET --value "$AUTH_SECRET"
cruz secrets set --env production --name STRIPE_SECRET_KEY --value "$STRIPE_SECRET_KEY"
cruz deploy production --yes
```

## KV Namespaces

Cloudflare KV is a globally distributed key-value store. CruzJS uses it for caching, session storage, and fast lookups.

### cruz kv create

Creates a new KV namespace.

```bash
cruz kv create my-app-cache
cruz kv create session-store
```

The namespace ID is stored in `.cruz.json` and automatically included in the generated `wrangler.toml` during deployment.

### cruz kv list

Lists all KV namespaces in your Cloudflare account.

```bash
cruz kv list
```

Example output:

```
  KV Namespaces

  my-app-production-cache    id: kv_abc123
  my-app-staging-cache       id: kv_def456
  session-store              id: kv_ghi789
```

### KV in Your Application

KV namespaces configured in `cruz.config.ts` are available through the `CloudflareContext`:

```typescript
import { CloudflareContext } from '@cruzjs/core/shared/cloudflare/context';

// In a service
const kv = CloudflareContext.getKV();
await kv.put('user:session:abc', JSON.stringify(sessionData), {
  expirationTtl: 3600, // 1 hour
});

const session = await kv.get('user:session:abc', 'json');
```

## R2 Buckets

Cloudflare R2 is an S3-compatible object storage service. Use it for file uploads, user avatars, document storage, and other binary data.

### cruz r2 create

Creates a new R2 bucket.

```bash
cruz r2 create my-app-uploads
cruz r2 create user-avatars
```

### cruz r2 list

Lists all R2 buckets in your Cloudflare account.

```bash
cruz r2 list
```

Example output:

```
  R2 Buckets

  my-app-uploads
  user-avatars
  backups
```

### R2 in Your Application

R2 buckets configured in `cruz.config.ts` are available through `CloudflareContext`:

```typescript
import { CloudflareContext } from '@cruzjs/core/shared/cloudflare/context';

// Upload a file
const r2 = CloudflareContext.getR2();
await r2.put(`avatars/${userId}.jpg`, imageBuffer, {
  httpMetadata: { contentType: 'image/jpeg' },
});

// Download a file
const object = await r2.get(`avatars/${userId}.jpg`);
if (object) {
  const arrayBuffer = await object.arrayBuffer();
}

// Delete a file
await r2.delete(`avatars/${userId}.jpg`);

// List files
const listed = await r2.list({ prefix: 'avatars/' });
for (const object of listed.objects) {
  console.log(object.key, object.size);
}
```

## Resource Naming

When `cruz init` creates resources, it uses a consistent naming convention:

```
<app-name>-<environment>-<resource-type>
```

For example, an app named `my-app` in the `production` environment would create:

| Resource | Name |
|----------|------|
| D1 Database | `my-app-production-db` |
| KV Namespace | `my-app-production-cache` |
| R2 Bucket | `my-app-production-storage` |

This naming convention keeps resources organized when you have multiple environments.
