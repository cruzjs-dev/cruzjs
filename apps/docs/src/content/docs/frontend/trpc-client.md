---
title: tRPC Client
description: Type-safe data fetching and mutations with tRPC and React Query in CruzJS.
---

CruzJS uses [tRPC](https://trpc.io/) with [React Query](https://tanstack.com/query) to provide fully type-safe API calls between the frontend and backend. Every procedure you define on the server is immediately available as a typed hook in your React components -- no code generation, no REST endpoints, no manual type definitions.

## Client Setup

The tRPC client is configured in `apps/web/src/trpc/client.ts`. A scaffolded CruzJS project includes this file pre-configured:

```typescript
// apps/web/src/trpc/client.ts
import { getCurrentOrgId } from '@cruzjs/saas/contexts/OrgContext';
import {
  createTRPCHooks,
  createTRPCClientFactory,
  createDefaultQueryClient,
  registerTRPC,
} from '@cruzjs/core/trpc/client';
import type { AppRouter } from './router';

// Create typed hooks from your AppRouter
export const trpc = createTRPCHooks<AppRouter>();

// Register globally so @cruzjs/core, @cruzjs/start, and @cruzjs/saas
// components can also use tRPC hooks via getTRPC()
registerTRPC(trpc);

// Factory that creates the HTTP client with auth + org headers
export const createTRPCClient = () => {
  return createTRPCClientFactory(trpc, {
    extraHeaders: (): Record<string, string> => {
      const orgId = getCurrentOrgId();
      return orgId ? { 'X-Organization-ID': orgId } : {};
    },
  });
};

export const createQueryClient = createDefaultQueryClient;
```

The client automatically attaches:
- **`Authorization: Bearer <token>`** -- session token from the auth system
- **`X-Organization-ID: <orgId>`** -- current organization context (when inside an org layout)

These headers are read by server middleware to authenticate and scope every request.

## Fetching Data with useQuery

Use `trpc.<router>.<procedure>.useQuery()` to fetch data. The return value includes everything from React Query: `data`, `isLoading`, `error`, `refetch`, and more.

```tsx
import { trpc } from '@/trpc/client';
import { LoadingState, EmptyState } from '@cruzjs/ui';

export default function MembersPage() {
  const { data, isLoading, error } = trpc.member.list.useQuery();

  if (isLoading) return <LoadingState size="xl" />;

  if (error) {
    return <p className="text-red-600">Failed to load members: {error.message}</p>;
  }

  if (!data?.members.length) {
    return <EmptyState title="No members found." />;
  }

  return (
    <ul>
      {data.members.map((member) => (
        <li key={member.id}>{member.name} - {member.role}</li>
      ))}
    </ul>
  );
}
```

### Passing Input

When a procedure expects input, pass it as the first argument:

```tsx
// Server: orgProcedure.input(z.object({ status: z.enum(['active', 'archived']) }))
const { data } = trpc.project.list.useQuery({ status: 'active' });
```

### Conditional Queries

Use the `enabled` option to defer a query until a dependency is available:

```tsx
const { data: org } = trpc.org.getBySlug.useQuery(
  { slug: slug! },
  { enabled: !!slug }
);

// This query only runs after org data loads
const { data: members } = trpc.member.list.useQuery(undefined, {
  enabled: !!org?.id,
});
```

### Refetch Intervals

For data that changes frequently, set a polling interval:

```tsx
const { data } = trpc.dashboard.stats.useQuery(undefined, {
  refetchInterval: 30_000, // Re-fetch every 30 seconds
});
```

## Mutations with useMutation

Use `trpc.<router>.<procedure>.useMutation()` for create, update, and delete operations. Mutations return `mutate` (fire-and-forget) and `mutateAsync` (returns a Promise).

```tsx
import { trpc } from '@/trpc/client';
import { useState } from 'react';

function InviteMemberForm() {
  const [email, setEmail] = useState('');

  const invite = trpc.member.invite.useMutation({
    onSuccess: () => {
      setEmail('');
      // Show success feedback
    },
    onError: (error) => {
      console.error('Invite failed:', error.message);
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        invite.mutate({ email, role: 'MEMBER' });
      }}
    >
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="rounded-lg border border-slate-300 px-3 py-2"
        placeholder="colleague@example.com"
      />
      <button
        type="submit"
        disabled={invite.isPending}
        className="px-4 py-2 bg-[#003DCC] text-white rounded-lg disabled:opacity-50"
      >
        {invite.isPending ? 'Sending...' : 'Send Invite'}
      </button>
    </form>
  );
}
```

## Query Invalidation

After a mutation succeeds, you typically want to refetch related queries so the UI stays in sync. Use `useUtils()` to access the query invalidation API:

```tsx
import { trpc } from '@/trpc/client';

function CreateProjectButton() {
  const utils = trpc.useUtils();

  const create = trpc.project.create.useMutation({
    onSuccess: () => {
      // Invalidate the project list so it refetches
      utils.project.list.invalidate();
    },
  });

  return (
    <button onClick={() => create.mutate({ name: 'New Project' })}>
      Create Project
    </button>
  );
}
```

You can also invalidate at different levels of granularity:

```tsx
// Invalidate a specific query with specific input
utils.project.getById.invalidate({ id: 'proj_123' });

// Invalidate all queries under the "project" router
utils.project.invalidate();

// Invalidate everything (rarely needed)
utils.invalidate();
```

## Optimistic Updates

For a snappy UI, you can optimistically update the cache before the server responds. If the mutation fails, the cache rolls back automatically:

```tsx
const utils = trpc.useUtils();

const toggleComplete = trpc.task.toggleComplete.useMutation({
  onMutate: async ({ taskId, completed }) => {
    // Cancel any outgoing refetches so they don't overwrite our optimistic update
    await utils.task.list.cancel();

    // Snapshot the previous value
    const previous = utils.task.list.getData();

    // Optimistically update the cache
    utils.task.list.setData(undefined, (old) =>
      old?.map((t) =>
        t.id === taskId ? { ...t, completed } : t
      )
    );

    return { previous };
  },
  onError: (_err, _variables, context) => {
    // Roll back on error
    if (context?.previous) {
      utils.task.list.setData(undefined, context.previous);
    }
  },
  onSettled: () => {
    // Always refetch to ensure server state is canonical
    utils.task.list.invalidate();
  },
});
```

## Error Handling

tRPC errors carry structured information from the server. The `error` object includes a human-readable `message` and a `data.code` field with the tRPC error code:

```tsx
const { data, error } = trpc.project.getById.useQuery({ id: projectId });

if (error) {
  switch (error.data?.code) {
    case 'NOT_FOUND':
      return <EmptyState title="Project not found." />;
    case 'FORBIDDEN':
      return <PermissionDenied message="You don't have access to this project." />;
    case 'UNAUTHORIZED':
      // Redirect to login
      return <Navigate to="/auth/login" />;
    default:
      return <p className="text-red-600">Something went wrong: {error.message}</p>;
  }
}
```

For mutations, handle errors in the `onError` callback:

```tsx
const update = trpc.project.update.useMutation({
  onError: (error) => {
    if (error.data?.code === 'CONFLICT') {
      toast({ title: 'Name already taken', status: 'warning' });
    } else {
      toast({ title: error.message, status: 'error' });
    }
  },
});
```

## Loading States

React Query provides granular loading indicators:

```tsx
const { data, isLoading, isFetching, isRefetching } = trpc.project.list.useQuery();

// isLoading: true on first load (no cached data)
// isFetching: true whenever a request is in flight (including background refetch)
// isRefetching: true only for background refetches (data already cached)
```

Use `isLoading` for initial skeleton/spinner states and `isFetching` for subtle background-refresh indicators:

```tsx
if (isLoading) return <LoadingState size="xl" />;

return (
  <div>
    {isFetching && (
      <div className="text-xs text-slate-400 animate-pulse">Refreshing...</div>
    )}
    <ProjectList projects={data} />
  </div>
);
```

## Prefetching

Prefetch data before a user navigates to a page. This is useful on hover or when you know the user is likely to visit a page:

```tsx
function ProjectCard({ project }: { project: Project }) {
  const utils = trpc.useUtils();

  return (
    <Link
      to={`/projects/${project.id}`}
      onMouseEnter={() => {
        // Start fetching project details before the user clicks
        utils.project.getById.prefetch({ id: project.id });
      }}
      className="block p-4 rounded-xl border border-slate-200 hover:border-slate-300"
    >
      <h3 className="font-semibold text-slate-900">{project.name}</h3>
    </Link>
  );
}
```

## Using tRPC in Package Components

Components inside `@cruzjs/core`, `@cruzjs/start`, and `@cruzjs/saas` cannot import the app's `trpc` directly (they do not have access to the app-specific `AppRouter` type). Instead, they use the global `getTRPC()` function:

```tsx
// Inside a @cruzjs/start component
import { getTRPC } from '@cruzjs/core/trpc/client';

const MyPackageComponent: React.FC = () => {
  const trpc = getTRPC();
  const { data } = trpc.auth.session.useQuery();

  return <span>{data?.user?.email}</span>;
};
```

This works because the app calls `registerTRPC(trpc)` at startup, making the typed hooks available globally.
