---
title: Audit Logging
description: Tracking mutations with AuditLogService, querying audit logs, the audit log schema, and best practices for what to audit.
---

The `AuditLogService` records significant actions within an organization. Audit logs provide an immutable trail of who did what, when, and from where -- essential for compliance, debugging, and security.

## AuditLogService

The service provides methods for writing and querying audit logs:

### Logging an Action

```typescript
import { AuditLogService } from '@cruzjs/saas/orgs/audit-log.service';

await auditLogService.logAudit(
  orgId,                          // Organization ID
  userId,                         // User who performed the action (null for system actions)
  'created',                      // Action type
  'organization',                 // Resource type
  {                               // Metadata (optional)
    organizationName: 'Acme Corp',
    previousName: undefined,
  },
  request.headers.get('x-forwarded-for'),  // IP address (optional)
  request.headers.get('user-agent')         // User agent (optional)
);
```

### Action Types

```typescript
type AuditAction =
  | 'created'
  | 'updated'
  | 'deleted'
  | 'added'
  | 'removed'
  | 'role_changed'
  | 'invited'
  | 'accepted'
  | 'declined'
  | 'canceled'
  | 'subscribed'
  | 'unsubscribed'
  | 'payment_succeeded'
  | 'payment_failed';
```

### Resource Types

```typescript
type AuditResource =
  | 'organization'
  | 'member'
  | 'invitation'
  | 'subscription'
  | 'billing'
  | 'user';
```

## Querying Audit Logs

Retrieve audit logs with filtering and pagination:

```typescript
const { logs, total } = await auditLogService.getAuditLogs(orgId, {
  action: 'created',               // Filter by action (optional)
  resource: 'member',              // Filter by resource (optional)
  userId: 'user-123',             // Filter by actor (optional)
  startDate: new Date('2024-01-01'), // Start of date range (optional)
  endDate: new Date('2024-12-31'),   // End of date range (optional)
  skip: 0,                        // Offset for pagination
  limit: 50,                      // Page size (default: 50)
});
```

Each log entry includes the actor's user information:

```typescript
type AuditLogEntry = {
  id: string;
  orgId: string;
  userId: string | null;
  action: AuditAction;
  resource: AuditResource;
  metadata: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Date;
  user: {
    id: string;
    name: string | null;
    email: string | null;
    avatarUrl: string | null;
  } | null;
};
```

### Exporting Logs

Export all matching logs (without pagination) for compliance reports:

```typescript
const allLogs = await auditLogService.exportAuditLogs(orgId, {
  startDate: new Date('2024-01-01'),
  endDate: new Date('2024-03-31'),
});

// Convert to CSV, PDF, or send to external logging service
```

## Audit Log Schema

```typescript
import { DrizzleUniversalFactory } from '@cruzjs/drizzle-universal';

const f = DrizzleUniversalFactory.create((b) => ({
  auditLogs: b.table('AuditLog', {
    id: b.text('id').primaryKey().$defaultFn(generateId),
    orgId: b.text('orgId').references(() => organizations.id, { onDelete: 'cascade' }),
    userId: b.text('userId').references(() => authIdentity.id, { onDelete: 'set null' }),
    action: b.text('action').notNull(),
    resource: b.text('resource'),
    metadata: b.text('metadata').default('{}'),
    ipAddress: b.text('ipAddress'),
    userAgent: b.text('userAgent'),
    createdAt: b.timestamp('createdAt').notNull().$defaultFn(nowISO),
  }, (table) => ({
    orgIdIdx: b.index('AuditLog_orgId_idx').on(table.orgId),
    userIdIdx: b.index('AuditLog_userId_idx').on(table.userId),
    actionIdx: b.index('AuditLog_action_idx').on(table.action),
    resourceIdx: b.index('AuditLog_resource_idx').on(table.resource),
    createdAtIdx: b.index('AuditLog_createdAt_idx').on(table.createdAt),
  })),
}));

export const { auditLogs } = f();
```

The schema indexes `orgId`, `userId`, `action`, `resource`, and `createdAt` for efficient querying.

## Integration with tRPC Routers

Add audit logging to your tRPC mutations:

```typescript
export const projectRouter = router({
  create: orgProcedure
    .input(createProjectSchema)
    .mutation(async ({ ctx, input }) => {
      const projectService = ctx.container.get(ProjectService);
      const auditLogService = ctx.container.get(AuditLogService);

      const project = await projectService.create(ctx.org.orgId, input);

      // Log the creation
      await auditLogService.logAudit(
        ctx.org.orgId,
        ctx.session.user.id,
        'created',
        'project',
        {
          projectId: project.id,
          projectName: project.name,
        },
        ctx.request.headers.get('x-forwarded-for'),
        ctx.request.headers.get('user-agent')
      );

      return project;
    }),

  delete: orgProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const projectService = ctx.container.get(ProjectService);
      const auditLogService = ctx.container.get(AuditLogService);

      const project = await projectService.getById(input.id);
      await projectService.delete(input.id);

      await auditLogService.logAudit(
        ctx.org.orgId,
        ctx.session.user.id,
        'deleted',
        'project',
        {
          projectId: project.id,
          projectName: project.name,
        }
      );
    }),
});
```

## What to Audit

### Always Audit

- Organization created, updated, deleted
- Member added, removed, role changed
- Invitation sent, accepted, declined, canceled
- Subscription created, canceled, plan changed
- Payment succeeded, payment failed
- Settings changed (security-sensitive settings)
- API key created, revoked

### Consider Auditing

- Login/logout events (may generate high volume)
- Resource creation/deletion (projects, documents, etc.)
- Permission changes
- Bulk operations (imports, exports)
- File uploads and deletions

### Avoid Auditing

- Read-only actions (views, searches) -- use analytics instead
- Automated system actions at high frequency (health checks, cron pings)
- Transient data changes (drafts, temporary state)

## Log Retention

Clean up old audit logs to manage database size:

```typescript
// Delete logs older than 90 days
const cutoff = new Date();
cutoff.setDate(cutoff.getDate() - 90);

await auditLogService.cleanupOldAuditLogs(cutoff);
```

Run this as a scheduled job:

```typescript
// In a cron-triggered Worker or scheduled job
export default {
  async scheduled(event: ScheduledEvent, env: Env) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 90);

    const db = drizzle(env.DB);
    await db
      .delete(auditLogs)
      .where(lt(auditLogs.createdAt, cutoff.toISOString()));
  },
};
```

## Viewing Audit Logs in the UI

```typescript
function AuditLogTable({ orgId }: { orgId: string }) {
  const { data } = trpc.org.auditLogs.useQuery({
    orgId,
    limit: 50,
    skip: 0,
  });

  return (
    <table>
      <thead>
        <tr>
          <th>Time</th>
          <th>User</th>
          <th>Action</th>
          <th>Resource</th>
          <th>Details</th>
        </tr>
      </thead>
      <tbody>
        {data?.logs.map((log) => (
          <tr key={log.id}>
            <td>{log.createdAt.toLocaleString()}</td>
            <td>{log.user?.name ?? log.user?.email ?? 'System'}</td>
            <td>{log.action}</td>
            <td>{log.resource}</td>
            <td>{JSON.stringify(log.metadata)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

## Next Steps

- [Organizations](/pro/organizations) -- Organization management
- [Permissions](/pro/permissions) -- Access control
- [Admin Dashboard](/pro/admin) -- System-wide audit views
