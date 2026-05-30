---
title: Error Handling
description: Handling errors across tRPC, services, and React components in CruzJS.
---

CruzJS uses `TRPCError` for structured error handling across the API layer. Errors thrown in services and routers are automatically serialized into typed responses that the client can handle.

## TRPCError codes

Use the appropriate error code for each situation:

```ts
import { TRPCError } from '@trpc/server';
```

| Code | HTTP Status | When to use |
|------|:-----------:|-------------|
| `UNAUTHORIZED` | 401 | No valid session token, expired session |
| `FORBIDDEN` | 403 | User lacks the required permission or role |
| `NOT_FOUND` | 404 | Resource does not exist or belongs to another org |
| `BAD_REQUEST` | 400 | Invalid input, missing required fields, bad state |
| `CONFLICT` | 409 | Duplicate resource, unique constraint violation |
| `INTERNAL_SERVER_ERROR` | 500 | Unexpected failures, database errors |

## Throwing errors in routers

Throw `TRPCError` directly in your procedure handlers:

```ts
export const projectRouter = router({
  get: orgProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const container = await getAppContainer();
      const service = container.resolve(ProjectService);
      const project = await service.getById(input.id);

      if (!project || project.orgId !== ctx.org.orgId) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Project not found',
        });
      }

      return project;
    }),
});
```

## Throwing errors in services

Services can throw `TRPCError` directly. The error propagates through the tRPC handler and is serialized for the client:

```ts
@Injectable()
export class ProjectService {
  async update(id: string, input: UpdateProjectInput): Promise<ProjectResponse> {
    const [existing] = await this.db
      .select()
      .from(projects)
      .where(eq(projects.id, id))
      .limit(1);

    if (!existing) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Project not found',
      });
    }

    if (existing.status === 'ARCHIVED') {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Cannot update an archived project',
      });
    }

    const [updated] = await this.db
      .update(projects)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(projects.id, id))
      .returning();

    return this.toResponse(updated);
  }
}
```

### Handling duplicate entries

```ts
async create(orgId: string, input: CreateInput): Promise<ProjectResponse> {
  const [existing] = await this.db
    .select()
    .from(projects)
    .where(and(
      eq(projects.orgId, orgId),
      eq(projects.name, input.name),
    ))
    .limit(1);

  if (existing) {
    throw new TRPCError({
      code: 'CONFLICT',
      message: 'A project with this name already exists',
    });
  }

  // Proceed with creation...
}
```

### Wrapping unexpected errors

For operations that might fail in unexpected ways, catch and re-throw with context:

```ts
async processExport(projectId: string): Promise<ExportResult> {
  try {
    const result = await this.externalApi.export(projectId);
    return result;
  } catch (error) {
    this.logger.error('Export failed', error, { projectId });
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to export project',
      cause: error,
    });
  }
}
```

## Validation errors

Input validation errors are generated automatically by tRPC when a Zod schema fails. You do not need to throw these manually. The client receives a `BAD_REQUEST` error with field-level details:

```ts
// If client sends { name: "" } and schema requires min(1):
// Response: { code: 'BAD_REQUEST', message: 'Validation error', ... }
```

## Client-side error handling

### Per-mutation error handling

Handle errors on individual mutations using the `onError` callback:

```tsx
import { trpc } from '@cruzjs/web/trpc/client';
import { useToast } from '@cruzjs/ui';

function CreateProjectForm() {
  const toast = useToast();

  const createMutation = trpc.project.create.useMutation({
    onSuccess: (data) => {
      toast({ title: 'Project created', status: 'success' });
    },
    onError: (error) => {
      toast({ title: error.message, status: 'error' });
    },
  });

  const handleSubmit = (values: CreateProjectInput) => {
    createMutation.mutate(values);
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Form fields */}
      <button
        type="submit"
        disabled={createMutation.isPending}
      >
        {createMutation.isPending ? 'Creating...' : 'Create'}
      </button>
    </form>
  );
}
```

### Query error handling

Handle errors from queries inline or with error states:

```tsx
function ProjectList() {
  const { data, isLoading, error } = trpc.project.list.useQuery();

  if (isLoading) {
    return <LoadingState text="Loading projects..." />;
  }

  if (error) {
    return (
      <Alert status="error">
        <AlertIcon />
        {error.message}
      </Alert>
    );
  }

  return (
    <div>
      {data?.map((project) => (
        <div key={project.id}>{project.name}</div>
      ))}
    </div>
  );
}
```

### Checking error codes

The error object from tRPC includes the error code, so you can branch on it:

```tsx
const createMutation = trpc.project.create.useMutation({
  onError: (error) => {
    if (error.data?.code === 'CONFLICT') {
      toast({ title: 'A project with this name already exists', status: 'warning' });
    } else if (error.data?.code === 'FORBIDDEN') {
      toast({ title: 'You do not have permission to create projects', status: 'error' });
    } else {
      toast({ title: 'Something went wrong', status: 'error' });
    }
  },
});
```

## Error boundaries

React error boundaries catch rendering errors and prevent the entire app from crashing. Use them around route segments or feature areas.

### Route-level error boundary

React Router supports `ErrorBoundary` exports in route modules:

```tsx
// apps/web/src/routes/app/dashboard.tsx
import { useRouteError, isRouteErrorResponse } from 'react-router';

export function ErrorBoundary() {
  const error = useRouteError();

  if (isRouteErrorResponse(error)) {
    return (
      <div className="p-6 text-center">
        <h1 className="text-2xl font-bold text-red-600">
          {error.status} {error.statusText}
        </h1>
        <p className="mt-2 text-slate-600">{error.data}</p>
      </div>
    );
  }

  return (
    <div className="p-6 text-center">
      <h1 className="text-2xl font-bold text-red-600">Something went wrong</h1>
      <p className="mt-2 text-slate-600">
        {error instanceof Error ? error.message : 'An unexpected error occurred'}
      </p>
    </div>
  );
}

export default function DashboardPage() {
  // Normal page content
}
```

### Component-level error boundary

For catching errors within a section of a page, use a React error boundary component:

```tsx
import { Component, type ReactNode } from 'react';

type ErrorBoundaryProps = {
  fallback: ReactNode;
  children: ReactNode;
};

type ErrorBoundaryState = {
  hasError: boolean;
};

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error('ErrorBoundary caught:', error);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}
```

Usage:

```tsx
<ErrorBoundary fallback={<Alert status="error">Failed to load widget</Alert>}>
  <ProjectAnalyticsWidget />
</ErrorBoundary>
```

## Error formatting

CruzJS automatically formats tRPC errors to include the error code and HTTP status in the response. No configuration is needed -- the error `code` and `httpStatus` fields are available on every error response the client receives.

## Middleware error logging

Errors thrown in loaders and actions are automatically logged by the built-in `ConsoleLoggerMiddleware` with request context (URL, method, error details). See [Middleware](/basics/middleware/) for how to add custom error processors (e.g., Sentry reporting).

## Error handling best practices

1. **Use specific error codes** -- `NOT_FOUND` for missing resources, `FORBIDDEN` for permission issues, `BAD_REQUEST` for invalid state. Avoid using `INTERNAL_SERVER_ERROR` as a catch-all.
2. **Write helpful messages** -- Error messages should tell the user what went wrong. "Project not found" is better than "Error".
3. **Always verify ownership** -- Before updating or deleting, check that the resource belongs to the current org. Return `NOT_FOUND` rather than `FORBIDDEN` to avoid leaking that the resource exists.
4. **Let validation handle input errors** -- Do not manually validate what Zod schemas already check. tRPC returns detailed field-level errors automatically.
5. **Log unexpected errors** -- Use the `Logger` service to record unexpected failures with context before re-throwing.
