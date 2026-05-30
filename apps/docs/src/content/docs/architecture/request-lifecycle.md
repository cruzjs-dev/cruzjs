---
title: Request Lifecycle
description: How an HTTP request flows through CruzJS from the browser to the database and back.
---

Every request in a CruzJS application passes through a well-defined pipeline. Understanding this pipeline is essential for debugging, writing middleware, and knowing where your code runs.

## The Full Request Flow

```
Browser
  │
  ▼
Cloudflare Edge (CDN + Workers runtime)
  │
  ▼
React Router (SSR loader/action OR /api/trpc/* handler)
  │
  ▼
tRPC Handler (resolves procedure, parses input)
  │
  ▼
Middleware Chain
  ├─ Session middleware (validate token → ctx.session)
  ├─ Org context middleware (read X-Organization-ID → ctx.org)
  └─ Permission check (requirePermission)
  │
  ▼
tRPC Procedure (publicProcedure / protectedProcedure / orgProcedure)
  │
  ▼
Service Layer (resolved from DI container)
  │
  ▼
Drizzle ORM → Database (adapter-specific: D1, PostgreSQL, etc.)
  │
  ▼
Response (JSON serialized back through tRPC → HTTP)
```

## Step-by-Step Breakdown

### 1. Browser Sends Request

The client makes requests in one of two ways:

- **Page navigation**: The browser requests a route, triggering a React Router loader or action on the server.
- **tRPC call**: A React component calls a tRPC procedure (e.g., `trpc.product.list.useQuery()`), which sends a fetch request to `/api/trpc/*`.

In both cases, the tRPC client automatically attaches two headers:

```typescript
// Configured in apps/web/src/trpc/client.ts
headers: () => {
  const token = getStoredSessionToken();
  const orgId = getCurrentOrgId(); // From OrgContext

  return {
    ...(token ? { authorization: `Bearer ${token}` } : {}),
    ...(orgId ? { 'X-Organization-ID': orgId } : {}),
  };
};
```

### 2. Cloudflare Edge

The request hits Cloudflare's global network. For CruzJS apps deployed to Cloudflare Pages:

- **Static assets** (JS bundles, images) are served directly from the CDN.
- **Dynamic requests** (page loads, API calls) are routed to the Pages Functions worker.
- **Bindings** (D1, KV, R2, AI) are attached to the execution context and made available through `CloudflareContext`.

The worker runtime executes your server-side code at the edge, close to the user.

### 3. React Router Entry Point

All server-side logic enters through `entry.server.tsx`, which has already bootstrapped the application:

```typescript
// server.cloudflare.ts
import { createCruzApp } from '@cruzjs/core';
import { CloudflareAdapter } from '@cruzjs/adapter-cloudflare';
import * as schema from './database/schema';
import { UserProfileModule } from './features/user-profile';

export default createCruzApp({
  schema,
  modules: [UserProfileModule],
  adapter: new CloudflareAdapter(),
  pages: () => import('virtual:react-router/server-build'),
});
```

React Router handles two types of server execution:

- **Loaders** run on GET requests to hydrate page data.
- **Actions** run on POST/PUT/DELETE form submissions.

For tRPC calls, the `/api/trpc/*` route catches the request and hands it to the tRPC handler.

### 4. tRPC Handler

The tRPC handler in `@cruzjs/core/trpc/handler.ts` receives the raw request and:

1. Parses the procedure path (e.g., `product.list`) from the URL.
2. Validates the input against the procedure's Zod schema.
3. Builds the initial context object from the request.
4. Delegates to the appropriate procedure.

### 5. Middleware Chain

Before the procedure's resolver runs, the middleware chain executes in order:

#### Session Middleware

Reads the `Authorization: Bearer <token>` header, validates the session token against the database, and attaches the authenticated user to the context:

```typescript
// After session middleware runs:
ctx.session.user.id     // "user_abc123"
ctx.session.user.email  // "user@example.com"
```

If the token is missing or invalid and the procedure requires auth, a `401 UNAUTHORIZED` error is returned.

#### Org Context Middleware

Reads the `X-Organization-ID` header and verifies the user is a member of that organization. It attaches the organization context:

```typescript
// After org context middleware runs:
ctx.org.orgId   // "org_xyz789"
ctx.org.userId  // "user_abc123"
ctx.org.role    // "OWNER" | "ADMIN" | "MEMBER" | "VIEWER"
```

If the header is missing and the procedure requires org context, a `400 BAD_REQUEST` error is returned. If the user is not a member, a `403 FORBIDDEN` error is returned.

#### Permission Check

Inside the procedure resolver, `requirePermission()` verifies the user's role grants the necessary permission:

```typescript
import { requirePermission } from '@cruzjs/start/orgs/auth.utils';

// Throws FORBIDDEN if the user's role lacks this permission
await requirePermission(ctx.org, 'product:write');
```

### 6. tRPC Procedure

The procedure resolver is the entry point for your business logic. CruzJS provides three procedure types, each with different context guarantees:

| Procedure | `ctx.session` | `ctx.org` | Use Case |
|-----------|:---:|:---:|----------|
| `publicProcedure` | No | No | Health checks, public data, login |
| `protectedProcedure` | Yes | No | User profile, list user's orgs |
| `orgProcedure` | Yes | Yes | All org-scoped resources |

```typescript
import { router, orgProcedure } from '@cruzjs/core/trpc/context';
import { getAppContainer } from '@cruzjs/core';

export const productRouter = router({
  list: orgProcedure.query(async ({ ctx }) => {
    await requirePermission(ctx.org, 'product:read');

    const container = await getAppContainer();
    const service = container.resolve(ProductService);
    return service.list(ctx.org.orgId);
  }),
});
```

### 7. Service Layer

Services are resolved from the DI container and contain all business logic. They are singleton instances (by default) shared across requests:

```typescript
import { Injectable, Inject } from '@cruzjs/core/di';
import { DRIZZLE, type DrizzleDatabase } from '@cruzjs/core/shared/database/drizzle.service';

@Injectable()
export class ProductService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDatabase,
    @Inject(EventEmitterService) private readonly events: EventEmitterService,
  ) {}

  async list(orgId: string): Promise<Product[]> {
    return this.db
      .select()
      .from(products)
      .where(eq(products.orgId, orgId))
      .orderBy(desc(products.createdAt));
  }
}
```

Services may emit domain events that trigger side effects (sending emails, audit logging) without coupling to those concerns directly.

### 8. Database Query

Drizzle ORM translates the query builder calls into SQL and executes them against the database provided by your runtime adapter (e.g., D1 on Cloudflare, PostgreSQL on AWS/GCP/Azure, local SQLite during Cloudflare development).

All org-scoped queries must include an `orgId` filter. All user-specific queries must include a `userId` filter. This is the most critical security boundary in the application.

### 9. Response

The result flows back up through the stack:

1. The service returns data to the procedure resolver.
2. tRPC serializes the result as JSON.
3. The HTTP response is sent back through Cloudflare to the browser.
4. On the client, React Query caches the response and triggers a re-render.

## Server-Side Rendering Flow

For page navigations (not direct tRPC calls), the flow includes an additional SSR step:

```
Browser navigates to /orgs/acme/products
  │
  ▼
React Router matches route, calls loader()
  │
  ▼
Loader calls tRPC procedures server-side
  │
  ▼
HTML is rendered with data, sent to browser
  │
  ▼
React hydrates on client, attaches event handlers
```

Loaders use the same tRPC procedures as client-side calls, ensuring a single source of truth for data fetching and authorization.

## Event Side Effects

After a successful mutation, the service layer may dispatch domain events. These run within the same request but are decoupled from the core business logic:

```
Service.create()
  │
  ├─ Insert into database
  ├─ Dispatch ProductCreatedEvent
  │   ├─ Sync listener: update search index
  │   └─ Queued listener: send notification email (background job)
  │
  └─ Return result to procedure
```

Synchronous listeners execute before the response is sent. Queued listeners are enqueued as background jobs and processed asynchronously.

## Error Handling

Errors at any point in the pipeline are caught and returned as structured tRPC errors:

| Layer | Error Type | HTTP Status |
|-------|-----------|:-----------:|
| Session middleware | `UNAUTHORIZED` | 401 |
| Org context middleware | `FORBIDDEN` | 403 |
| Permission check | `FORBIDDEN` | 403 |
| Input validation | `BAD_REQUEST` | 400 |
| Service (not found) | `NOT_FOUND` | 404 |
| Service (conflict) | `CONFLICT` | 409 |
| Unhandled exception | `INTERNAL_SERVER_ERROR` | 500 |

On the client, these errors are available through React Query's `error` object:

```typescript
const { error } = trpc.product.list.useQuery();

if (error) {
  console.error(error.message); // Human-readable message
  console.error(error.data?.code); // "FORBIDDEN", "NOT_FOUND", etc.
}
```
