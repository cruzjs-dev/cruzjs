# @cruzjs/core

Core framework package for CruzJS applications. Provides the foundational infrastructure for building full-stack applications on Cloudflare.

## Features

- **Authentication** — Email/password, OAuth (Google, GitHub, Facebook), session management, JWT tokens
- **Database** — Drizzle ORM integration with Cloudflare D1 (SQLite), schema definitions, migrations
- **Dependency Injection** — Inversify-based DI with decorators (`@Injectable`, `@Inject`, `@Module`)
- **tRPC** — Type-safe API layer with procedures, context, and middleware
- **Email** — React Email templates with sending via Cloudflare Workers
- **Jobs** — Background job processing with D1-backed queue
- **Events** — Domain event system with EventEmitter2
- **Storage** — File upload/download with R2 integration
- **Config** — Environment-based configuration management

## Installation

```bash
npm install @cruzjs/core
```

## Peer Dependencies

- `drizzle-orm` >= 0.36.0
- `inversify` >= 7.0.0
- `reflect-metadata` >= 0.2.0
- `zod` >= 3.0.0
- `react` >= 18.0.0
- `react-router` >= 7.0.0
- `@trpc/server` >= 11.0.0

## Quick Start

```typescript
// server.cloudflare.ts
import { createCruzApp } from '@cruzjs/core';
import { CloudflareAdapter } from '@cruzjs/adapter-cloudflare';
import * as schema from './database/schema';

export default createCruzApp({
  schema,
  modules: [],
  adapter: new CloudflareAdapter(),
  pages: () => import('virtual:react-router/server-build'),
});
```
