---
title: Deploy Commands
description: Deploying CruzJS applications to Cloudflare with init, deploy, status, and destroy.
---

CruzJS deployment commands manage the full lifecycle of your Cloudflare environments: initialization, deployment, status checking, and teardown. The deployment pipeline handles building, running migrations, deploying the Pages application, and deploying all standalone workers automatically.

## cruz init

Initializes a new Cloudflare environment by creating the required infrastructure resources (D1 database, KV namespace, R2 bucket).

```bash
# Initialize a production environment
cruz init production

# Initialize staging
cruz init staging

# Auto-confirm all prompts
cruz init production --yes
```

### What It Creates

`cruz init` reads your `cruz.config.ts` to determine which resources your application needs, then creates them on Cloudflare:

| Resource | Created When |
|----------|-------------|
| D1 Database | Always (required for Drizzle ORM) |
| KV Namespace | When `bindings.kv` is enabled in config |
| R2 Bucket | When `bindings.r2` is enabled in config |

After creation, the resource IDs are stored in `.cruz.json` so subsequent commands can reference them.

### Options

| Flag | Description |
|------|-------------|
| `--yes, -y` | Skip confirmation prompts |
| `--account-id <id>` | Specify Cloudflare account ID (otherwise auto-detected) |

### Authentication

Before running `cruz init`, you must authenticate with Cloudflare. Either:

- Run `wrangler login` to authenticate via the browser, or
- Set the `CLOUDFLARE_API_TOKEN` environment variable with an API token from the [Cloudflare Dashboard](https://dash.cloudflare.com/profile/api-tokens).

## cruz deploy

Runs the full deployment pipeline: generate `wrangler.toml`, build the application, apply D1 migrations, deploy to Cloudflare Pages, and deploy all standalone workers.

```bash
# Deploy to production
cruz deploy production

# Deploy to staging
cruz deploy staging

# Auto-confirm without prompting
cruz deploy production --yes
```

### Deployment Pipeline

The `cruz deploy` command executes these steps in order:

1. **Generate wrangler.toml** -- Creates the Wrangler configuration from `cruz.config.ts` and the target environment's resource IDs.
2. **Build application** -- Runs `npx react-router build` to compile the React application.
3. **Bundle Pages worker** -- Bundles the server-side worker for Cloudflare Pages.
4. **Apply D1 migrations** -- Runs pending migrations against the remote D1 database.
5. **Deploy to Pages** -- Uploads static assets and the worker to Cloudflare Pages.
6. **Deploy standalone workers** -- Discovers and deploys all workers in `external-processes/`.
7. **Verify deployment** -- Runs a health check against the deployed URL.

### Options

| Flag | Description |
|------|-------------|
| `--skip-build` | Skip steps 2 and 3 (use existing build output) |
| `--skip-migrate` | Skip step 4 (do not run migrations) |
| `--yes, -y` | Skip the confirmation prompt |

### Example Output

```
  Cruz Deploy  production

  ✓ Generate wrangler.toml          wrangler.toml generated
  ✓ Build application               Built successfully
  ✓ Bundle Pages worker             Worker bundled
  ✓ Apply D1 migrations             Migrations applied
  ✓ Deploy to Pages                 Deployed successfully
  ✓ Deploy worker: email-sender     Deployed successfully
  ✓ Verify deployment               Health check passed (200)

  ✓ Deployed to Cloudflare!
  URL: https://my-app.pages.dev
```

## cruz deploy preview

Creates a preview deployment from the current git branch. Preview deployments are isolated environments with their own URL, database, and KV namespace.

```bash
# Deploy a preview from the current branch
cruz deploy preview
```

### How Preview Deploys Work

1. The CLI reads the current git branch name (e.g., `feature/new-dashboard`).
2. It sanitizes the branch name for use as a Cloudflare resource name (e.g., `feature-new-dashboard`).
3. If no environment exists for this branch, it auto-initializes one by creating a D1 database and KV namespace.
4. The application is deployed to a branch-specific URL.

The preview URL follows the pattern:

```
https://<branch-name>.<project-name>.pages.dev
```

### Restrictions

- You cannot deploy a preview from the `main` or `master` branch. Use `cruz deploy production` instead.
- Preview environments are auto-created but not auto-destroyed. Use `cruz destroy` to clean them up.

## cruz status

Shows the current state of all configured Cloudflare environments, including resource IDs, custom domains, and last deployment timestamps.

```bash
# Show all environments
cruz status

# Show a specific environment
cruz status --env production
```

### Example Output

```
  Cruz Status

  Environment: production
    Account:    abc123
    D1:         my-app-production-db (id: d1_xyz)
    KV:         my-app-production-cache (id: kv_xyz)
    Domain:     app.example.com
    Deployed:   2025-03-10T14:32:00Z

  Environment: staging
    Account:    abc123
    D1:         my-app-staging-db (id: d1_abc)
    KV:         my-app-staging-cache (id: kv_abc)
    Deployed:   2025-03-09T10:15:00Z
```

## cruz destroy

Tears down a Cloudflare environment and its associated resources. This is a destructive operation that deletes the D1 database, KV namespace, and R2 bucket for the target environment.

```bash
# Destroy a staging environment
cruz destroy staging

# Auto-confirm
cruz destroy staging --yes

# Destroying production requires --force
cruz destroy production --force --yes
```

### Safety Guards

- Destroying a **production** environment requires the `--force` flag. Without it, the command refuses to run.
- The command prompts for confirmation unless `--yes` is passed.
- Resource deletion is permanent. Database data cannot be recovered.

### Options

| Flag | Description |
|------|-------------|
| `--yes, -y` | Skip the confirmation prompt |
| `--force` | Allow destroying production environments |

## Environment Management

### Environment Lifecycle

```bash
# 1. Initialize the environment (creates D1, KV, R2)
cruz init staging

# 2. Deploy to it
cruz deploy staging

# 3. Check its status
cruz status --env staging

# 4. Tear it down when no longer needed
cruz destroy staging --yes
```

### Production vs Preview

| Aspect | Production | Preview |
|--------|-----------|---------|
| Init | `cruz init production` (manual) | Auto-initialized on first `deploy preview` |
| Deploy | `cruz deploy production` | `cruz deploy preview` |
| URL | `<project>.pages.dev` or custom domain | `<branch>.<project>.pages.dev` |
| Destroy | Requires `--force` | Standard `cruz destroy preview-<branch>` |
| Migrations | Always applied | Applied to isolated D1 database |

### CI/CD Integration

For automated deployments, use the `--yes` flag to skip confirmation prompts:

```bash
# In a CI pipeline
cruz deploy production --yes

# Or with skip flags for faster deploys when appropriate
cruz deploy production --yes --skip-build  # If build was done in a previous step
```

Set the `CLOUDFLARE_API_TOKEN` environment variable in your CI environment instead of using `wrangler login`.
