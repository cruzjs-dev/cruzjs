---
title: Schema Definition
description: Defining database tables with the DrizzleUniversalFactory — dialect-agnostic column types, primary keys, timestamps, foreign keys, indexes, and type inference.
---

CruzJS schemas use `DrizzleUniversalFactory` from `@cruzjs/drizzle-universal` so that the same table definition works on SQLite (Cloudflare D1) and PostgreSQL (all other adapters). You write your schema once using the factory's column builders, and the framework produces the correct dialect-specific columns at runtime.

## The factory pattern

Every schema file exports a factory function created with `DrizzleUniversalFactory.create`. The factory receives a builder object `b` with methods for creating tables, columns, and indexes. You call the factory with no arguments to get the table objects for the active dialect:

```typescript
// apps/web/src/features/projects/project.schema.ts
import { DrizzleUniversalFactory } from '@cruzjs/drizzle-universal';
import { createId } from '@paralleldrive/cuid2';
import { organizations } from '@cruzjs/start/database/schema';

const generateId = () => createId();

export const createProjectSchema = DrizzleUniversalFactory.create((b) => {
  const projectsTable = b.table('Project', {
    id: b.text('id').primaryKey().$defaultFn(generateId),
    orgId: b.text('orgId').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
    name: b.text('name').notNull(),
    description: b.text('description'),
    isActive: b.boolean('isActive').default(true).notNull(),
    priority: b.integer('priority').default(0).notNull(),
    price: b.real('price'),
    metadata: b.json<Record<string, unknown>>('metadata'),
    deletedAt: b.timestamp('deletedAt'),
    createdAt: b.timestamp('createdAt').notNull().$defaultFn(() => new Date().toISOString()),
    updatedAt: b.timestamp('updatedAt').notNull().$defaultFn(() => new Date().toISOString()),
  }, (table) => ({
    orgIdIdx: b.index('Project_orgId_idx').on(table.orgId),
    nameUniqueIdx: b.uniqueIndex('Project_orgId_name_idx').on(table.orgId, table.name),
  }));

  return { projects: projectsTable };
});

// Default export — uses active adapter's dialect at runtime
const _schema = createProjectSchema();
export const projects = _schema.projects;
export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;
```

The key parts:

1. `DrizzleUniversalFactory.create((b) => { ... })` defines the schema using dialect-agnostic builders.
2. The callback returns an object whose values are the tables created with `b.table()`.
3. Calling the returned factory (`createProjectSchema()`) produces the concrete table objects for the active dialect.
4. Export the table objects and inferred types for use throughout your application.

## Column types

### b.text

String columns. Maps to `text` on SQLite and `varchar` on PostgreSQL.

```typescript
// Required string
name: b.text('name').notNull(),

// Optional string (nullable)
description: b.text('description'),

// With default value
status: b.text('status').notNull().default('DRAFT'),
```

### b.integer

Integer columns. Maps to `integer` on both dialects.

```typescript
priority: b.integer('priority').default(0).notNull(),
attempts: b.integer('attempts').default(0).notNull(),
size: b.integer('size').notNull(),
```

### b.real

Floating-point columns. Maps to `real` on SQLite and `double precision` on PostgreSQL.

```typescript
amount: b.real('amount').notNull(),
latitude: b.real('latitude'),
longitude: b.real('longitude'),
```

### b.boolean

Boolean columns. Always `boolean` in TypeScript. On PostgreSQL this uses a native `boolean` column; on SQLite it uses `integer` (0/1) with automatic conversion. You never need to specify `{ mode: 'boolean' }`.

```typescript
isActive: b.boolean('isActive').default(true).notNull(),
isBanned: b.boolean('isBanned').default(false),
isVerified: b.boolean('isVerified').default(false).notNull(),
```

### b.timestamp

Timestamp columns. Always `string` in TypeScript. On PostgreSQL this uses `timestamp with time zone`; on SQLite it stores ISO-8601 strings as text. Use `new Date().toISOString()` when setting values.

```typescript
// Auto-set on insert
createdAt: b.timestamp('createdAt').notNull().$defaultFn(() => new Date().toISOString()),
updatedAt: b.timestamp('updatedAt').notNull().$defaultFn(() => new Date().toISOString()),

// Optional timestamps (set manually)
deletedAt: b.timestamp('deletedAt'),
expiresAt: b.timestamp('expiresAt').notNull(),
completedAt: b.timestamp('completedAt'),
```

When updating a record, set `updatedAt` explicitly:

```typescript
await db.update(projects)
  .set({ name: 'New Name', updatedAt: new Date().toISOString() })
  .where(eq(projects.id, id));
```

### b.json\<T\>

Typed JSON columns. Always `T` in TypeScript. On PostgreSQL this uses `jsonb`; on SQLite it stores serialized text with automatic parsing. You never need to call `JSON.parse()` or `JSON.stringify()` manually.

```typescript
// Typed JSON object
metadata: b.json<Record<string, unknown>>('metadata'),

// Typed JSON with a specific interface
settings: b.json<UserSettings>('settings'),

// With a default
preferences: b.json<UserPreferences>('preferences').default({}),
```

Reading and writing JSON columns works directly with the typed value:

```typescript
// Reading — already parsed to the typed object
const [project] = await db.select().from(projects).where(eq(projects.id, id));
const meta = project.metadata; // Record<string, unknown> | null

// Writing — pass the object directly
await db.update(projects)
  .set({ metadata: { version: 2, tags: ['important'] } })
  .where(eq(projects.id, id));
```

## Primary keys with CUID2

Every table uses a text primary key with CUID2 auto-generation. CUIDs are collision-resistant, URL-safe, and don't leak creation order like sequential IDs.

```typescript
import { createId } from '@paralleldrive/cuid2';

const generateId = () => createId();

// In the factory callback:
id: b.text('id').primaryKey().$defaultFn(generateId),
```

The `$defaultFn` runs at insert time on the application side (not in the database), so the ID is available immediately after calling `.values()` without needing a `RETURNING` clause.

## Foreign keys

Define foreign keys with `references()` and specify delete behavior with `onDelete`:

```typescript
export const createCommentSchema = DrizzleUniversalFactory.create((b) => {
  const commentsTable = b.table('Comment', {
    id: b.text('id').primaryKey().$defaultFn(generateId),

    // Cascade delete: when the org is deleted, all its comments are deleted
    orgId: b.text('orgId').notNull().references(() => organizations.id, { onDelete: 'cascade' }),

    // Cascade delete: when the user is deleted, their comments are deleted
    createdById: b.text('createdById').notNull().references(() => authIdentity.id, { onDelete: 'cascade' }),

    // Set null: when the referenced user is deleted, this field becomes null
    assignedTo: b.text('assignedTo').references(() => authIdentity.id, { onDelete: 'set null' }),

    // No action (default): prevents deleting the referenced record
    projectId: b.text('projectId').notNull().references(() => projects.id),

    content: b.text('content').notNull(),
    createdAt: b.timestamp('createdAt').notNull().$defaultFn(() => new Date().toISOString()),
  });

  return { comments: commentsTable };
});
```

Common `onDelete` behaviors:
- **`cascade`** -- Delete child records when the parent is deleted. Use for org-scoped data, user-owned data.
- **`set null`** -- Set the foreign key to `null` when the parent is deleted. Use for optional relationships like "assigned to" where you want to keep the record.
- **No action** (default) -- Prevent deleting the parent while child records exist.

## Indexes

Define indexes in the third argument to `b.table`. Always index foreign keys and columns used in `WHERE` clauses.

```typescript
const tasksTable = b.table('Task', {
  id: b.text('id').primaryKey().$defaultFn(generateId),
  orgId: b.text('orgId').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  projectId: b.text('projectId').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  status: b.text('status').notNull().default('TODO'),
  priority: b.integer('priority').default(0).notNull(),
  createdAt: b.timestamp('createdAt').notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  // Single-column indexes on foreign keys
  orgIdIdx: b.index('Task_orgId_idx').on(table.orgId),
  projectIdIdx: b.index('Task_projectId_idx').on(table.projectId),

  // Composite index for common query patterns
  statusPriorityIdx: b.index('Task_status_priority_idx').on(table.status, table.priority),

  // Composite index for polling queries
  pollIdx: b.index('Task_poll_idx').on(table.status, table.priority, table.createdAt),
}));
```

Naming convention: `TableName_columnName_idx` for single-column indexes, `TableName_col1_col2_idx` for composites.

## Unique constraints

Use `.unique()` for single-column uniqueness or `b.uniqueIndex()` for composite uniqueness:

```typescript
export const createAuthSchema = DrizzleUniversalFactory.create((b) => {
  const authIdentityTable = b.table('AuthIdentity', {
    id: b.text('id').primaryKey().$defaultFn(generateId),
    // Single column unique
    email: b.text('email').notNull().unique(),
    emailVerificationToken: b.text('emailVerificationToken').unique(),
    // ...
  });

  return { authIdentity: authIdentityTable };
});

export const createOrgMemberSchema = DrizzleUniversalFactory.create((b) => {
  const orgMembersTable = b.table('OrgMember', {
    id: b.text('id').primaryKey().$defaultFn(generateId),
    orgId: b.text('orgId').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
    userId: b.text('userId').notNull().references(() => authIdentity.id, { onDelete: 'cascade' }),
    role: b.text('role').notNull().default('member'),
    createdAt: b.timestamp('createdAt').notNull().$defaultFn(() => new Date().toISOString()),
    updatedAt: b.timestamp('updatedAt').notNull().$defaultFn(() => new Date().toISOString()),
  }, (table) => ({
    // Composite unique: a user can only be a member of an org once
    orgUserIdx: b.uniqueIndex('OrgMember_orgId_userId_idx').on(table.orgId, table.userId),
  }));

  return { orgMembers: orgMembersTable };
});
```

## Enums via text columns

Use `b.text()` columns with app-level validation for enum-like values. This approach works on every dialect without relying on database-specific enum types. Define the allowed values as a TypeScript const array:

```typescript
// Define allowed values
export const TaskStatusValues = ['TODO', 'IN_PROGRESS', 'DONE', 'CANCELLED'] as const;
export type TaskStatus = (typeof TaskStatusValues)[number];

// In the factory callback:
status: b.text('status').notNull().default('TODO'),
```

Validate at the service or tRPC layer using Zod:

```typescript
import { z } from 'zod';
import { TaskStatusValues } from './task.schema';

const updateTaskInput = z.object({
  status: z.enum(TaskStatusValues),
});
```

## Soft delete pattern

Add a nullable `b.timestamp('deletedAt')` column to support soft deletion. Records with a non-null `deletedAt` are considered deleted but remain in the database for recovery or auditing.

```typescript
// In the factory callback:
deletedAt: b.timestamp('deletedAt'), // null = active, ISO string = deleted
```

Always filter out soft-deleted records in queries:

```typescript
import { eq, and, isNull } from 'drizzle-orm';

// List active organizations
const activeOrgs = await db
  .select()
  .from(organizations)
  .where(and(
    eq(organizations.ownerId, userId),
    isNull(organizations.deletedAt)
  ));

// Soft delete
await db
  .update(organizations)
  .set({ deletedAt: new Date().toISOString() })
  .where(eq(organizations.id, orgId));
```

## Drizzle relations

Define relations for use with Drizzle's relational query API. Relations are metadata only -- they don't create foreign keys in the database (use `references()` for that).

```typescript
import { relations } from 'drizzle-orm';

export const organizationsRelations = relations(organizations, ({ one, many }) => ({
  owner: one(authIdentity, { fields: [organizations.ownerId], references: [authIdentity.id] }),
  members: many(orgMembers),
  invitations: many(invitations),
}));

export const orgMembersRelations = relations(orgMembers, ({ one }) => ({
  organization: one(organizations, { fields: [orgMembers.orgId], references: [organizations.id] }),
  user: one(authIdentity, { fields: [orgMembers.userId], references: [authIdentity.id] }),
}));
```

## Type inference

Drizzle provides `$inferSelect` and `$inferInsert` for extracting TypeScript types from your schema. Always export these from your schema file:

```typescript
// Select type: all columns, defaults resolved to their actual types
export type Project = typeof projects.$inferSelect;
// {
//   id: string;
//   orgId: string;
//   name: string;
//   description: string | null;
//   isActive: boolean;
//   priority: number;
//   price: number | null;
//   metadata: Record<string, unknown> | null;
//   deletedAt: string | null;
//   createdAt: string;
//   updatedAt: string;
// }

// Insert type: columns with defaults are optional
export type NewProject = typeof projects.$inferInsert;
// {
//   id?: string;          // has $defaultFn
//   orgId: string;
//   name: string;
//   description?: string | null;
//   isActive?: boolean;   // has default
//   priority?: number;    // has default
//   price?: number | null;
//   metadata?: Record<string, unknown> | null;
//   deletedAt?: string | null;
//   createdAt?: string;   // has $defaultFn
//   updatedAt?: string;   // has $defaultFn
// }
```

Use these types in your service methods:

```typescript
import type { Project, NewProject } from './project.schema';

@injectable()
export class ProjectService {
  constructor(@inject(DRIZZLE) private readonly db: CruzDatabase) {}

  async create(input: Omit<NewProject, 'id' | 'createdAt' | 'updatedAt'>): Promise<Project> {
    const [project] = await this.db
      .insert(projects)
      .values(input)
      .returning();
    return project;
  }
}
```

## Registering schemas

All schemas must be exported from the central schema file at `apps/web/src/database/schema.ts`. This file is what Drizzle Kit reads when generating migrations:

```typescript
// apps/web/src/database/schema.ts

// Framework schemas (re-exported through @cruzjs/start)
export * from '@cruzjs/start/database/schema';

// Your application schemas
export * from '../features/projects/project.schema';
export * from '../features/tasks/task.schema';
```

After adding a new schema file, run `cruz db generate` to create the migration, then `cruz db migrate` to apply it.
