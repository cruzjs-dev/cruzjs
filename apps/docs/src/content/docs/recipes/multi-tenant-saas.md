---
title: "Recipe: Multi-Tenant SaaS"
description: Building a multi-tenant SaaS application with CruzJS -- org isolation, billing per org, member management, and data scoping.
---

:::note
This recipe uses organization features from `@cruzjs/start` (org management, members, roles, permissions) and billing features from `@cruzjs/saas` (Stripe subscriptions, plan limits). Organizations are provided by `@cruzjs/start/orgs/`; billing and admin remain in `@cruzjs/saas`.
:::

This recipe walks through building a complete multi-tenant SaaS application using CruzJS. You will set up organization-scoped data, per-org billing, member management, and access control.

## Architecture Overview

In a CruzJS multi-tenant app:

- **Tenant = Organization** -- Each customer is an organization
- **Data isolation** -- All queries are scoped to `orgId`
- **Billing** -- Stripe subscriptions are per organization
- **Access control** -- Role-based permissions per member

```
User A ──┬── Org 1 (Owner)  ──── Projects, Members, Billing
         └── Org 2 (Member) ──── Projects, Members, Billing

User B ──── Org 1 (Admin)   ──── Projects, Members, Billing
```

## Step 1: Project Setup

```bash
npm create @cruzjs my-saas -- --with-pro
cd my-saas
pnpm install
cruz dev
```

The `--with-pro` flag includes `@cruzjs/saas` which provides billing and admin features. Organizations, members, roles, and permissions are included in `@cruzjs/start`.

## Step 2: Define Tenant-Scoped Tables

Every business data table includes an `orgId` column for tenant isolation:

```typescript
// apps/web/src/database/schema.ts
import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
import { createId } from '@paralleldrive/cuid2';

const generateId = () => createId();
const nowISO = () => new Date().toISOString();

export const projects = sqliteTable('Project', {
  id: text('id').primaryKey().$defaultFn(generateId),
  name: text('name').notNull(),
  description: text('description'),
  orgId: text('orgId').notNull(),  // Tenant isolation
  status: text('status').notNull().default('active'),
  createdBy: text('createdBy').notNull(),
  createdAt: text('createdAt').notNull().$defaultFn(nowISO),
  updatedAt: text('updatedAt').notNull().$defaultFn(nowISO),
}, (table) => ({
  orgIdIdx: index('Project_orgId_idx').on(table.orgId),
}));

export const tasks = sqliteTable('Task', {
  id: text('id').primaryKey().$defaultFn(generateId),
  title: text('title').notNull(),
  projectId: text('projectId').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  orgId: text('orgId').notNull(),  // Denormalized for query efficiency
  assigneeId: text('assigneeId'),
  status: text('status').notNull().default('todo'),
  createdAt: text('createdAt').notNull().$defaultFn(nowISO),
  updatedAt: text('updatedAt').notNull().$defaultFn(nowISO),
}, (table) => ({
  orgIdIdx: index('Task_orgId_idx').on(table.orgId),
  projectIdIdx: index('Task_projectId_idx').on(table.projectId),
}));

// Re-export framework tables
export * from '@cruzjs/start/database/schema';
```

:::caution
Always include `orgId` in WHERE clauses. A missing org filter is a data leak between tenants. Use the `orgProcedure` in tRPC to guarantee the org context is available.
:::

## Step 3: Create Org-Scoped Services

Services receive the `orgId` as a parameter and always filter by it:

```typescript
// apps/web/src/features/projects/project.service.ts
import { injectable, inject } from 'inversify';
import { DRIZZLE, type DrizzleDatabase } from '@cruzjs/core/shared/database/drizzle.service';
import { projects } from '../../database/schema';
import { eq, and, desc } from 'drizzle-orm';

@injectable()
export class ProjectService {
  constructor(@inject(DRIZZLE) private readonly db: DrizzleDatabase) {}

  // Every method requires orgId for tenant isolation
  async list(orgId: string) {
    return this.db
      .select()
      .from(projects)
      .where(eq(projects.orgId, orgId))
      .orderBy(desc(projects.createdAt));
  }

  async getById(orgId: string, projectId: string) {
    const [project] = await this.db
      .select()
      .from(projects)
      .where(and(eq(projects.id, projectId), eq(projects.orgId, orgId)))
      .limit(1);
    return project ?? null;
  }

  async create(orgId: string, userId: string, input: { name: string; description?: string }) {
    const [project] = await this.db
      .insert(projects)
      .values({
        name: input.name,
        description: input.description ?? null,
        orgId,
        createdBy: userId,
      })
      .returning();
    return project;
  }
}
```

## Step 4: tRPC Routers with orgProcedure

Use `orgProcedure` to enforce that every request has a valid org context:

```typescript
// apps/web/src/features/projects/project.router.ts
import { orgProcedure, router } from '@cruzjs/core/trpc/context';
import { z } from 'zod';
import { ProjectService } from './project.service';

export const projectRouter = router({
  list: orgProcedure.query(async ({ ctx }) => {
    // ctx.org.orgId is guaranteed to be a valid org the user belongs to
    return ctx.container.get(ProjectService).list(ctx.org.orgId);
  }),

  create: orgProcedure
    .input(z.object({ name: z.string().min(1), description: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.container.get(ProjectService).create(
        ctx.org.orgId,
        ctx.session.user.id,
        input
      );
    }),
});
```

The `orgProcedure` middleware:
1. Verifies the user is authenticated
2. Resolves the current organization from the session
3. Verifies the user is a member of that organization
4. Makes `ctx.org.orgId` and `ctx.org.role` available

## Step 5: Configure Billing

Define plans in your config:

```typescript
// apps/web/cruz.config.ts
export default defineConfig({
  billing: {
    defaultPlans: [
      {
        id: 'starter',
        name: 'Starter',
        price: 0,
        interval: 'month',
        isUpgradeable: true,
        features: ['3 projects', '2 members', 'Community support'],
        limits: { maxProjects: 3, maxMembers: 2 },
      },
      {
        id: 'pro',
        name: 'Pro',
        price: 2900,
        interval: 'month',
        stripePriceId: 'price_pro_monthly',
        isUpgradeable: true,
        features: ['Unlimited projects', '10 members', 'Email support'],
        limits: { maxProjects: -1, maxMembers: 10 },
      },
      {
        id: 'enterprise',
        name: 'Enterprise',
        price: 9900,
        interval: 'month',
        stripePriceId: 'price_enterprise_monthly',
        isUpgradeable: false,
        features: ['Everything in Pro', 'Unlimited members', 'Priority support'],
        limits: { maxProjects: -1, maxMembers: -1 },
      },
    ],
    upgradeRules: {
      starter: ['pro', 'enterprise'],
      pro: ['enterprise'],
    },
  },
});
```

### Enforce Plan Limits

```typescript
@injectable()
export class ProjectService {
  constructor(
    @inject(DRIZZLE) private readonly db: DrizzleDatabase,
    @inject(BillingService) private readonly billing: BillingService,
  ) {}

  async create(orgId: string, userId: string, input: CreateProjectInput) {
    // Check plan limits before creating
    const subscription = await this.billing.getSubscription(orgId);
    const plan = await this.billing.getPlan(subscription?.planId ?? 'starter');
    const existingCount = await this.countProjects(orgId);

    if (plan?.limits?.maxProjects !== -1 && existingCount >= (plan?.limits?.maxProjects ?? 3)) {
      throw new Error(`Plan limit reached. Upgrade to create more projects.`);
    }

    return this.db.insert(projects).values({ ...input, orgId, createdBy: userId }).returning();
  }
}
```

## Step 6: Member Management

Add members via the invitation flow:

```typescript
export const memberRouter = router({
  invite: orgProcedure
    .input(z.object({
      email: z.string().email(),
      role: z.enum(['ADMIN', 'MEMBER', 'VIEWER']),
    }))
    .mutation(async ({ ctx, input }) => {
      // Check permission
      const permService = ctx.container.get(PermissionService);
      await permService.checkPermission(ctx.session.user.id, ctx.org.orgId, 'member:write');

      // Check member limit
      const members = await ctx.container.get(MemberService).listMembers(ctx.org.orgId);
      const subscription = await ctx.container.get(BillingService).getSubscription(ctx.org.orgId);
      // ... check limits

      const invitationService = ctx.container.get(InvitationService);
      return invitationService.createInvitation(
        ctx.org.orgId,
        { email: input.email, role: input.role },
        ctx.session.user.id
      );
    }),
});
```

## Step 7: Org-Scoped URLs

Use slug-based routing for all org pages:

```
/orgs/:slug/dashboard
/orgs/:slug/projects
/orgs/:slug/projects/:projectId
/orgs/:slug/members
/orgs/:slug/billing
/orgs/:slug/settings
```

The org slug is resolved in the route middleware and the org context is available throughout the request.

## Step 8: Audit Everything

Track all mutations for compliance and debugging:

```typescript
async create(orgId: string, userId: string, input: CreateProjectInput) {
  const project = await this.db.insert(projects).values({ ... }).returning();

  await this.auditLog.logAudit(
    orgId, userId, 'created', 'project',
    { projectId: project[0].id, projectName: project[0].name }
  );

  return project[0];
}
```

## Data Isolation Checklist

Before shipping your multi-tenant app, verify:

- [ ] Every data table has an `orgId` column (or is joined through one that does)
- [ ] Every query includes `where(eq(table.orgId, orgId))`
- [ ] All tRPC mutations use `orgProcedure` (never `publicProcedure` for tenant data)
- [ ] File uploads include org context in the storage key (`uploads/${orgId}/...`)
- [ ] API keys are scoped to organizations
- [ ] Audit logs record the org context
- [ ] Admin endpoints are separate from tenant endpoints

## Next Steps

- [Organizations](/pro/organizations) -- OrgService deep dive
- [Billing](/pro/billing) -- Stripe integration details
- [Permissions](/pro/permissions) -- Fine-grained access control
- [CRUD Feature Recipe](/recipes/crud-feature) -- Build features step by step
