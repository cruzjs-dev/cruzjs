---
title: Transactions
description: Using database transactions in CruzJS for atomic multi-table operations, error handling, and data consistency.
---

Transactions ensure that a group of database operations either all succeed or all fail. In CruzJS, transactions use Drizzle ORM's `db.transaction()` method, which wraps your database's native transaction support.

## Basic transaction

Call `db.transaction()` with an async callback. The callback receives a transaction object (`tx`) that you use instead of `db` for all queries within the transaction:

```typescript
async transferOwnership(orgId: string, itemId: string, newOwnerId: string): Promise<void> {
  await this.db.transaction(async (tx) => {
    // Verify the item exists and belongs to this org
    const [item] = await tx
      .select()
      .from(projects)
      .where(and(
        eq(projects.id, itemId),
        eq(projects.orgId, orgId)
      ))
      .limit(1);

    if (!item) {
      throw new Error('Project not found');
    }

    // Update ownership
    await tx
      .update(projects)
      .set({
        createdById: newOwnerId,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(projects.id, itemId));

    // Log the transfer
    await tx
      .insert(auditLogs)
      .values({
        orgId,
        userId: newOwnerId,
        action: 'TRANSFER_OWNERSHIP',
        resource: 'project',
        metadata: JSON.stringify({
          projectId: itemId,
          previousOwner: item.createdById,
          newOwner: newOwnerId,
        }),
      });
  });
}
```

If any operation within the callback throws an error, the entire transaction is rolled back automatically.

## Error handling

### Automatic rollback on throw

Throwing inside a transaction rolls back all changes:

```typescript
async createOrgWithOwner(name: string, slug: string, userId: string): Promise<Organization> {
  return this.db.transaction(async (tx) => {
    // Create the organization
    const [org] = await tx
      .insert(organizations)
      .values({ name, slug, ownerId: userId })
      .returning();

    // Add the creator as owner member
    await tx
      .insert(orgMembers)
      .values({
        orgId: org.id,
        userId,
        role: 'owner',
      });

    // Create default subscription
    const [sub] = await tx
      .insert(subscriptions)
      .values({
        orgId: org.id,
        status: 'active',
      })
      .returning();

    if (!sub) {
      // This throw rolls back the org and member creation too
      throw new Error('Failed to create subscription');
    }

    return org;
  });
}
```

### Catching transaction errors

Wrap the transaction call in try/catch to handle failures:

```typescript
async safeCreateProject(orgId: string, userId: string, input: CreateProjectInput): Promise<Project | null> {
  try {
    return await this.db.transaction(async (tx) => {
      const [project] = await tx
        .insert(projects)
        .values({
          orgId,
          createdById: userId,
          name: input.name,
        })
        .returning();

      // Create initial task
      await tx
        .insert(tasks)
        .values({
          orgId,
          projectId: project.id,
          title: 'Getting started',
          status: 'TODO',
        });

      return project;
    });
  } catch (error) {
    console.error('Failed to create project:', error);
    return null;
  }
}
```

## When to use transactions

### Use transactions when:

**Multiple related inserts must succeed together.** Creating an organization involves inserting into `Organization`, `OrgMember`, and `Subscription` tables. If the member insert fails, you don't want an orphaned organization.

```typescript
await this.db.transaction(async (tx) => {
  const [org] = await tx.insert(organizations).values({ name, slug, ownerId }).returning();
  await tx.insert(orgMembers).values({ orgId: org.id, userId: ownerId, role: 'owner' });
  await tx.insert(subscriptions).values({ orgId: org.id, status: 'active' });
});
```

**Read-then-write operations need consistency.** Checking a condition and then acting on it should happen atomically to prevent race conditions.

```typescript
await this.db.transaction(async (tx) => {
  // Check owner count before removing
  const owners = await tx
    .select()
    .from(orgMembers)
    .where(and(eq(orgMembers.orgId, orgId), eq(orgMembers.role, 'OWNER')));

  if (owners.length <= 1) {
    throw new Error('Cannot remove the last owner');
  }

  await tx
    .delete(orgMembers)
    .where(and(eq(orgMembers.orgId, orgId), eq(orgMembers.userId, userId)));
});
```

**Cascading updates across tables.** When updating one record requires updating related records to maintain consistency.

```typescript
await this.db.transaction(async (tx) => {
  // Soft delete the project
  await tx
    .update(projects)
    .set({ deletedAt: new Date().toISOString() })
    .where(eq(projects.id, projectId));

  // Cancel all pending tasks
  await tx
    .update(tasks)
    .set({ status: 'CANCELLED', updatedAt: new Date().toISOString() })
    .where(and(
      eq(tasks.projectId, projectId),
      eq(tasks.status, 'TODO')
    ));
});
```

### Skip transactions when:

- **Single insert/update/delete** — A single statement is already atomic.
- **Read-only queries** — Selects don't modify data and don't benefit from transactions.
- **Independent operations** — If two inserts can succeed or fail independently without data integrity issues, transactions add unnecessary overhead.

## Transaction with return values

Transactions can return values. The return type of `db.transaction()` matches whatever the callback returns:

```typescript
async createProjectWithTasks(
  orgId: string,
  userId: string,
  input: CreateProjectInput
): Promise<{ project: Project; tasks: Task[] }> {
  return this.db.transaction(async (tx) => {
    const [project] = await tx
      .insert(projects)
      .values({ orgId, createdById: userId, name: input.name })
      .returning();

    const createdTasks = await tx
      .insert(tasks)
      .values(
        input.taskNames.map((title) => ({
          orgId,
          projectId: project.id,
          title,
          status: 'TODO' as const,
        }))
      )
      .returning();

    return { project, tasks: createdTasks };
  });
}
```

## Nested operations in transactions

When a service method that normally uses `this.db` is called within a transaction, it won't be part of that transaction because it uses a different database reference. For operations that need to participate in a caller's transaction, accept the transaction object as an optional parameter:

```typescript
@injectable()
export class AuditLogService {
  constructor(@inject(DRIZZLE) private readonly db: DrizzleDatabase) {}

  async log(
    entry: NewAuditLog,
    tx?: CruzDatabase
  ): Promise<void> {
    const db = tx ?? this.db;
    await db.insert(auditLogs).values(entry);
  }
}

@injectable()
export class ProjectService {
  constructor(
    @inject(DRIZZLE) private readonly db: DrizzleDatabase,
    @inject(AuditLogService) private readonly auditLogs: AuditLogService,
  ) {}

  async delete(orgId: string, projectId: string, userId: string): Promise<void> {
    await this.db.transaction(async (tx) => {
      await tx
        .delete(projects)
        .where(and(eq(projects.id, projectId), eq(projects.orgId, orgId)));

      // Audit log participates in the same transaction
      await this.auditLogs.log({
        orgId,
        userId,
        action: 'DELETE_PROJECT',
        resource: 'project',
        metadata: JSON.stringify({ projectId }),
      }, tx as any);
    });
  }
}
```

## Transaction notes

Transaction behavior is consistent across adapters. On PostgreSQL adapters (AWS, GCP, Azure, Docker), full transaction isolation levels and savepoints are supported.

On Cloudflare D1 (SQLite), there are some additional constraints:

- **No savepoints** — D1 does not support nested transactions or savepoints. A transaction is all-or-nothing.
- **Serialized writes** — D1 serializes writes. Multiple concurrent transactions will queue and execute sequentially.
- **Size limits** — D1 has per-request size limits. Very large batch operations within a single transaction may hit these limits; consider chunking if necessary.
