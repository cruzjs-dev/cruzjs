---
title: Deploying to DigitalOcean
description: Full deployment workflow for CruzJS on DigitalOcean -- doctl CLI, App Platform dashboard, GitHub Actions CI, Spaces, domains, and monitoring.
---

## Prerequisites

Install the DigitalOcean CLI and authenticate:

```bash
# Install doctl
brew install doctl          # macOS
snap install doctl          # Ubuntu

# Authenticate
doctl auth init
```

## Deploy with doctl

### Create from App Spec

The fastest path is deploying from your `.do/app.yaml` spec (see [App Platform](/adapters/do-app-platform) for the full spec).

```bash
# Create the app
doctl apps create --spec .do/app.yaml

# List your apps
doctl apps list

# Trigger a new deployment
doctl apps create-deployment <app-id>

# Check deployment status
doctl apps list-deployments <app-id>

# View runtime logs
doctl apps logs <app-id> --type run
```

### Update an Existing App

```bash
# Update the app spec (adds new env vars, changes instance size, etc.)
doctl apps update <app-id> --spec .do/app.yaml
```

## Deploy from the Dashboard

1. Go to **App Platform** in the DigitalOcean console and click **Create App**.
2. Select **GitHub** as the source and authorize DigitalOcean to access your repository.
3. Choose the repository and branch (typically `main`).
4. App Platform auto-detects the Dockerfile or you can set the build command to `npx cruz build` and run command to `node build/server/index.js`.
5. Add environment variables under the **Environment Variables** section. Mark secrets with the **Encrypt** toggle.
6. Attach a Managed PostgreSQL database -- App Platform injects `DATABASE_URL` automatically.
7. Optionally attach a Managed Redis cluster for cache and queues.
8. Review the plan and click **Create Resources**.

App Platform provisions everything and deploys your app. Subsequent pushes to the configured branch trigger automatic deployments.

## GitHub Actions CI/CD

Automate deployments with GitHub Actions. This workflow builds, tests, and triggers a deployment on every push to `main`.

```yaml
# .github/workflows/deploy-digitalocean.yml
name: Deploy to DigitalOcean
on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npx cruz typecheck
      - run: npx cruz test

  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: digitalocean/app_action@v2
        with:
          app_name: my-cruz-app
          token: ${{ secrets.DIGITALOCEAN_ACCESS_TOKEN }}
```

Generate a personal access token in the DigitalOcean dashboard under **API > Tokens** and add it as a repository secret named `DIGITALOCEAN_ACCESS_TOKEN`.

## DigitalOcean Spaces Setup

Spaces provides S3-compatible object storage. Create a Space and generate API keys.

```bash
# Spaces are created in the DigitalOcean console under "Spaces Object Storage"
# Choose a region (nyc3, sfo3, ams3, sgp1, fra1)
```

Generate Spaces access keys in the dashboard under **API > Spaces Keys**. Configure them in your app:

```bash
SPACES_ENDPOINT=https://nyc3.digitaloceanspaces.com
SPACES_BUCKET=my-cruz-uploads
SPACES_ACCESS_KEY=your-spaces-access-key
SPACES_SECRET_KEY=your-spaces-secret-key
SPACES_REGION=nyc3
```

The adapter uses the S3 protocol, so the `spacesEndpoint` maps directly to the `s3Endpoint` config:

```typescript
new DigitalOceanAppPlatformAdapter({
  databaseUrl: process.env.DATABASE_URL,
  spacesBucket: process.env.SPACES_BUCKET,
  spacesEndpoint: process.env.SPACES_ENDPOINT, // https://nyc3.digitaloceanspaces.com
  spacesAccessKey: process.env.SPACES_ACCESS_KEY,
  spacesSecretKey: process.env.SPACES_SECRET_KEY,
})
```

Enable the built-in CDN on your Space for edge-cached file delivery.

## Domains and SSL

App Platform handles SSL automatically. To use a custom domain:

1. Go to your app's **Settings > Domains**.
2. Add your domain (e.g., `app.example.com`).
3. Update your DNS provider with the CNAME record App Platform provides.
4. SSL is provisioned automatically via Let's Encrypt. No manual certificate management.

```bash
# Or via doctl
doctl apps update <app-id> --spec .do/app.yaml
# Include the domain in the spec:
# domains:
#   - domain: app.example.com
#     type: PRIMARY
```

## Database Migrations

The recommended approach is a `PRE_DEPLOY` job in your app spec. This runs before the new version receives traffic:

```yaml
jobs:
  - name: migrate
    github:
      repo: your-org/your-repo
      branch: main
    build_command: npm ci
    run_command: npx cruz db migrate
    kind: PRE_DEPLOY
    instance_size_slug: basic-xxs
    envs:
      - key: DATABASE_URL
        scope: RUN_TIME
        value: ${db.DATABASE_URL}
```

If the migration fails, the deployment is rolled back automatically. You can also run migrations manually:

```bash
doctl apps console <app-id> --command "npx cruz db migrate"
```

## Monitoring with DigitalOcean Insights

App Platform includes built-in monitoring:

- **CPU and memory usage** per instance in the App Platform dashboard.
- **HTTP request metrics** (latency, error rate, throughput) under **Insights**.
- **Runtime logs** via `doctl apps logs <app-id> --type run` or the dashboard log viewer.
- **Build logs** via `doctl apps logs <app-id> --type build`.
- **Alerts** can be configured in the DigitalOcean Monitoring dashboard for CPU, memory, and bandwidth thresholds.

For deeper observability, connect an external provider (Datadog, Grafana Cloud) via log forwarding in the app settings.
