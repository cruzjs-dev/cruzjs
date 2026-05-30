---
title: Admin Dashboard
description: System administration with AdminService, user management, organization overview, and admin-only routes.
---

`@cruzjs/saas` includes an admin module for system-wide management. The admin dashboard provides user management, organization oversight, and system metrics through the `AdminDashboardService`, `AdminUserService`, and `AdminOrgService`.

## Dashboard Metrics

The `AdminDashboardService` aggregates system-wide statistics:

```typescript
import { AdminDashboardService } from '@cruzjs/saas/admin/dashboard.service';

const metrics = await dashboardService.getMetrics();
// {
//   users: { total, active, verified },
//   subscriptions: { total, byPlan, active, trialing, canceled },
//   revenue: { mrr, arr },
//   jobs: { pending, processing, failed, completed },
//   organizations: { total, withSubscription },
// }
```

### Metrics Breakdown

| Metric | Description |
|---|---|
| `users.total` | Total registered users |
| `users.verified` | Users with verified email |
| `subscriptions.active` | Currently active subscriptions |
| `subscriptions.byPlan` | Subscription count per Stripe price ID |
| `jobs.pending` | Background jobs waiting to be processed |
| `jobs.failed` | Jobs that have failed all retry attempts |
| `organizations.total` | Total organizations created |
| `organizations.withSubscription` | Organizations with active subscriptions |

## Admin Router

The admin tRPC router provides paginated access to users and organizations:

```typescript
import { adminRouter } from '@cruzjs/saas/admin/admin.router';

// Dashboard stats
const stats = await trpc.admin.dashboard.query();
// { users: { total }, organizations: { total } }

// List users with pagination
const users = await trpc.admin.users.query({ page: 1, limit: 20 });
// {
//   users: [{ id, email, name, emailVerified, createdAt }],
//   pagination: { page, limit, total, totalPages }
// }

// Get a specific user
const user = await trpc.admin.getUser.query({ id: userId });

// List organizations with pagination
const orgs = await trpc.admin.orgs.query({ page: 1, limit: 20 });
// {
//   organizations: [{ id, name, slug, createdAt }],
//   pagination: { page, limit, total, totalPages }
// }

// Get a specific organization
const org = await trpc.admin.getOrg.query({ id: orgId });
```

## User Management

The `AdminUserService` provides user administration:

```typescript
import { AdminUserService } from '@cruzjs/saas/admin/user.service';

// List users with filters and pagination
const result = await adminUserService.listUsers(
  { search: 'john' },           // Filters
  { page: 1, pageSize: 20 }     // Pagination
);

// Get user details
const user = await adminUserService.getUser(userId);
```

## Organization Management

The `AdminOrgService` provides org-level administration:

```typescript
import { AdminOrgService } from '@cruzjs/saas/admin/org.service';

// List organizations with pagination
const result = await adminOrgService.listOrgs(
  {},                            // Filters
  { page: 1, pageSize: 20 }     // Pagination
);

// Get org details
const org = await adminOrgService.getOrg(orgId);
```

## Admin-Only Routes

Protect admin routes by checking the user's system role in the loader:

```typescript
// app/routes/admin/dashboard.tsx
export async function loader({ request }: LoaderFunctionArgs) {
  const auth = await requireSession(request);

  // Check if user is a system admin
  // You can implement this check based on:
  // 1. A flag on the authIdentity table
  // 2. A separate admin roles table
  // 3. An environment variable allowlist
  const container = await getAppContainer();
  const adminUserService = container.get(AdminUserService);

  // Example: check against an admin email allowlist
  const adminEmails = process.env.ADMIN_EMAILS?.split(',') ?? [];
  if (!adminEmails.includes(auth.user.email)) {
    throw new Response('Forbidden', { status: 403 });
  }

  const dashboardService = container.get(AdminDashboardService);
  return { metrics: await dashboardService.getMetrics() };
}
```

### Admin Layout

Create an admin layout that wraps all admin routes:

```typescript
// app/routes/admin/layout.tsx
export async function loader({ request }: LoaderFunctionArgs) {
  const auth = await requireSession(request);
  await requireAdmin(auth); // Your admin check

  return { user: auth.user };
}

export default function AdminLayout() {
  return (
    <div className="admin-layout">
      <nav>
        <a href="/admin">Dashboard</a>
        <a href="/admin/users">Users</a>
        <a href="/admin/orgs">Organizations</a>
      </nav>
      <main>
        <Outlet />
      </main>
    </div>
  );
}
```

## Admin tRPC Router Registration

The admin router is automatically registered as part of the `AdminModule` in the framework's core providers:

```typescript
// This is handled internally by the framework
@Module({
  providers: [AdminDashboardService, AdminUserService, AdminOrgService, RoleService],
  trpcRouters: {
    admin: adminRouter,
  },
})
export class AdminModule {}
```

Access admin endpoints via `trpc.admin.*` in your React components:

```typescript
function AdminDashboard() {
  const { data } = trpc.admin.dashboard.useQuery();

  return (
    <div>
      <h1>Admin Dashboard</h1>
      <div className="stats-grid">
        <StatCard title="Total Users" value={data?.users.total} />
        <StatCard title="Total Organizations" value={data?.organizations.total} />
      </div>
    </div>
  );
}
```

## Next Steps

- [Organizations](/pro/organizations) -- Organization management
- [Billing](/pro/billing) -- Subscription and revenue tracking
- [Audit Logging](/pro/audit-logging) -- System-wide activity logs
