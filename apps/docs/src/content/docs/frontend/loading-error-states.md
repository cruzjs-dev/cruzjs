---
title: Loading & Error States
description: Handling loading spinners, skeleton states, error boundaries, and empty states in CruzJS.
---

Every data-driven page needs to handle three states: loading, error, and empty. CruzJS provides dedicated components for each and establishes patterns that keep your code consistent across the application.

## Loading States

### LoadingState Component

The `LoadingState` component renders a centered spinner with an optional text label. Use it as a full-page placeholder while data loads:

```tsx
import { LoadingState } from '@cruzjs/ui';

export default function ProjectPage() {
  const { data, isLoading } = trpc.project.getById.useQuery({ id: projectId });

  if (isLoading) {
    return <LoadingState size="xl" text="Loading project..." />;
  }

  return <ProjectDetails project={data} />;
}
```

### Size Variants

| Size | Use Case |
|------|----------|
| `sm` | Inline or button loading indicators |
| `md` | Section-level loading within a card |
| `lg` | Prominent loading within a page section |
| `xl` | Full-page loading state (default) |

### Section-Level Loading

For pages that load multiple data sources independently, use smaller loading states within specific sections:

```tsx
export default function DashboardPage() {
  const stats = trpc.dashboard.stats.useQuery();
  const activity = trpc.dashboard.recentActivity.useQuery();

  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard" />

      {/* Stats section loads independently */}
      {stats.isLoading ? (
        <LoadingState size="md" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard icon={<UsersIcon />} label="Users" value={stats.data.userCount} />
          <StatCard icon={<ChartIcon />} label="Revenue" value={stats.data.revenue} />
        </div>
      )}

      {/* Activity section loads independently */}
      <SectionCard title="Recent Activity">
        {activity.isLoading ? (
          <LoadingState size="md" />
        ) : (
          <ActivityList items={activity.data} />
        )}
      </SectionCard>
    </div>
  );
}
```

### Skeleton Loading

For a more polished experience, use Tailwind's `animate-pulse` utility to create skeleton placeholders that match the shape of your content:

```tsx
function StatCardSkeleton() {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 animate-pulse">
      <div className="w-9 h-9 rounded-lg bg-slate-200 mb-3" />
      <div className="w-16 h-3 bg-slate-200 rounded mb-2" />
      <div className="w-24 h-7 bg-slate-200 rounded" />
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <StatCardSkeleton />
      <StatCardSkeleton />
      <StatCardSkeleton />
    </div>
  );
}

// Usage
if (isLoading) return <DashboardSkeleton />;
```

### Background Refetch Indicator

When data is cached but a background refetch is in progress, show a subtle indicator instead of replacing the content with a spinner:

```tsx
const { data, isFetching, isLoading } = trpc.project.list.useQuery();

if (isLoading) return <LoadingState size="xl" />;

return (
  <div>
    <div className="flex items-center justify-between">
      <PageHeader title="Projects" />
      {isFetching && (
        <span className="text-xs text-slate-400 animate-pulse">Refreshing...</span>
      )}
    </div>
    <ProjectList projects={data} />
  </div>
);
```

### Button Loading States

Disable buttons and show loading text during mutations:

```tsx
<button
  type="submit"
  disabled={mutation.isPending}
  className="px-4 py-2 bg-[#003DCC] text-white rounded-lg disabled:opacity-50 flex items-center gap-2"
>
  {mutation.isPending && (
    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )}
  {mutation.isPending ? 'Saving...' : 'Save Changes'}
</button>
```

## Error States

### Inline Error Handling

Handle tRPC query errors directly in the component:

```tsx
const { data, error, isLoading } = trpc.project.getById.useQuery({ id });

if (isLoading) return <LoadingState size="xl" />;

if (error) {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
        <ExclamationIcon className="w-8 h-8 text-red-600" />
      </div>
      <h3 className="text-lg font-semibold text-slate-900 mb-2">Something went wrong</h3>
      <p className="text-slate-500 mb-4">{error.message}</p>
      <button
        onClick={() => refetch()}
        className="px-4 py-2 bg-[#003DCC] text-white rounded-lg"
      >
        Try Again
      </button>
    </div>
  );
}
```

### Error Handling by Code

tRPC errors include a `data.code` field that lets you show contextual error states:

```tsx
if (error) {
  switch (error.data?.code) {
    case 'NOT_FOUND':
      return (
        <EmptyState
          message="This project doesn't exist or has been deleted."
          icon={<SearchIcon className="w-8 h-8 text-slate-400" />}
          action={
            <Link to="/projects" className="text-[#003DCC] hover:underline">
              Back to Projects
            </Link>
          }
        />
      );
    case 'FORBIDDEN':
      return (
        <PermissionDenied
          message="You don't have permission to view this project."
          actionLabel="Go to Dashboard"
          onAction={() => navigate('/dashboard')}
        />
      );
    case 'UNAUTHORIZED':
      navigate('/auth/login');
      return null;
    default:
      return <ErrorFallback message={error.message} onRetry={refetch} />;
  }
}
```

### Error Boundaries

For unexpected rendering errors (not tRPC errors), use React error boundaries. Place them around major sections of your page:

```tsx
import { Component, type ReactNode } from 'react';

class ErrorBoundary extends Component<
  { children: ReactNode; fallback?: ReactNode },
  { hasError: boolean; error: Error | null }
> {
  state = { hasError: false, error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
          <h3 className="text-lg font-semibold text-red-900 mb-2">Something went wrong</h3>
          <p className="text-sm text-red-700">{this.state.error?.message}</p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Try Again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// Usage
<ErrorBoundary>
  <WidgetRenderer widget={widget} />
</ErrorBoundary>
```

## Empty States

### EmptyState Component

Use `EmptyState` when a query returns successfully but with no data:

```tsx
import { EmptyState } from '@cruzjs/ui';

const { data } = trpc.project.list.useQuery();

if (data?.length === 0) {
  return (
    <EmptyState
      message="You haven't created any projects yet."
      icon={<FolderIcon className="w-8 h-8 text-slate-400" />}
      action={
        <button
          onClick={onCreateProject}
          className="px-4 py-2 bg-[#003DCC] text-white rounded-lg"
        >
          Create Your First Project
        </button>
      }
    />
  );
}
```

### Contextual Empty States

Tailor the empty state message to what the user searched or filtered:

```tsx
const { data } = trpc.project.list.useQuery({ status: filter });

if (data?.length === 0) {
  return (
    <EmptyState
      message={
        filter === 'archived'
          ? 'No archived projects.'
          : 'No projects match your filter.'
      }
      icon={<SearchIcon className="w-8 h-8 text-slate-400" />}
    />
  );
}
```

## Retry Patterns

### Automatic Retry

React Query retries failed queries automatically (3 times by default). You can customize this per query:

```tsx
const { data } = trpc.project.list.useQuery(undefined, {
  retry: 2,              // Retry twice on failure
  retryDelay: 1000,      // Wait 1 second between retries
});
```

### Manual Retry

Provide a retry button in error states using the `refetch` function from the query result:

```tsx
const { data, error, refetch } = trpc.project.list.useQuery();

if (error) {
  return (
    <div className="text-center py-12">
      <p className="text-slate-500 mb-4">Failed to load projects.</p>
      <button
        onClick={() => refetch()}
        className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200"
      >
        Retry
      </button>
    </div>
  );
}
```

## Putting It All Together

A complete page handles all three states in a consistent order:

```tsx
import { trpc } from '~/trpc/client';
import { PageHeader, SectionCard, LoadingState, EmptyState } from '@cruzjs/ui';

export default function ProjectsPage() {
  const { data, isLoading, error, refetch, isFetching } = trpc.project.list.useQuery();

  // 1. Loading state
  if (isLoading) return <LoadingState size="xl" text="Loading projects..." />;

  // 2. Error state
  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 mb-4">{error.message}</p>
        <button onClick={() => refetch()} className="text-[#003DCC] hover:underline">
          Try again
        </button>
      </div>
    );
  }

  // 3. Empty state
  if (!data?.length) {
    return (
      <EmptyState
        message="No projects yet."
        action={<button onClick={onCreate}>Create Project</button>}
      />
    );
  }

  // 4. Success state
  return (
    <div className="space-y-6">
      <PageHeader
        title="Projects"
        action={isFetching ? <span className="text-xs text-slate-400">Refreshing...</span> : undefined}
      />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {data.map((project) => (
          <ProjectCard key={project.id} project={project} />
        ))}
      </div>
    </div>
  );
}
```
