---
title: Quick Start
description: Create a new CruzJS app and deploy it to Cloudflare in minutes.
---

This guide walks you through creating a new CruzJS application, running it locally, building a feature, and deploying to Cloudflare.

## Prerequisites

- **Node.js 20+** -- CruzJS uses modern Node APIs. Check with `node --version`.
- **Cloudflare account** (if deploying to Cloudflare) -- Free tier works. Needed for deployment and for local D1/KV/R2 emulation via Wrangler.

## Create a New App

```bash
npm create @cruzjs my-app
cd my-app
npm install
```

The scaffolder creates a complete project with `@cruzjs/core`, `@cruzjs/start`, and `@cruzjs/saas` installed as npm dependencies:

```
my-app/
├── src/
│   ├── entry.server.tsx        # SSR entry point
│   ├── entry.client.tsx        # Client hydration
│   ├── root.tsx                # Root React component
│   ├── routes.ts               # React Router route config
│   ├── server.cloudflare.ts     # App bootstrap (createCruzApp)
│   │
│   ├── database/
│   │   ├── schema.ts           # Central schema exports
│   │   └── migrations/         # Generated Drizzle migrations
│   │
│   ├── features/               # Feature modules
│   │   └── <feature-name>/
│   │       ├── <feature>.service.ts
│   │       ├── <feature>.router.ts
│   │       ├── <feature>.schema.ts
│   │       ├── routes/         # Feature-specific routes
│   │       │   ├── index.tsx
│   │       │   └── $id.tsx
│   │       └── ...
│   │
│   ├── components/             # Shared React components
│   └── trpc/
│       ├── client.ts           # tRPC React client
│       └── router.ts           # Combined AppRouter
│
├── external-processes/         # Standalone Workers (empty initially)
├── cruz.config.ts              # Cloudflare bindings and env config
├── wrangler.toml               # Generated Cloudflare config (do not edit)
├── vite.config.ts              # Vite config
├── package.json                # @cruzjs/* packages as dependencies
└── .env
```

## Run Locally

```bash
cruz dev
```

This starts the local development server with:
- React Router v7 dev server with HMR
- Local database (SQLite for Cloudflare adapter, PostgreSQL for others)
- Local KV and R2 emulation via Wrangler
- tRPC endpoint at `/api/trpc/*`

Visit [http://localhost:5000](http://localhost:5000) to see your app.

### Database Setup

On first run, apply the initial migrations:

```bash
cruz db migrate
```

Optionally seed with sample data:

```bash
cruz db seed
```

To explore your database visually:

```bash
cruz db studio
```

## Build a Feature

Let's build a complete "Notes" feature -- database table, service, API, and UI -- to see how CruzJS features come together. All files for this feature live inside `src/features/notes/`.

### Step 1: Define the Schema

Create the database table definition:

```typescript
// src/features/notes/notes.schema.ts
import { DrizzleUniversalFactory } from '@cruzjs/drizzle-universal';
import { createId } from '@paralleldrive/cuid2';

const f = DrizzleUniversalFactory.create((b) => ({
  notes: b.table('notes', {
    id: b.text('id').primaryKey().$defaultFn(() => createId()),
    orgId: b.text('org_id').notNull(),
    createdById: b.text('created_by_id').notNull(),
    title: b.text('title').notNull(),
    content: b.text('content'),
    createdAt: b.timestamp('created_at').$defaultFn(() => new Date()),
    updatedAt: b.timestamp('updated_at').$defaultFn(() => new Date()),
  }),
}));

export const notes = f.notes;

export type Note = typeof notes.$inferSelect;
export type NewNote = typeof notes.$inferInsert;
```

Export the schema from the central schema file:

```typescript
// src/database/schema.ts
// ... existing exports ...
export * from '../features/notes/notes.schema';
```

Generate and run the migration:

```bash
cruz db generate
cruz db migrate
```

### Step 2: Create Validation Schemas

Define Zod schemas for input validation:

```typescript
// src/features/notes/notes.validation.ts
import { z } from 'zod';

export const createNoteSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200).trim(),
  content: z.string().max(10000).optional(),
});

export const updateNoteSchema = z.object({
  title: z.string().min(1).max(200).trim().optional(),
  content: z.string().max(10000).optional().nullable(),
});

export type CreateNoteInput = z.infer<typeof createNoteSchema>;
export type UpdateNoteInput = z.infer<typeof updateNoteSchema>;
```

### Step 3: Create the Service

The service contains business logic and database queries:

```typescript
// src/features/notes/notes.service.ts
import { Injectable, Inject } from '@cruzjs/core/di';
import { DRIZZLE, type DrizzleDatabase } from '@cruzjs/core/shared/database/drizzle.service';
import { eq, and, desc } from 'drizzle-orm';
import { notes, type Note } from './notes.schema';
import type { CreateNoteInput, UpdateNoteInput } from './notes.validation';

@Injectable()
export class NotesService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDatabase,
  ) {}

  async list(orgId: string): Promise<Note[]> {
    return this.db
      .select()
      .from(notes)
      .where(eq(notes.orgId, orgId))
      .orderBy(desc(notes.createdAt));
  }

  async getById(id: string): Promise<Note | null> {
    const [note] = await this.db
      .select()
      .from(notes)
      .where(eq(notes.id, id))
      .limit(1);
    return note ?? null;
  }

  async create(orgId: string, userId: string, input: CreateNoteInput): Promise<Note> {
    const [note] = await this.db
      .insert(notes)
      .values({
        orgId,
        createdById: userId,
        title: input.title,
        content: input.content,
      })
      .returning();
    return note;
  }

  async update(id: string, input: UpdateNoteInput): Promise<Note | null> {
    const [note] = await this.db
      .update(notes)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(notes.id, id))
      .returning();
    return note ?? null;
  }

  async delete(id: string): Promise<void> {
    await this.db.delete(notes).where(eq(notes.id, id));
  }
}
```

### Step 4: Create the tRPC Router

The router exposes the service as type-safe API endpoints:

```typescript
// src/features/notes/notes.router.ts
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { getAppContainer } from '@cruzjs/core';
import { router, orgProcedure } from '@cruzjs/core/trpc/context';
import { requirePermission } from '@cruzjs/start/orgs/auth.utils';
import { NotesService } from './notes.service';
import { createNoteSchema, updateNoteSchema } from './notes.validation';

export const notesRouter = router({
  list: orgProcedure.query(async ({ ctx }) => {
    await requirePermission(ctx.org, 'notes:read');
    const container = await getAppContainer();
    const service = container.resolve(NotesService);
    return service.list(ctx.org.orgId);
  }),

  get: orgProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      await requirePermission(ctx.org, 'notes:read');
      const container = await getAppContainer();
      const service = container.resolve(NotesService);
      const note = await service.getById(input.id);
      if (!note || note.orgId !== ctx.org.orgId) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Note not found' });
      }
      return note;
    }),

  create: orgProcedure
    .input(createNoteSchema)
    .mutation(async ({ ctx, input }) => {
      await requirePermission(ctx.org, 'notes:write');
      const container = await getAppContainer();
      const service = container.resolve(NotesService);
      return service.create(ctx.org.orgId, ctx.org.userId, input);
    }),

  update: orgProcedure
    .input(z.object({ id: z.string(), data: updateNoteSchema }))
    .mutation(async ({ ctx, input }) => {
      await requirePermission(ctx.org, 'notes:write');
      const container = await getAppContainer();
      const service = container.resolve(NotesService);
      const note = await service.getById(input.id);
      if (!note || note.orgId !== ctx.org.orgId) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Note not found' });
      }
      return service.update(input.id, input.data);
    }),

  delete: orgProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await requirePermission(ctx.org, 'notes:delete');
      const container = await getAppContainer();
      const service = container.resolve(NotesService);
      const note = await service.getById(input.id);
      if (!note || note.orgId !== ctx.org.orgId) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Note not found' });
      }
      await service.delete(input.id);
      return { success: true };
    }),
});
```

### Step 5: Create the Module and Provider

Wire everything together with a module and service provider:

```typescript
// src/features/notes/notes.module.ts
import { Module } from '@cruzjs/core/di';
import { NotesService } from './notes.service';
import { notesRouter } from './notes.router';

@Module({
  providers: [NotesService],
  trpcRouters: {
    notes: notesRouter,
  },
})
export class NotesModule {}
```

```typescript
// src/features/notes/index.ts
export { NotesModule } from './notes.module';
export { notesRouter } from './notes.router';
```

### Step 6: Register the Module

Add the module to `createCruzApp()`:

```typescript
// server.cloudflare.ts
import { createCruzApp } from '@cruzjs/core';
import { CloudflareAdapter } from '@cruzjs/adapter-cloudflare';
import * as schema from './database/schema';
import { NotesModule } from './features/notes';

export default createCruzApp({
  schema,
  modules: [NotesModule],
  adapter: new CloudflareAdapter(),
  pages: () => import('virtual:react-router/server-build'),
});
```

### Step 7: Add Routes Inside the Feature

Create route components inside the feature folder:

```typescript
// src/features/notes/routes/index.tsx
import { useState } from 'react';
import { useOutletContext } from 'react-router';
import { trpc } from '~/trpc/client';
import type { OrgContext } from '@cruzjs/start';

export default function NotesPage() {
  const { currentUserRole } = useOutletContext<OrgContext>();
  const [title, setTitle] = useState('');
  const canWrite = currentUserRole === 'OWNER' || currentUserRole === 'ADMIN' || currentUserRole === 'MEMBER';

  const { data: notes, isLoading, refetch } = trpc.notes.list.useQuery();

  const createMutation = trpc.notes.create.useMutation({
    onSuccess: () => {
      setTitle('');
      refetch();
    },
  });

  const deleteMutation = trpc.notes.delete.useMutation({
    onSuccess: () => refetch(),
  });

  if (isLoading) {
    return <div>Loading notes...</div>;
  }

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-bold text-slate-900">Notes</h1>

      {canWrite && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createMutation.mutate({ title });
          }}
          className="flex gap-2"
        >
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="New note title..."
            className="flex-1 rounded-lg border border-slate-300 px-3 py-2"
          />
          <button
            type="submit"
            disabled={!title.trim() || createMutation.isPending}
            className="rounded-lg bg-brand-600 px-4 py-2 text-white hover:bg-brand-700"
          >
            Add Note
          </button>
        </form>
      )}

      <div className="space-y-2">
        {notes?.map((note) => (
          <div key={note.id} className="flex items-center justify-between rounded-lg border border-slate-200 p-4">
            <span className="text-slate-900">{note.title}</span>
            {canWrite && (
              <button
                onClick={() => deleteMutation.mutate({ id: note.id })}
                className="text-sm text-red-600 hover:text-red-800"
              >
                Delete
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
```

Then configure the route in `src/routes.ts` to point at the feature's route file:

```typescript
// src/routes.ts
import { type RouteConfig } from 'react-router';

export default [
  // ... other routes
  {
    path: 'notes',
    file: 'src/features/notes/routes/index.tsx',
  },
] satisfies RouteConfig;
```

That's it. You now have a complete feature with a database table, validated API endpoints, permission-checked mutations, and a reactive UI -- all fully type-safe from the schema to the component, with the route colocated inside the feature folder.

## Deploy to Cloudflare

### First-time Setup

Initialize your production environment. This creates the D1 database, KV namespaces, and R2 buckets defined in your `cruz.config.ts`:

```bash
cruz init production
```

### Deploy

Build, migrate, and ship in one command:

```bash
cruz deploy production
```

This command:
1. Runs `cruz build` to create a production build
2. Runs `cruz db migrate --remote` to apply pending migrations to the remote D1 database
3. Deploys to Cloudflare Pages

Your app is now live on Cloudflare's global network.

### Preview Deploys

Deploy the current branch as a preview:

```bash
cruz deploy preview
```

This creates a unique preview URL you can share for testing and review.

### Check Status

View all your environments and their deployment status:

```bash
cruz status
```

## Next Steps

You've created an app, built a feature, and deployed to production. Here's where to go from here:

- **[Introduction](/prologue/introduction/)** -- Understand the philosophy and architecture
- **Dependency Injection** -- Learn about `@Module()`, `@Injectable()`, and the service provider pattern
- **Database** -- Deep dive into Drizzle ORM patterns and migrations
- **tRPC Routers** -- Procedure types, permissions, and client usage
- **Auth & Organizations** -- Multi-tenant auth, roles, and permissions
- **CLI Reference** -- Every command the `cruz` CLI provides
