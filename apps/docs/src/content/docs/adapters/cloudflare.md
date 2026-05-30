---
title: Cloudflare Adapter
description: Deploy CruzJS on Cloudflare Workers/Pages
---

The Cloudflare adapter is the default runtime for CruzJS, providing edge-deployed applications with D1, KV, R2, Queues, and Workers AI.

## Installation

```bash
npm install @cruzjs/adapter-cloudflare
```

## Usage

```typescript
// server.cloudflare.ts
import { CloudflareAdapter } from '@cruzjs/adapter-cloudflare';

export default createCruzApp({
  schema,
  modules: [/* your modules */],
  adapter: new CloudflareAdapter(),
  pages: () => import('virtual:react-router/server-build'),
});
```

## Configuration

```typescript
new CloudflareAdapter({
  kvBindingName: 'CACHE_KV',       // Override KV binding name
  r2BindingName: 'UPLOADS_BUCKET', // Override R2 binding name
});
```

## Service Mapping

| CruzJS Binding | Cloudflare Service | Binding Name |
|----------------|-------------------|--------------|
| Database | D1 | `DB` |
| Cache | KV | `CACHE_KV` |
| Storage | R2 | `UPLOADS_BUCKET` |
| Queue | Queues | Dynamic (by name) |
| AI | Workers AI + AI Gateway | `AI` |

## Local Development

In local development (without wrangler), the adapter automatically provides:
- **In-memory KV** for caching
- **In-memory queues** with consumer registration
- **SQLite** fallback for D1 via `better-sqlite3`

## Runtime Type

`edge` — Runs in V8 isolates at Cloudflare's edge network. Sub-millisecond cold starts.
