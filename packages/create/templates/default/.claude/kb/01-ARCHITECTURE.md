# Architecture

## Project Structure

```
src/
├── entry.server.tsx        # SSR entry — initializes CloudflareContext per request
├── entry.client.tsx        # Client-side hydration
├── root.tsx                # Root React component with providers
├── routes.ts               # React Router route config
├── server.cloudflare.ts    # App bootstrap (createCruzApp)
├── database/
│   ├── schema.ts           # Central schema (re-exports packages + your tables)
│   └── migrations/         # Generated Drizzle migrations
├── features/               # Feature modules
│   └── <name>/
│       ├── index.ts
│       ├── <name>.module.ts
│       ├── <name>.router.ts
│       ├── <name>.service.ts
│       ├── <name>.schema.ts
│       ├── <name>.validation.ts
│       ├── <name>.models.ts
│       ├── routes/          # Feature route components
│       │   ├── index.tsx
│       │   └── $id.tsx
│       └── events/          # Domain events (optional)
├── components/              # Shared React components
├── contexts/                # React context providers
└── trpc/
    ├── client.ts            # tRPC React client hooks
    └── router.ts            # Combined AppRouter
external-processes/          # Standalone Workers/Workflows/Queue consumers
cruz.config.ts               # Cloudflare bindings and deployment config
wrangler.toml                # Generated — do not edit manually
```

## Package Boundaries

| Package | Purpose | Modify? |
|---------|---------|---------|
| `@cruzjs/core` | DI, auth, tRPC, database, CF bindings | Never |
| `@cruzjs/start` | UI components, theming, orgs, members, permissions | Never |
| `@cruzjs/saas` | Billing, admin, audit logging | Never |
| `src/features/` | Your feature modules | Always |
| `src/components/` | Your shared components | Always |

## Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Feature dir | `kebab-case` | `user-profile` |
| Service class | `PascalCase` + `Service` | `NotesService` |
| Router | `camelCase` + `Router` | `notesRouter` |
| Module class | `PascalCase` + `Module` | `NotesModule` |
| Schema table | `camelCase` | `notes`, `orgMembers` |
| Validation | `camelCase` + `Schema` | `createNoteSchema` |
| Event class | `PascalCase` + `Event` | `NoteCreatedEvent` |

## Bootstrap Flow

```
1. server.cloudflare.ts
   └── createCruzApp({ schema, modules, adapter, pages })
       ├── Set database schema
       ├── Create CruzContainer
       ├── Load Core modules (Auth, Email, Job, Upload, Shared)
       ├── Load Start modules (Org, Members, Permissions)
       ├── Load Pro modules (Billing, Admin)
       ├── Load your feature modules
       ├── Register tRPC routers
       ├── Register event listeners
       └── Run boot phase

2. entry.server.tsx (per request)
   └── CloudflareContext.init(loadContext)  # Extract D1/KV/R2 bindings
```

## Request Flow

```
Browser → React Router Loader/Action
  → /api/trpc/* endpoint
    → tRPC procedure (public | protected | org)
      → requirePermission() (if org-scoped)
        → Service class (from DI container)
          → Drizzle query (D1 in prod, SQLite locally)
            → JSON response
```

## Feature Module Pattern

Every feature is self-contained. Routes live inside the feature, not in a global routes folder:

```typescript
// src/routes.ts — point to feature route files
import { prefix, index, route } from '@react-router/dev/routes';

export default [
  ...prefix('notes', [
    index('features/notes/routes/index.tsx'),
    route(':id', 'features/notes/routes/$id.tsx'),
  ]),
] satisfies RouteConfig;
```

Register features in `server.cloudflare.ts`:

```typescript
import { createCruzApp } from '@cruzjs/core';
import { CloudflareAdapter } from '@cruzjs/adapter-cloudflare';
import { StartModule } from '@cruzjs/start';
import * as schema from './database/schema';
import { NotesModule } from './features/notes';

export default createCruzApp({
  schema,
  modules: [StartModule, NotesModule],
  adapter: new CloudflareAdapter(),
  pages: () => import('virtual:react-router/server-build'),
});
```
