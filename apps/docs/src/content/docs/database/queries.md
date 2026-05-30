---
title: Queries
description: Writing select, insert, update, and delete queries with Drizzle ORM — filters, joins, aggregations, ordering, pagination, and raw SQL.
---

All database queries in CruzJS use Drizzle ORM's SQL-like query builder. Queries are type-safe, composable, and work identically across all supported databases.

## Importing operators

Drizzle provides filter operators as standalone functions from `drizzle-orm`:

```typescript
import {
  eq,        // equal
  ne,        // not equal
  gt,        // greater than
  gte,       // greater than or equal
  lt,        // less than
  lte,       // less than or equal
  like,      // SQL LIKE
  and,       // combine conditions with AND
  or,        // combine conditions with OR
  not,       // negate a condition
  isNull,    // IS NULL
  isNotNull, // IS NOT NULL
  inArray,   // IN (...)
  notInArray,// NOT IN (...)
  between,   // BETWEEN
  desc,      // ORDER BY DESC
  asc,       // ORDER BY ASC
  count,     // COUNT(*)
  sql,       // raw SQL
} from 'drizzle-orm';
```

## Select queries

### Select all columns

```typescript
const allProjects = await this.db
  .select()
  .from(projects)
  .where(eq(projects.orgId, orgId));
```

### Select specific columns

```typescript
const projectNames = await this.db
  .select({
    id: projects.id,
    name: projects.name,
  })
  .from(projects)
  .where(eq(projects.orgId, orgId));
// Type: { id: string; name: string }[]
```

### Select a single record

Drizzle always returns arrays. Destructure and use `?? null` for single-record lookups:

```typescript
async getById(id: string): Promise<Project | null> {
  const [project] = await this.db
    .select()
    .from(projects)
    .where(eq(projects.id, id))
    .limit(1);
  return project ?? null;
}
```

### Filtering with where

Combine conditions with `and()` and `or()`:

```typescript
// Multiple AND conditions
const activeProjects = await this.db
  .select()
  .from(projects)
  .where(and(
    eq(projects.orgId, orgId),
    eq(projects.isActive, true),
    isNull(projects.deletedAt)
  ));

// OR conditions
const urgentTasks = await this.db
  .select()
  .from(tasks)
  .where(and(
    eq(tasks.orgId, orgId),
    or(
      eq(tasks.priority, 'HIGH'),
      eq(tasks.priority, 'CRITICAL')
    )
  ));

// LIKE for pattern matching
const matchingUsers = await this.db
  .select()
  .from(authIdentity)
  .where(like(authIdentity.email, `%@${domain}`));
```

### Ordering

```typescript
// Single column
const recentProjects = await this.db
  .select()
  .from(projects)
  .where(eq(projects.orgId, orgId))
  .orderBy(desc(projects.createdAt));

// Multiple columns
const members = await this.db
  .select()
  .from(orgMembers)
  .where(eq(orgMembers.orgId, orgId))
  .orderBy(asc(orgMembers.role), asc(orgMembers.createdAt));
```

### Pagination with limit and offset

```typescript
async list(orgId: string, page: number, pageSize: number = 20): Promise<Project[]> {
  return this.db
    .select()
    .from(projects)
    .where(eq(projects.orgId, orgId))
    .orderBy(desc(projects.createdAt))
    .limit(pageSize)
    .offset((page - 1) * pageSize);
}
```

### IN queries

```typescript
// Select by multiple IDs
const selectedProjects = await this.db
  .select()
  .from(projects)
  .where(inArray(projects.id, projectIds));
```

## Insert queries

### Insert a single record

Use `.returning()` to get the inserted row with all defaults resolved:

```typescript
async create(orgId: string, userId: string, input: CreateProjectInput): Promise<Project> {
  const [project] = await this.db
    .insert(projects)
    .values({
      orgId,
      createdById: userId,
      name: input.name,
      description: input.description,
    })
    .returning();
  return project;
}
```

Fields with `$defaultFn` (like `id`, `createdAt`, `updatedAt`) are automatically populated.

### Batch insert

Pass an array to `.values()`:

```typescript
async createMany(items: NewProject[]): Promise<Project[]> {
  return this.db
    .insert(projects)
    .values(items)
    .returning();
}
```

### Insert with conflict handling

Use `.onConflictDoNothing()` or `.onConflictDoUpdate()`:

```typescript
// Skip if duplicate
await this.db
  .insert(notificationPreferences)
  .values({ userId, orgId, eventType, channel, enabled: true })
  .onConflictDoNothing();

// Upsert: insert or update on conflict
await this.db
  .insert(notificationPreferences)
  .values({ userId, orgId, eventType, channel, enabled })
  .onConflictDoUpdate({
    target: [
      notificationPreferences.userId,
      notificationPreferences.orgId,
      notificationPreferences.eventType,
      notificationPreferences.channel,
    ],
    set: { enabled, updatedAt: new Date().toISOString() },
  });
```

## Update queries

### Update with returning

```typescript
async update(id: string, input: UpdateProjectInput): Promise<Project | null> {
  const [project] = await this.db
    .update(projects)
    .set({
      ...input,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(projects.id, id))
    .returning();
  return project ?? null;
}
```

### Batch update

```typescript
// Deactivate multiple records
await this.db
  .update(projects)
  .set({ isActive: false, updatedAt: new Date().toISOString() })
  .where(inArray(projects.id, idsToDeactivate));
```

### Conditional update (scoped)

Always scope updates to the org or user that owns the record:

```typescript
async updateOrgProject(orgId: string, projectId: string, input: UpdateProjectInput): Promise<Project | null> {
  const [project] = await this.db
    .update(projects)
    .set({ ...input, updatedAt: new Date().toISOString() })
    .where(and(
      eq(projects.id, projectId),
      eq(projects.orgId, orgId)  // Prevent cross-org updates
    ))
    .returning();
  return project ?? null;
}
```

## Delete queries

### Hard delete

```typescript
await this.db
  .delete(projects)
  .where(eq(projects.id, id));
```

### Batch delete

```typescript
await this.db
  .delete(projects)
  .where(inArray(projects.id, idsToDelete));
```

### Scoped delete

```typescript
// Delete within org scope
await this.db
  .delete(orgMembers)
  .where(and(
    eq(orgMembers.orgId, orgId),
    eq(orgMembers.userId, userId)
  ));
```

## Joins

### Inner join

Returns only rows where both sides match:

```typescript
const projectsWithCreators = await this.db
  .select({
    id: projects.id,
    name: projects.name,
    creatorEmail: authIdentity.email,
  })
  .from(projects)
  .innerJoin(authIdentity, eq(projects.createdById, authIdentity.id))
  .where(eq(projects.orgId, orgId));
```

### Left join

Returns all rows from the left table, with `null` for unmatched right-side columns:

```typescript
const projectsWithProfiles = await this.db
  .select({
    projectId: projects.id,
    projectName: projects.name,
    creatorName: userProfile.fullName,
    creatorAvatar: userProfile.avatarUrl,
  })
  .from(projects)
  .leftJoin(userProfile, eq(projects.createdById, userProfile.userId))
  .where(eq(projects.orgId, orgId));
// creatorName and creatorAvatar will be string | null
```

### Multiple joins

```typescript
const membersWithDetails = await this.db
  .select({
    memberId: orgMembers.id,
    role: orgMembers.role,
    email: authIdentity.email,
    fullName: userProfile.fullName,
    avatarUrl: userProfile.avatarUrl,
  })
  .from(orgMembers)
  .innerJoin(authIdentity, eq(orgMembers.userId, authIdentity.id))
  .leftJoin(userProfile, eq(orgMembers.userId, userProfile.userId))
  .where(eq(orgMembers.orgId, orgId))
  .orderBy(asc(orgMembers.role), asc(orgMembers.createdAt));
```

## Aggregations

### Count

```typescript
async getCount(orgId: string): Promise<number> {
  const [result] = await this.db
    .select({ count: count() })
    .from(projects)
    .where(eq(projects.orgId, orgId));
  return result?.count ?? 0;
}
```

### Count with grouping

```typescript
const statusCounts = await this.db
  .select({
    status: tasks.status,
    count: count(),
  })
  .from(tasks)
  .where(eq(tasks.orgId, orgId))
  .groupBy(tasks.status);
// [{ status: 'TODO', count: 5 }, { status: 'DONE', count: 12 }]
```

## Subqueries

Use `db.select().from()` as a subquery with `sql`:

```typescript
import { sql } from 'drizzle-orm';

// Find users who are members of a specific org
const orgUsers = await this.db
  .select()
  .from(authIdentity)
  .where(
    inArray(
      authIdentity.id,
      this.db.select({ id: orgMembers.userId }).from(orgMembers).where(eq(orgMembers.orgId, orgId))
    )
  );
```

## Raw SQL

For queries that can't be expressed with the query builder, use the `sql` template tag.

:::caution
Raw SQL expressions using `` sql`...` `` are dialect-specific. Prefer Drizzle's query builder for portable code that works across all adapters (D1/SQLite, PostgreSQL).
:::

```typescript
import { sql } from 'drizzle-orm';

// Raw SQL in select — use simple, portable expressions when possible
const results = await this.db
  .select({
    id: projects.id,
    name: projects.name,
    isRecent: sql<boolean>`${projects.createdAt} > ${cutoffDate}`,
  })
  .from(projects)
  .where(eq(projects.orgId, orgId));

// Raw SQL in where
const filtered = await this.db
  .select()
  .from(projects)
  .where(sql`${projects.name} LIKE ${'%' + search + '%'}`);

// Fully raw query (dialect-specific — use sparingly)
const rawResults = await this.db.run(
  sql`SELECT COUNT(*) as total FROM Project WHERE orgId = ${orgId}`
);
```

## Complete service example

Putting it all together in an injectable service:

```typescript
import { injectable, inject } from 'inversify';
import { DRIZZLE, type DrizzleDatabase } from '@cruzjs/core/shared/database/drizzle.service';
import { eq, and, desc, isNull, inArray, count } from 'drizzle-orm';
import { projects, type Project, type NewProject } from './project.schema';

@injectable()
export class ProjectService {
  constructor(@inject(DRIZZLE) private readonly db: DrizzleDatabase) {}

  async getById(id: string): Promise<Project | null> {
    const [project] = await this.db
      .select()
      .from(projects)
      .where(eq(projects.id, id))
      .limit(1);
    return project ?? null;
  }

  async listByOrg(orgId: string): Promise<Project[]> {
    return this.db
      .select()
      .from(projects)
      .where(and(
        eq(projects.orgId, orgId),
        isNull(projects.deletedAt)
      ))
      .orderBy(desc(projects.createdAt));
  }

  async create(orgId: string, userId: string, input: { name: string; description?: string }): Promise<Project> {
    const [project] = await this.db
      .insert(projects)
      .values({
        orgId,
        createdById: userId,
        name: input.name,
        description: input.description,
      })
      .returning();
    return project;
  }

  async update(id: string, input: Partial<Pick<Project, 'name' | 'description' | 'isActive'>>): Promise<Project | null> {
    const [project] = await this.db
      .update(projects)
      .set({ ...input, updatedAt: new Date().toISOString() })
      .where(eq(projects.id, id))
      .returning();
    return project ?? null;
  }

  async softDelete(id: string): Promise<void> {
    await this.db
      .update(projects)
      .set({ deletedAt: new Date().toISOString() })
      .where(eq(projects.id, id));
  }

  async getCount(orgId: string): Promise<number> {
    const [result] = await this.db
      .select({ count: count() })
      .from(projects)
      .where(and(
        eq(projects.orgId, orgId),
        isNull(projects.deletedAt)
      ));
    return result?.count ?? 0;
  }
}
```
