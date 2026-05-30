---
title: Middleware
description: Authentication, organization context, and permission middleware in CruzJS.
---

CruzJS provides a layered middleware system that handles session validation, organization context, and permission checks. Middleware runs in tRPC procedures automatically (via procedure types) and can also be used in React Router loaders and actions.

## How middleware flows

```
Request
  |
  v
Session middleware ---- validates JWT, attaches ctx.session
  |
  v
Org context middleware - reads X-Organization-ID header, loads membership
  |
  v
Permission middleware -- checks role-based access for the operation
  |
  v
Your procedure/loader
```

In tRPC, `protectedProcedure` runs the session middleware, and `orgProcedure` runs both session and org context middleware. Permission checks are called explicitly inside procedures.

## Session middleware

The session middleware extracts a token from the `Authorization: Bearer <token>` header or a `session` cookie, validates it against the `SessionService`, and returns the authenticated user context.

### In tRPC procedures

`protectedProcedure` and `orgProcedure` enforce authentication automatically. If no valid session exists, they throw an `UNAUTHORIZED` error before your code runs:

```ts
import { router, protectedProcedure } from '@cruzjs/core/trpc/context';

export const profileRouter = router({
  get: protectedProcedure.query(async ({ ctx }) => {
    // ctx.session is guaranteed to exist
    const userId = ctx.session.user.id;
    // ...
  }),
});
```

### In loaders and actions

For React Router loaders and actions, call `requireSession` directly:

```ts
import type { LoaderFunctionArgs } from 'react-router';
import { handleCruzLoader } from '@cruzjs/core/routing';
import { requireSession } from '@cruzjs/core/shared/middleware/session.middleware';

export const loader = (...args: [LoaderFunctionArgs]) =>
  handleCruzLoader(args, async ({ request, container }) => {
    const session = await requireSession(request, container);
    // session.user.id is available
    return { userId: session.user.id };
  });
```

### Optional session

Use `getSession` when authentication is optional (e.g., a page that shows different content for logged-in users):

```ts
import { getSession } from '@cruzjs/core/shared/middleware/session.middleware';

export const loader = (...args: [LoaderFunctionArgs]) =>
  handleCruzLoader(args, async ({ request, container }) => {
    const session = await getSession(request, container);
    // session is null if not authenticated
    return { isLoggedIn: !!session };
  });
```

### Session context shape

```ts
type AuthenticatedRequest = {
  user: {
    id: string;
  };
  session: SessionData;  // Full session data including token metadata
};
```

## Organization context middleware

The org context middleware extracts the organization ID from either route params (`params.orgId`) or the `X-Organization-ID` header, then loads the user's membership and role in that organization.

### In tRPC procedures

`orgProcedure` handles this automatically:

```ts
import { router, orgProcedure } from '@cruzjs/core/trpc/context';

export const projectRouter = router({
  list: orgProcedure.query(async ({ ctx }) => {
    // ctx.org is guaranteed to exist
    const { orgId, userId, role } = ctx.org;
    // ...
  }),
});
```

### In loaders and actions

Call `requireOrgContext` after establishing a session:

```ts
import { requireSession } from '@cruzjs/core/shared/middleware/session.middleware';
import { requireOrgContext } from '@cruzjs/core/shared/middleware/org-context.middleware';

export const loader = (...args: [LoaderFunctionArgs]) =>
  handleCruzLoader(args, async ({ request, params, container }) => {
    const session = await requireSession(request, container);
    const orgContext = await requireOrgContext(request, params, session, container);

    // orgContext.org.orgId, orgContext.org.role available
    return { role: orgContext.org.role };
  });
```

### How the org ID is resolved

The middleware checks two sources in order:

1. **Route params** -- `params.orgId` (for routes like `/api/orgs/:orgId/...`)
2. **Header** -- `X-Organization-ID` (set automatically by the client-side `OrgContextBridge`)

### Org context shape

```ts
type AuthenticatedOrgRequest = AuthenticatedRequest & {
  org: {
    orgId: string;                                      // Organization ID
    userId: string;                                     // Current user ID
    role: 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER';     // User's role
  };
};
```

### What the middleware checks

1. An org ID is present (from params or header)
2. The organization exists and is not soft-deleted
3. The user is a member of the organization
4. The user's role is loaded

If any check fails, the middleware throws an appropriate HTTP error (400, 403, or 404).

## Permission middleware

Permission middleware checks whether the user's role grants access to a specific operation. Call it explicitly inside your procedures after the org context is established.

### requirePermission

Check a single permission:

```ts
import { requirePermission } from '@cruzjs/core/shared/middleware/permission.middleware';

create: orgProcedure
  .input(createProjectSchema)
  .mutation(async ({ ctx, input }) => {
    await requirePermission(ctx, 'project:write');
    // User has write access, proceed
  }),
```

### requireAnyPermission

Check that the user has at least one of the listed permissions (OR logic):

```ts
import { requireAnyPermission } from '@cruzjs/core/shared/middleware/permission.middleware';

export: orgProcedure.query(async ({ ctx }) => {
  await requireAnyPermission(ctx, ['report:read', 'admin:read']);
  // User has either report:read or admin:read
}),
```

### requireAllPermissions

Check that the user has every listed permission (AND logic):

```ts
import { requireAllPermissions } from '@cruzjs/core/shared/middleware/permission.middleware';

dangerousAction: orgProcedure.mutation(async ({ ctx }) => {
  await requireAllPermissions(ctx, ['admin:write', 'billing:write']);
  // User has both permissions
}),
```

### Permission format

Permissions follow the pattern `<resource>:<action>`:

| Permission | Description |
|-----------|-------------|
| `project:read` | View projects |
| `project:write` | Create and update projects |
| `project:delete` | Delete projects |
| `org:read` | View organization details |
| `org:write` | Update organization settings |
| `org:delete` | Delete the organization |
| `member:read` | View members |
| `member:write` | Add/update members |
| `billing:read` | View billing info |
| `billing:write` | Update billing |

### Default role permissions

| Permission pattern | OWNER | ADMIN | MEMBER | VIEWER |
|-------------------|:---:|:---:|:---:|:---:|
| `*:read` | Yes | Yes | Yes | Yes |
| `*:write` | Yes | Yes | Yes | No |
| `*:delete` | Yes | Yes | No | No |
| `org:write` | Yes | Yes | No | No |
| `org:delete` | Yes | No | No | No |
| `billing:read` | Yes | Yes | No | No |
| `billing:write` | Yes | No | No | No |

## Loader/action middleware wrappers

`handleCruzLoader` and `handleCruzAction` wrap your loader/action functions to handle bootstrapping and error processing:

```ts
import { handleCruzLoader, handleCruzAction } from '@cruzjs/core/routing';

export const loader = (...args: [LoaderFunctionArgs]) =>
  handleCruzLoader(args, async ({ request, params, container }) => {
    // container is the DI container, ready to use
    // Any thrown errors are caught and logged by middleware processors
    return { data: 'hello' };
  });

export const action = (...args: [ActionFunctionArgs]) =>
  handleCruzAction(args, async ({ request, container }) => {
    const formData = await request.formData();
    // Process form...
    return { success: true };
  });
```

### Middleware options

Both wrappers accept an optional third argument:

```ts
handleCruzLoader(args, handler, {
  // Status codes that should not trigger error logging
  allowedStatusCodes: [404],

  // Custom middleware processors for error/status handling
  processors: [new MyCustomProcessor()],
});
```

### Deprecated aliases

The previous names `withLoaderMiddleware` and `withActionMiddleware` are still exported as deprecated aliases. They work identically to `handleCruzLoader` and `handleCruzAction` but will be removed in a future release. Update existing code to use the new names.

## Creating custom middleware processors

Extend `MiddlewareProcessor` to add custom error handling or logging:

```ts
import { MiddlewareProcessor } from '@cruzjs/core/routing';

export class SentryMiddleware extends MiddlewareProcessor {
  async handleError(error: unknown, request: Request, context: 'loader' | 'action'): Promise<void> {
    // Report to Sentry, Datadog, etc.
    Sentry.captureException(error, {
      tags: { context, url: request.url },
    });
  }

  async handleStatusCode(status: number, request: Request, context: 'loader' | 'action'): Promise<void> {
    if (status >= 500) {
      Sentry.captureMessage(`HTTP ${status} in ${context}: ${request.url}`);
    }
  }
}
```

Use it in your routes:

```ts
export const loader = (...args: [LoaderFunctionArgs]) =>
  handleCruzLoader(args, handler, {
    processors: [new SentryMiddleware()],
  });
```

## Middleware ordering summary

The middleware execution order within a tRPC request is:

1. **Context creation** -- `createContext()` runs `getSession()` and `getOrgContext()` for every request
2. **Procedure middleware** -- `protectedProcedure` asserts `ctx.session` exists; `orgProcedure` asserts `ctx.org` exists
3. **Permission check** -- Your explicit `requirePermission()` call inside the procedure
4. **Business logic** -- Your service method runs
