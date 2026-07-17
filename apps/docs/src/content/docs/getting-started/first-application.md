---
title: Build Your First Feature
description: Step-by-step tutorial building a "Notes" feature with database schema, service, tRPC router, and React UI.
---

This tutorial walks through building a complete "Notes" feature in CruzJS, covering every layer of the stack: database schema, service class, validation, tRPC router, module, and React UI.

By the end, you will have a fully functional notes CRUD with type-safe API calls from the frontend.

## Prerequisites

Make sure you have a CruzJS project set up and running. If not, follow the [Installation guide](/getting-started/installation) first.

## Step 1: Create the Feature Directory

Create the feature module structure, including the `routes/` subdirectory for co-located route files:

```bash
mkdir -p src/features/notes/routes
```

## Step 2: Define the Database Schema

Create `src/features/notes/notes.schema.ts`:

```typescript
import { DrizzleUniversalFactory } from '@cruzjs/drizzle-universal';
import { createId } from '@paralleldrive/cuid2';
import { authIdentity } from '@cruzjs/core';

const f = DrizzleUniversalFactory.create((b) => ({
  notes: b.table('Notes', {
    id: b.text('id').primaryKey().$defaultFn(() => createId()),

    // Owner — every note belongs to a user
    userId: b.text('userId')
      .notNull()
      .references(() => authIdentity.id, { onDelete: 'cascade' }),

    // Data fields
    title: b.text('title').notNull(),
    content: b.text('content'),

    // Timestamps
    createdAt: b.timestamp('createdAt')
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: b.timestamp('updatedAt')
      .notNull()
      .$defaultFn(() => new Date()),
  }),
}));

export const notes = f.notes;

// Type exports for use in services and routers
export type Note = typeof notes.$inferSelect;
export type NewNote = typeof notes.$inferInsert;
```

CruzJS uses Drizzle ORM with `DrizzleUniversalFactory`, which generates the correct column types for your chosen adapter (SQLite for Cloudflare D1, PostgreSQL for AWS/GCP/Azure, etc.). Primary keys use CUID2 for globally unique, URL-safe identifiers.

### Register the Schema

Export the new table from `src/database/schema.ts`:

```typescript
// Existing re-exports
export * from '@cruzjs/start/database/schema';

// Add your feature schema
export * from '../features/notes/notes.schema';
```

Generate and apply the migration:

```bash
cruz db generate
cruz db migrate
```

## Step 3: Create Validation Schemas

Create `src/features/notes/notes.validation.ts`:

```typescript
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

Zod schemas serve double duty: they validate input in tRPC procedures and generate TypeScript types. The types are inferred automatically, so you never have to keep them in sync manually.

## Step 4: Create the Service

Create `src/features/notes/notes.service.ts`:

```typescript
import { Injectable, Inject } from '@cruzjs/core/di';
import { DRIZZLE, type DrizzleDatabase } from '@cruzjs/core/shared/database/drizzle.service';
import { eq, desc } from 'drizzle-orm';
import { notes } from './notes.schema';
import type { CreateNoteInput, UpdateNoteInput } from './notes.validation';

@Injectable()
export class NotesService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDatabase
  ) {}

  /** List all notes for a user, newest first */
  async listByUser(userId: string) {
    return this.db
      .select()
      .from(notes)
      .where(eq(notes.userId, userId))
      .orderBy(desc(notes.createdAt));
  }

  /** Get a single note by ID */
  async getById(id: string) {
    const [note] = await this.db
      .select()
      .from(notes)
      .where(eq(notes.id, id))
      .limit(1);
    return note ?? null;
  }

  /** Create a new note */
  async create(userId: string, input: CreateNoteInput) {
    const [note] = await this.db
      .insert(notes)
      .values({
        userId,
        title: input.title,
        content: input.content,
      })
      .returning();
    return note;
  }

  /** Update an existing note */
  async update(id: string, input: UpdateNoteInput) {
    const [note] = await this.db
      .update(notes)
      .set({
        ...input,
        updatedAt: new Date(),
      })
      .where(eq(notes.id, id))
      .returning();
    return note ?? null;
  }

  /** Delete a note */
  async delete(id: string) {
    await this.db
      .delete(notes)
      .where(eq(notes.id, id));
  }
}
```

Services are decorated with `@Injectable()` so the DI container can manage their lifecycle. The `DRIZZLE` token injects the active database instance, with the underlying driver determined by your adapter.

## Step 5: Create the tRPC Router

Create `src/features/notes/notes.router.ts`:

```typescript
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { getAppContainer } from '@cruzjs/core';
import { router, protectedProcedure } from '@cruzjs/core/trpc/context';
import { NotesService } from './notes.service';
import { createNoteSchema, updateNoteSchema } from './notes.validation';

export const notesRouter = router({
  /** List the current user's notes */
  list: protectedProcedure.query(async ({ ctx }) => {
    const container = await getAppContainer();
    const service = container.resolve(NotesService);

    return service.listByUser(ctx.session.user.id);
  }),

  /** Get a single note by ID */
  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const container = await getAppContainer();
      const service = container.resolve(NotesService);

      const note = await service.getById(input.id);

      // Verify the note belongs to the current user
      if (!note || note.userId !== ctx.session.user.id) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Note not found',
        });
      }

      return note;
    }),

  /** Create a new note */
  create: protectedProcedure
    .input(createNoteSchema)
    .mutation(async ({ ctx, input }) => {
      const container = await getAppContainer();
      const service = container.resolve(NotesService);

      return service.create(ctx.session.user.id, input);
    }),

  /** Update a note */
  update: protectedProcedure
    .input(z.object({
      id: z.string(),
      data: updateNoteSchema,
    }))
    .mutation(async ({ ctx, input }) => {
      const container = await getAppContainer();
      const service = container.resolve(NotesService);

      const note = await service.getById(input.id);
      if (!note || note.userId !== ctx.session.user.id) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Note not found',
        });
      }

      return service.update(input.id, input.data);
    }),

  /** Delete a note */
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const container = await getAppContainer();
      const service = container.resolve(NotesService);

      const note = await service.getById(input.id);
      if (!note || note.userId !== ctx.session.user.id) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Note not found',
        });
      }

      await service.delete(input.id);
      return { success: true };
    }),
});
```

Key patterns:

- **`protectedProcedure`** ensures the user is authenticated. Use `orgProcedure` instead if your data is scoped to an organization rather than a user.
- **`getAppContainer()`** resolves services from the DI container. Never instantiate services with `new`.
- **Ownership checks** verify the note belongs to the current user before allowing reads, updates, or deletes.

## Step 6: Create the Module

Create `src/features/notes/notes.module.ts`:

```typescript
import { Module } from '@cruzjs/core/di';
import { NotesService } from './notes.service';
import { notesRouter } from './notes.router';

@Module({
  providers: [NotesService],
  trpcRouters: {
    notes: notesRouter, // Available as trpc.notes.*
  },
})
export class NotesModule {}
```

Create `src/features/notes/index.ts`:

```typescript
export { NotesModule } from './notes.module';
export { notesRouter } from './notes.router';
export { NotesService } from './notes.service';
export { notes } from './notes.schema';
export type { Note, NewNote } from './notes.schema';
```

## Step 7: Register the Module

Add the module to your `createCruzApp()` call:

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

The `@Module` decorator in `NotesModule` automatically registers both the `NotesService` as an injectable provider and the `notesRouter` under the `notes` namespace. No additional router registration is needed.

## Step 8: Build the UI

Route files live inside the feature directory at `src/features/notes/routes/`.

### Notes list page

Create `src/features/notes/routes/index.tsx`:

```tsx
import { useState } from 'react';
import { trpc } from '@/trpc/client';
import { Link } from 'react-router';

export default function NotesPage() {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  // Fetch all notes
  const { data: notesList, isLoading, refetch } = trpc.notes.list.useQuery();

  // Create mutation
  const createNote = trpc.notes.create.useMutation({
    onSuccess: () => {
      setTitle('');
      setContent('');
      refetch();
    },
  });

  // Delete mutation
  const deleteNote = trpc.notes.delete.useMutation({
    onSuccess: () => refetch(),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    createNote.mutate({ title, content: content || undefined });
  };

  if (isLoading) {
    return <div className="p-8">Loading notes...</div>;
  }

  return (
    <div className="max-w-2xl mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">My Notes</h1>

      {/* Create form */}
      <form onSubmit={handleSubmit} className="mb-8 space-y-4">
        <input
          type="text"
          placeholder="Note title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full px-4 py-2 border rounded"
          required
        />
        <textarea
          placeholder="Content (optional)"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="w-full px-4 py-2 border rounded"
          rows={3}
        />
        <button
          type="submit"
          disabled={createNote.isPending}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {createNote.isPending ? 'Creating...' : 'Add Note'}
        </button>
      </form>

      {/* Notes list */}
      {notesList?.length === 0 ? (
        <p className="text-gray-500">No notes yet. Create your first one above.</p>
      ) : (
        <ul className="space-y-4">
          {notesList?.map((note) => (
            <li
              key={note.id}
              className="p-4 border rounded flex justify-between items-start"
            >
              <Link to={`/notes/${note.id}`} className="flex-1">
                <h3 className="font-semibold">{note.title}</h3>
                {note.content && (
                  <p className="text-gray-600 mt-1">{note.content}</p>
                )}
                <time className="text-sm text-gray-400 mt-2 block">
                  {new Date(note.createdAt).toLocaleDateString()}
                </time>
              </Link>
              <button
                onClick={() => deleteNote.mutate({ id: note.id })}
                disabled={deleteNote.isPending}
                className="text-red-500 hover:text-red-700 text-sm"
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

### Note detail page

Create `src/features/notes/routes/$id.tsx`:

```tsx
import { useParams, Link } from 'react-router';
import { trpc } from '@/trpc/client';

export default function NoteDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: note, isLoading } = trpc.notes.get.useQuery({ id: id! });

  if (isLoading) {
    return <div className="p-8">Loading note...</div>;
  }

  if (!note) {
    return <div className="p-8">Note not found.</div>;
  }

  return (
    <div className="max-w-2xl mx-auto p-8">
      <Link to="/notes" className="text-blue-600 hover:underline text-sm">
        &larr; Back to notes
      </Link>
      <h1 className="text-2xl font-bold mt-4 mb-2">{note.title}</h1>
      <time className="text-sm text-gray-400 block mb-4">
        {new Date(note.createdAt).toLocaleDateString()}
      </time>
      {note.content && (
        <p className="text-gray-700 whitespace-pre-wrap">{note.content}</p>
      )}
    </div>
  );
}
```

### Register the routes

Add the notes routes to `src/routes.ts`:

```typescript
import { type RouteConfig, route, index, layout, prefix } from '@react-router/dev/routes';

export default [
  // ... existing routes

  // Notes feature routes
  ...prefix('notes', [
    index('features/notes/routes/index.tsx'),
    route(':id', 'features/notes/routes/$id.tsx'),
  ]),
] satisfies RouteConfig;
```

## Step 9: Test It

Start the dev server and visit `http://localhost:5000/notes`:

```bash
cruz dev
```

You should be able to:

1. See an empty notes list
2. Add a note with a title and optional content
3. See the note appear in the list
4. Click a note to view its detail page
5. Delete a note

All API calls are fully type-safe, from the Zod validation schemas through the tRPC router to the React `useQuery` and `useMutation` hooks.

## Recap

Here is what you built and the file each piece lives in:

| Layer | File | Purpose |
|-------|------|---------|
| Schema | `features/notes/notes.schema.ts` | Drizzle table definition with CUID primary key |
| Validation | `features/notes/notes.validation.ts` | Zod schemas for create/update inputs |
| Service | `features/notes/notes.service.ts` | `@Injectable` class with CRUD operations |
| Router | `features/notes/notes.router.ts` | tRPC endpoints with auth and ownership checks |
| Module | `features/notes/notes.module.ts` | `@Module` declaring providers and trpcRouters |
| Registration | `server.cloudflare.ts` | Adds module to the `modules` array in `createCruzApp` |
| Schema export | `database/schema.ts` | Re-exports the notes table for Drizzle |
| List page | `features/notes/routes/index.tsx` | Notes list with create form |
| Detail page | `features/notes/routes/$id.tsx` | Single note view |
| Route config | `routes.ts` | Registers feature routes with React Router |

## Next Steps

- [Configuration](/getting-started/configuration) -- add environment-specific settings
- [Deployment](/getting-started/deployment) -- deploy your app to Cloudflare Pages
- Add organization scoping by switching from `protectedProcedure` to `orgProcedure` and adding an `orgId` column
- Add domain events by creating an `events/` directory in your feature and registering listeners in the `@Module`
