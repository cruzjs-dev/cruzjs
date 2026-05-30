---
title: Deployment (Cloudflare)
description: Deploy to Cloudflare Pages with D1, KV, and R2 bindings.
---

CruzJS deploys to Cloudflare Pages with automatic provisioning of D1 databases, KV namespaces, R2 buckets, and other bindings. The `cruz` CLI handles the full deployment lifecycle: infrastructure creation, builds, migrations, and shipping.

:::note[Cloudflare is the supported target]
CruzJS deploys to **Cloudflare Pages** today. Other clouds (AWS, GCP, Azure, DigitalOcean, Docker) are on the [multi-cloud roadmap](/adapters/overview), not yet shipping.
:::

## Quick Deploy

If you want to get to production fast:

```bash
# 1. Initialize the production environment (creates D1, KV, etc.)
cruz init production

# 2. Deploy (build + migrate + ship)
cruz deploy production
```

That is the complete workflow. The rest of this page explains each step in detail.

## Environment Types

CruzJS supports three environment patterns:

| Environment | Purpose | URL Pattern |
|-------------|---------|-------------|
| **production** | Live user-facing app | `myapp.pages.dev` or custom domain |
| **staging** | Pre-production testing | `staging.myapp.pages.dev` |
| **preview** | Ephemeral per-branch deploys | `<branch>.myapp.pages.dev` |

Each environment gets its own isolated Cloudflare resources (D1 database, KV namespace, etc.), so staging data never touches production.

## Initializing an Environment

Before your first deploy to a new environment, run `cruz init` to provision infrastructure:

```bash
cruz init production
```

This command:

1. Reads your `cruz.config.ts` to determine which bindings are needed
2. Creates a Cloudflare Pages project (if it does not already exist)
3. Provisions a D1 database named `<app-name>-production-db`
4. Creates a KV namespace named `<app-name>-production-kv` (if `kv: true`)
5. Creates an R2 bucket named `<app-name>-production-bucket` (if `r2: true`)
6. Generates the `wrangler.toml` with all binding IDs
7. Stores the environment configuration locally

You can initialize multiple environments:

```bash
cruz init production
cruz init staging
```

## What Happens During Deploy

When you run `cruz deploy <env>`, the CLI executes these steps in order:

```
cruz deploy production
│
├── 1. Build
│   └── Runs `cruz build` (Vite production build for Cloudflare Pages)
│
├── 2. Migrate
│   └── Runs `cruz db migrate --remote` against the environment's D1 database
│
├── 3. Ship
│   └── Deploys the built output to Cloudflare Pages via Wrangler
│
└── 4. Verify
    └── Confirms the deployment is live
```

The build produces a Cloudflare Pages-compatible output with server-side rendering via React Router v7 and the Cloudflare Pages Functions adapter.

## Deploy Commands

### Full Deploy

```bash
# Deploy to production (build + migrate + ship)
cruz deploy production

# Deploy to staging
cruz deploy staging
```

### Preview Deploys

Deploy a preview from your current branch:

```bash
cruz deploy preview
```

Preview deploys create a unique URL tied to your branch name (e.g., `feature-xyz.myapp.pages.dev`). They share the staging D1 database by default, or you can configure a dedicated preview database.

### Check Status

View the status of all environments:

```bash
cruz status
```

This shows each environment, its URL, the last deploy time, and the status of all associated resources.

## Database Migrations

Migrations are applied automatically during `cruz deploy`, but you can also run them independently:

```bash
# Apply migrations to the remote production D1 database
cruz db migrate --remote

# Run a SQL query against the remote database
cruz db query "SELECT count(*) FROM Notes" --remote
```

### Migration Workflow

1. Modify your Drizzle schema in `*.schema.ts` files
2. Generate a migration: `cruz db generate`
3. Review the generated SQL in `src/database/migrations/`
4. Test locally: `cruz db migrate`
5. Deploy (migrations run automatically): `cruz deploy production`

If you need to apply migrations without a full deploy:

```bash
cruz db migrate --remote --env production
```

## Managing Secrets

Sensitive values (API keys, auth secrets) are stored as Cloudflare secrets, not in `cruz.config.ts` or `.env` files:

```bash
# Set a secret
cruz secrets set AUTH_SECRET --env production
# (prompts for the value interactively)

# List all secrets for an environment
cruz secrets list --env production
```

### Required Secrets for Production

| Secret | Description |
|--------|-------------|
| `AUTH_SECRET` | Session encryption key (generate with `openssl rand -base64 32`) |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID (if using Google login) |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |
| `STRIPE_SECRET_KEY` | Stripe API key (if using `@cruzjs/saas` billing) |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |

Set all required secrets before your first production deploy.

## Multiple Environments

A typical setup uses two or three environments:

```bash
# Initialize both environments
cruz init staging
cruz init production

# Deploy to staging first
cruz deploy staging

# After testing, deploy to production
cruz deploy production
```

### Environment-Specific Configuration

Define per-environment variables in `cruz.config.ts`:

```typescript
import { defineConfig } from '@cruzjs/cli/config';

export default defineConfig({
  name: 'myapp',
  bindings: { d1: true, kv: true },

  vars: {
    APP_NAME: 'My App',
  },

  environments: {
    production: {
      vars: {
        NODE_ENV: 'production',
        APP_URL: 'https://myapp.com',
      },
      domain: 'myapp.com',
    },
    staging: {
      vars: {
        NODE_ENV: 'staging',
        APP_URL: 'https://staging.myapp.com',
      },
    },
  },
});
```

Variables in `vars` (top-level) are shared across all environments. Variables in `environments.<name>.vars` override the shared values for that specific environment.

## Custom Domains

Add a custom domain to an environment in `cruz.config.ts`:

```typescript
environments: {
  production: {
    domain: 'myapp.com',
    vars: {
      APP_URL: 'https://myapp.com',
    },
  },
},
```

After deploying, configure DNS to point your domain to Cloudflare Pages. Cloudflare handles SSL certificates automatically.

## Deploying External Processes

If you have standalone Workers, Workflows, or Queue consumers in `external-processes/`, they deploy automatically alongside your main app:

```bash
cruz deploy production
# Deploys:
#   1. Main Pages app
#   2. All external-processes/* Workers
```

Each external process has its own `wrangler.toml` and deploys independently, but `cruz deploy` orchestrates all of them together.

### Scaffold a New External Process

```bash
# Standalone Worker
cruz new worker email-sender

# Durable Workflow (retryable multi-step process)
cruz new workflow onboarding-flow

# Queue consumer
cruz new queue-worker invoice-processor --queue invoices
```

## Destroying an Environment

To tear down an environment and all its associated Cloudflare resources:

```bash
cruz destroy staging
```

This deletes the D1 database, KV namespace, R2 bucket, and any other resources for that environment. Use with caution — this is irreversible for database data.

## CI/CD Integration

For automated deployments in CI, use Wrangler directly with your `CLOUDFLARE_API_TOKEN`:

```bash
# In your CI pipeline
export CLOUDFLARE_API_TOKEN=${{ secrets.CF_API_TOKEN }}

# Build and deploy
cruz build
cruz db migrate --remote --env production
npx wrangler pages deploy ./build/client --project-name myapp
```

Or use the `cruz deploy` command if you have the CLI available in CI:

```bash
cruz deploy production
```

## Troubleshooting

### Deploy Fails with "D1 database not found"

Run `cruz init <env>` to create the database first, then retry the deploy.

### Migrations Fail on Remote D1

Check the migration SQL for syntax incompatible with D1 (which is SQLite-based). Common issues:
- D1 does not support `ALTER COLUMN` — use `ALTER TABLE ... RENAME COLUMN` or create a new table
- D1 does not support concurrent schema changes — run migrations sequentially

### Preview Deploy Uses Wrong Database

Preview deploys share the staging database by default. To use an isolated database, initialize a dedicated preview environment:

```bash
cruz init preview
```

## Other Platforms

Cloudflare is the only supported deployment target today. Support for AWS, GCP, Azure, DigitalOcean, and Docker via runtime adapters is on the [multi-cloud roadmap](/adapters/overview).

## Next Steps

- [Configuration](/getting-started/configuration) -- fine-tune your cruz.config.ts
- [Multi-Cloud Roadmap](/adapters/overview) -- where the adapter layer is headed
- [Directory Structure](/getting-started/directory-structure) -- understand the full project layout
- Set up CI/CD with GitHub Actions for automated staging and production deploys
