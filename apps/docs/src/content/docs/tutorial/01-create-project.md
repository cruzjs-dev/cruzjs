---
title: "01 — Create Project"
description: Scaffold your TaskBoard app and run it locally.
---

# Chapter 01 — Create Project

Scaffold a new CruzJS project, tour the generated structure, and run the dev server.

## Scaffold

```bash
npm create @cruzjs taskboard
cd taskboard
```

`@cruzjs/create` creates a full monorepo with `apps/web`, `packages/core` (your app's feature packages), and the Cruz CLI pre-installed.

## Start the dev server

```bash
cruz dev
```

Open `http://localhost:5000`. You'll see the CruzJS welcome screen — a signup form backed by a real SQLite database running locally.

## Generated structure

```
taskboard/
├── apps/
│   └── web/
│       ├── src/
│       │   ├── app.server.ts      # Framework entry point
│       │   ├── database/
│       │   │   └── schema.ts      # All your Drizzle table definitions
│       │   └── routes/            # React Router v7 routes
│       ├── wrangler.toml          # Cloudflare Pages config
│       └── vite.config.ts
├── packages/
│   └── core/                      # Your app's feature packages live here
├── package.json
└── cruz.config.ts                 # Deployment bindings (D1, KV, R2)
```

## Key files to know

**`apps/web/src/app.server.ts`** — where you register modules and configure the framework.

```typescript
import { createCruzApp } from '@cruzjs/core';

export default createCruzApp({
  modules: [
    // your feature modules go here
  ],
});
```

**`apps/web/src/database/schema.ts`** — one file for all your Drizzle table definitions. No separate migration files to create by hand; Cruz generates them.

**`apps/web/wrangler.toml`** — tells Cloudflare what D1 database, KV namespace, and R2 bucket to bind to your app in production.

## What we built

- A running CruzJS app with auth pre-configured
- Understood the monorepo layout and key files

**Next:** [Chapter 02 — Database Schema](/tutorial/02-database-schema/)
