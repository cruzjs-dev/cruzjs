# Architecture

## Project Structure

```
src/
├── entry.server.tsx        # SSR entry — imports app.server, re-exports framework handler
├── entry.client.tsx        # Client-side hydration
├── root.tsx                # Root React component with providers
├── routes.ts               # React Router route config (createCruzRoutes)
├── app.server.ts           # App bootstrap (setSchema + registerModules)
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
1. src/app.server.ts
   ├── DrizzleService.setSchema(schema)
   └── registerModules([StartModule, ...your feature modules])
       ├── Create CruzContainer
       ├── Load Core modules (Auth, Email, Job, Upload, Shared)
       ├── Load Start modules (Org, Members, Permissions)
       ├── Load Pro modules (Billing, Admin)
       ├── Load your feature modules
       ├── Register tRPC routers
       ├── Register event listeners
       └── Run boot phase

2. src/entry.server.tsx
   ├── import './app.server'   # runs the registration above
   └── re-exports the framework request handler
       # Cloudflare env→process.env bridging and waitUntil are handled automatically
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
import { type RouteConfig, route, index, layout, prefix } from '@react-router/dev/routes';
import { createCruzRoutes } from '@cruzjs/core/routing';
import { registerCruzStartRoutes } from '@cruzjs/start/routing';

export default createCruzRoutes({
  route, index, layout, prefix,
  dir: import.meta.dirname,
  framework: {
    registrars: [registerCruzStartRoutes],
  },
  routes: [
    index('routes/index.tsx'),
    ...prefix('notes', [
      index('features/notes/routes/index.tsx'),
      route(':id', 'features/notes/routes/$id.tsx'),
    ]),
  ],
}) satisfies RouteConfig;
```

Register features in `src/app.server.ts`:

```typescript
import 'reflect-metadata';
import { DrizzleService } from '@cruzjs/core/shared/database/drizzle.service';
import { registerModules } from '@cruzjs/core/framework/module-registry';
import { StartModule } from '@cruzjs/start/start.module';
import * as schema from './database/schema';
import { NotesModule } from './features/notes';

DrizzleService.setSchema(schema);

registerModules([StartModule, NotesModule]);
```
