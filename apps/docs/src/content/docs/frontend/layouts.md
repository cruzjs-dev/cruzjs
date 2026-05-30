---
title: Layouts
description: Dashboard, organization, and public layout system in CruzJS.
---

CruzJS provides three layout layers that handle navigation, authentication state, and organization context. Layouts are React components that wrap page content and are applied through React Router's nested routing.

## Layout Overview

| Layout | Purpose | Auth Required | Org Context |
|--------|---------|:---:|:---:|
| `AppLayout` | Dashboard shell with top navbar | Yes | No |
| `OrgLayout` | Organization pages with org header and tabs | Yes | Yes |
| Public layout | Marketing pages, login, register | No | No |

## AppLayout (Dashboard)

`AppLayout` is the main authenticated shell. It renders the top navigation bar and constrains content to a max width. All dashboard-level pages (user profile, org list, settings) use this layout.

```tsx
import { AppLayout } from '@cruzjs/start/layout';

export default function DashboardPage() {
  return (
    <AppLayout>
      <PageHeader title="Dashboard" />
      {/* Page content */}
    </AppLayout>
  );
}
```

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `children` | `React.ReactNode` | required | Page content |
| `fullWidth` | `boolean` | `false` | Remove max-width constraint for wide layouts |

The `AppLayout` renders:
- A `Navbar` component at the top with navigation links, user menu, and org switcher
- A padded content area with `max-w-screen-2xl` (unless `fullWidth` is true)

```tsx
// Full-width layout for data-heavy pages
<AppLayout fullWidth>
  <DataTable columns={columns} data={rows} />
</AppLayout>
```

## OrgLayout (Organization Context)

`OrgLayout` wraps organization-scoped pages. It reads the `:slug` route parameter, fetches the organization, sets the org context (so tRPC sends the `X-Organization-ID` header), and renders the `OrgHeader` with tab navigation.

Child pages receive the organization context through React Router's `useOutletContext` hook.

### Route Configuration

Organization routes are nested under a route with the `:slug` parameter:

```tsx
// apps/web/src/routes.ts (simplified)
import { OrgLayout } from '@cruzjs/start/orgs/components/OrgLayout';

const routes = [
  {
    path: '/orgs/:slug',
    Component: OrgLayout,
    children: [
      { path: 'overview', Component: OrgOverviewPage },
      { path: 'members', Component: OrgMembersPage },
      { path: 'settings', Component: OrgSettingsPage },
      { path: 'billing', Component: OrgBillingPage },
    ],
  },
];
```

### Accessing Org Context in Child Pages

`OrgLayout` passes organization data to child routes via React Router's `Outlet` context. Use `useOutletContext` to access it:

```tsx
import { useOutletContext } from 'react-router';
import type { OrgContext } from '@cruzjs/ui';

const OrgMembersPage: React.FC = () => {
  const { organization, currentUserRole, currentUserId, orgId } =
    useOutletContext<OrgContext>();

  return (
    <div>
      <h2>Members of {organization.name}</h2>
      <p>Your role: {currentUserRole}</p>
      {/* Members list */}
    </div>
  );
};
```

The `OrgContext` type includes:

```typescript
type OrgContext = {
  organization: {
    id: string;
    name: string;
    slug: string;
    avatarUrl: string | null;
    memberCount: number;
    settings: Record<string, unknown> | null;
    createdAt: Date;
    updatedAt: Date;
  };
  currentUserRole: 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER' | null;
  currentUserId: string | null;
  orgId: string;
};
```

### How Org Context Flows to tRPC

When `OrgLayout` mounts, it calls `setOrgId(orgData.id)` from the `OrgContext` provider. This makes `getCurrentOrgId()` return the active org ID, which the tRPC client reads when building request headers:

```
OrgLayout mounts
  -> setOrgId("org_abc123")
  -> tRPC extraHeaders() reads getCurrentOrgId()
  -> Every tRPC call includes X-Organization-ID: org_abc123
  -> Server middleware validates membership and sets ctx.org
```

When the user navigates away from the org layout, the cleanup function clears the org ID:

```tsx
useEffect(() => {
  if (orgData?.id) {
    setOrgId(orgData.id);
  }
  return () => setOrgId(null); // Clear on unmount
}, [orgData?.id, setOrgId]);
```

### Loading and Error States

`OrgLayout` handles its own loading and error states before rendering child content:

- **Loading**: Shows `<LoadingState size="xl" />` while fetching the org and session data.
- **Not found**: Shows a "not found" message with a button to return to the dashboard.
- **Not authenticated**: Redirects to `/auth/login`.

## Public Layout

Public pages (landing page, login, register, marketing) do not use `AppLayout`. They render their own layout without the authenticated navbar:

```tsx
// A simple public layout
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-slate-200 px-6 py-4">
        <Link to="/" className="text-xl font-bold text-slate-900">
          MyApp
        </Link>
      </header>
      <main className="max-w-screen-lg mx-auto px-6 py-8">
        {children}
      </main>
    </div>
  );
}
```

Auth pages (login, register) are typically standalone routes that do not use any layout wrapper, or use a minimal centered layout:

```tsx
export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="w-full max-w-md p-8 rounded-2xl bg-white shadow-lg border border-slate-200">
        <LoginForm />
      </div>
    </div>
  );
}
```

## Nested Layouts

React Router v7 supports nested layouts naturally. You can nest layouts to build progressively richer page shells:

```tsx
const routes = [
  {
    // Public layout (no auth)
    Component: PublicLayout,
    children: [
      { path: '/', Component: LandingPage },
      { path: '/pricing', Component: PricingPage },
    ],
  },
  {
    // Dashboard layout (authenticated)
    Component: DashboardLayout,
    children: [
      { path: '/dashboard', Component: DashboardPage },
      { path: '/profile', Component: ProfilePage },
      {
        // Org layout (nested inside dashboard)
        path: '/orgs/:slug',
        Component: OrgLayout,
        children: [
          { path: 'overview', Component: OrgOverviewPage },
          { path: 'members', Component: OrgMembersPage },
        ],
      },
    ],
  },
];
```

Each layout renders an `<Outlet />` where child content appears. This gives you:

```
/dashboard         -> DashboardLayout > DashboardPage
/orgs/acme/members -> DashboardLayout > OrgLayout > OrgMembersPage
```

## Layout Data Loading

Layouts can load data using React Router loaders. However, in CruzJS the recommended pattern is to fetch data client-side using tRPC hooks inside the layout component. This keeps the data fetching co-located with the component that uses it and enables React Query caching:

```tsx
const OrgLayout: React.FC = () => {
  const trpc = getTRPC();
  const { slug } = useParams<{ slug: string }>();

  // Fetch org data client-side
  const { data: orgData, isLoading } = trpc.org.getBySlug.useQuery(
    { slug: slug! },
    { enabled: !!slug }
  );

  if (isLoading) return <LoadingState size="xl" />;

  return (
    <AppLayout>
      <OrgHeader name={orgData.name} slug={orgData.slug} memberCount={orgData.memberCount} />
      <Outlet context={{ organization: orgData, orgId: orgData.id }} />
    </AppLayout>
  );
};
```
