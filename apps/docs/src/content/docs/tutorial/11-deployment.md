---
title: "11 — Deployment"
description: Ship TaskBoard to production on Cloudflare Pages in three commands.
---

# Chapter 11 — Deployment

Deploy TaskBoard to production on Cloudflare Pages + D1. The whole process takes about 5 minutes.

## Prerequisites

- Cloudflare account (free tier works)
- Wrangler CLI authenticated: `wrangler login`

## Initialize the production environment

```bash
cruz init production
```

This interactive command:
- Creates a D1 database named `taskboard-production`
- Creates a KV namespace for sessions
- Creates an R2 bucket for file uploads
- Creates a Cloudflare Queue for background jobs
- Updates `wrangler.toml` with the resource IDs
- Writes a `cruz.config.ts` environment block for production

## Set secrets

```bash
cruz secrets set --env production STRIPE_SECRET_KEY sk_live_...
cruz secrets set --env production STRIPE_WEBHOOK_SECRET whsec_...
cruz secrets set --env production JWT_SECRET $(openssl rand -hex 32)
cruz secrets set --env production RESEND_API_KEY re_...
```

## Deploy

```bash
cruz deploy production
```

This runs:
1. `npm run build` — builds the React Router app for Cloudflare Pages
2. `cruz db migrate --remote` — applies pending migrations to the production D1 database
3. `wrangler pages deploy` — ships the build to Cloudflare's edge network

Your app is live. The URL is printed at the end:

```
✓ Deployed to https://taskboard.pages.dev
```

## Add a custom domain

```bash
cruz domain add --env production taskboard.example.com
```

Then add the CNAME record shown to your DNS provider. Cloudflare handles SSL automatically.

## Deploy previews

Every branch can get a preview deployment:

```bash
git checkout -b feature/kanban-view
# make changes
git push
cruz deploy preview
```

Preview deployments are isolated — they get their own D1 database and are separate from production.

## Health check

```bash
cruz deploy production --health-check
```

Waits for the deployment to become healthy before exiting. Useful in CI — the command exits non-zero if the app fails to respond within 30 seconds.

## CI/CD with GitHub Actions

Add to `.github/workflows/deploy.yml`:

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm ci
      - run: npx tsx packages/cli/src/index.tsx deploy production --yes --health-check
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
```

## What we built

- Production environment initialized on Cloudflare
- App deployed to Cloudflare Pages + D1
- Custom domain configured
- CI/CD pipeline wired

---

## You're done

Congratulations — you built a multi-tenant SaaS with:

- User authentication with email verification
- Organizations with role-based access control
- Projects and tasks with real-time updates
- File attachments on tasks
- Background email notifications
- Free/pro billing with Stripe
- Deployed to Cloudflare's global edge network

The finished code is available at [github.com/cruzjs/taskboard-tutorial](https://github.com/cruzjs/taskboard-tutorial) with a tag for each chapter.

**Where to go next:**
- [API Reference](/api/) — full TypeDoc docs for all CruzJS APIs
- [Guides](/guides/) — deep dives on auth, multi-tenancy, testing, and more
- [Discord](https://discord.gg/cruzjs) — get help, show off what you built
