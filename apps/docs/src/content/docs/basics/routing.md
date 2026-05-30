---
title: Routing
description: Feature-based routing with React Router v7 in CruzJS.
---

CruzJS uses [React Router v7](https://reactrouter.com/) with an explicit route configuration. Routes live **inside feature directories** alongside their services, schemas, and routers, keeping each feature fully self-contained. The central `src/routes.ts` file wires everything together.

## Route configuration

Use `createCruzRoutes` to compose your app's route config. It always includes core framework routes (auth, API endpoints) and accepts additional framework registrars, feature modules, and app-specific routes:

```ts
// src/routes.ts
import { type RouteConfig, route, index, layout, prefix } from '@react-router/dev/routes';
import { createCruzRoutes } from '@cruzjs/core/routing';
import { registerCruzSaasRoutes } from '@cruzjs/saas/routing';
import { registerCruzStartRoutes } from '@cruzjs/start/routing';
import { ForumModule } from './features/forum/forum.module';

export default createCruzRoutes({
  route, index, layout, prefix,
  dir: import.meta.dirname,
  framework: {
    registrars: [registerCruzSaasRoutes, registerCruzStartRoutes],
    overrides: {
      // Replace or remove any framework route by its path:
      // 'auth/register': null,
      // 'auth/login': { file: 'features/auth/routes/my-login.tsx' },
    },
  },
  modules: [ForumModule],
  routes: [
    // Landing page and any routes that don't belong to a module
    index('routes/index.tsx'),
    ...prefix('api', [
      route('debug', 'routes/api/debug.ts'),
    ]),
  ],
}) satisfies RouteConfig;
```

### Feature directory structure

Route files live inside `features/<name>/routes/`, co-located with the rest of the feature:

```
src/features/forum/
├── forum.service.ts
├── forum.router.ts
├── forum.schema.ts
├── forum.validation.ts
├── forum.module.ts       # ← declares pageRoutes here
├── routes/               # Route files
│   ├── index.tsx         # /forums (list page)
│   ├── $id.tsx           # /forums/:id (detail page)
│   └── new.tsx           # /forums/new (create page)
└── index.ts
```

Root-level routes (landing page, API endpoints, etc.) can still live in `src/routes/` when they do not belong to a specific feature.

## Module-declared routes

Declare a feature's routes directly inside its `@Module` using the `pageRoutes` factory. The module is then passed to `createCruzRoutes` -- no manual wiring in `routes.ts`:

```ts
// src/features/forum/forum.module.ts
import { Module } from '@cruzjs/core';
import { ForumService } from './forum.service';
import { forumRouter } from './forum.router';

@Module({
  providers: [ForumService],
  trpcRouters: { forum: forumRouter },
  pageRoutes: (helpers) => [
    ...helpers.prefix('forums', [
      helpers.index('features/forum/routes/index.tsx'),
      helpers.route(':id', 'features/forum/routes/$id.tsx'),
      helpers.route('new', 'features/forum/routes/new.tsx'),
    ]),
  ],
})
export class ForumModule {}
```

Then in `routes.ts`:

```ts
import { ForumModule } from './features/forum/forum.module';

export default createCruzRoutes({
  ...,
  modules: [ForumModule],  // routes are pulled from the module automatically
});
```

This keeps each feature entirely self-contained -- its pageRoutes, providers, and trpcRouters all live in one `@Module` definition.

### Overriding framework routes

Pass overrides in the `framework` object. Keys are the route paths declared by the registrar:

```ts
framework: {
  registrars: [registerCruzSaasRoutes, registerCruzStartRoutes],
  overrides: {
    'auth/login': { file: 'features/auth/routes/my-login.tsx' },
    'auth/register': null,          // disable registration
    'orgs/:slug/billing': null,     // disable billing page
  },
},
```

The same flat map applies across all registrars — paths don't conflict between packages.

## Route modules

Each route file is a **route module** that can export a component (the page), a `loader` (server-side data fetching), and an `action` (form submissions / mutations).

### Basic page route

```tsx
// src/features/forum/routes/index.tsx
export default function ForumListPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">Forums</h1>
    </div>
  );
}
```

### Loader (server-side data)

Loaders run on the server before the component renders. Use `handleCruzLoader` to get access to the DI container:

```tsx
// src/features/forum/routes/index.tsx
import type { LoaderFunctionArgs } from 'react-router';
import { useLoaderData } from 'react-router';
import { handleCruzLoader } from '@cruzjs/core/routing';
import { requireSession } from '@cruzjs/core/shared/middleware/session.middleware';

export const loader = (...args: [LoaderFunctionArgs]) =>
  handleCruzLoader(args, async ({ request, container }) => {
    const session = await requireSession(request, container);
    return { userId: session.user.id };
  });

export default function ForumListPage() {
  const { userId } = useLoaderData<typeof loader>();

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">Welcome, {userId}</h1>
    </div>
  );
}
```

### Action (form mutations)

Actions handle form submissions and POST requests:

```tsx
// src/features/forum/routes/new.tsx
import type { ActionFunctionArgs, LoaderFunctionArgs } from 'react-router';
import { useLoaderData, Form } from 'react-router';
import { handleCruzLoader, handleCruzAction } from '@cruzjs/core/routing';
import { requireSession } from '@cruzjs/core/shared/middleware/session.middleware';

export const loader = (...args: [LoaderFunctionArgs]) =>
  handleCruzLoader(args, async ({ request, container }) => {
    const session = await requireSession(request, container);
    return { userId: session.user.id };
  });

export const action = (...args: [ActionFunctionArgs]) =>
  handleCruzAction(args, async ({ request, container }) => {
    const session = await requireSession(request, container);
    const formData = await request.formData();
    const title = formData.get('title') as string;
    return { success: true };
  });

export default function NewForumPage() {
  const { userId } = useLoaderData<typeof loader>();

  return (
    <Form method="post">
      <input name="title" type="text" />
      <button type="submit">Create</button>
    </Form>
  );
}
```

## Dynamic params

Use `$paramName` in the filename and map it to `:paramName` in the module pageRoutes factory:

```ts
pageRoutes: (helpers) => [
  ...helpers.prefix('forums', [
    helpers.index('features/forum/routes/index.tsx'),
    helpers.route(':id', 'features/forum/routes/$id.tsx'),  // $id.tsx → :id
    helpers.route('new', 'features/forum/routes/new.tsx'),
  ]),
],
```

```tsx
// src/features/forum/routes/$id.tsx
import { useParams } from 'react-router';

export default function ForumDetailPage() {
  const { id } = useParams<{ id: string }>();
  return <h1>Forum: {id}</h1>;
}
```

In loaders, params are available on the args object:

```tsx
export const loader = (...args: [LoaderFunctionArgs]) =>
  handleCruzLoader(args, async ({ params, container }) => {
    const forumId = params.id!;
    return { forumId };
  });
```

## Nested routes and layouts

Use `helpers.layout` to wrap feature routes with a shared UI shell:

```ts
pageRoutes: (helpers) => [
  helpers.layout('features/forum/routes/layout.tsx', [
    ...helpers.prefix('forums', [
      helpers.index('features/forum/routes/index.tsx'),
      helpers.route(':id', 'features/forum/routes/$id.tsx'),
      helpers.route('new', 'features/forum/routes/new.tsx'),
    ]),
  ]),
],
```

The layout component renders an `<Outlet>` where child routes appear:

```tsx
// src/features/forum/routes/layout.tsx
import { Outlet } from 'react-router';

export default function ForumLayout() {
  return (
    <div className="flex min-h-screen">
      <nav className="w-64 bg-slate-50 border-r border-slate-200 p-4">
        {/* Sidebar navigation */}
      </nav>
      <main className="flex-1 p-6">
        <Outlet />
      </main>
    </div>
  );
}
```

### Passing context to child routes

Layouts can pass data to children via `Outlet` context:

```tsx
// src/features/org/routes/layout.tsx
import { Outlet, useParams } from 'react-router';
import { trpc } from '@/trpc/client';

export default function OrgLayout() {
  const { slug } = useParams();
  const { data: orgData } = trpc.org.getBySlug.useQuery({ slug: slug! });

  return (
    <Outlet
      context={{
        organization: orgData?.organization,
        orgId: orgData?.organization?.id,
      }}
    />
  );
}
```

Child routes access the context with `useOutletContext`:

```tsx
// src/features/org/routes/overview.tsx
import { useOutletContext } from 'react-router';

export default function OrgOverviewPage() {
  const { organization, orgId } = useOutletContext<{
    organization: { name: string };
    orgId: string;
  }>();

  return <h1>{organization.name}</h1>;
}
```

## Programmatic navigation

Use the `useNavigate` hook for navigation in event handlers:

```tsx
import { useNavigate } from 'react-router';

export default function CreateForumPage() {
  const navigate = useNavigate();

  const handleCreate = async () => {
    const forum = await createForum();
    navigate(`/forums/${forum.id}`);
  };

  return <button onClick={handleCreate}>Create</button>;
}
```

### Navigation helpers

```tsx
import { useNavigate } from 'react-router';

const navigate = useNavigate();

navigate('/forums');                       // go to a path
navigate(-1);                             // go back
navigate('/forums', { replace: true });   // replace history entry
```

## Linking between pages

Use the `Link` component for declarative navigation:

```tsx
import { Link } from 'react-router';

<Link to="/forums" className="text-brand-600 hover:underline">
  Forums
</Link>

<Link to={`/forums/${forum.id}`}>
  {forum.name}
</Link>
```

## API routes

API routes export a `loader` (GET) or `action` (POST/PUT/DELETE) without a default component. Routes that don't belong to a feature can live in `src/routes/api/`:

```ts
// src/routes/api/debug.ts
import type { LoaderFunctionArgs } from 'react-router';
import { handleCruzLoader } from '@cruzjs/core/routing';

export const loader = (...args: [LoaderFunctionArgs]) =>
  handleCruzLoader(args, async () => {
    return Response.json({ status: 'ok', timestamp: new Date().toISOString() });
  });
```

Register them in the `routes` array of `createCruzRoutes`:

```ts
routes: [
  ...prefix('api', [
    route('debug', 'routes/api/debug.ts'),
  ]),
],
```
