---
title: "04 — Authentication"
description: Auth is pre-configured. Learn how it works and add a user-scoped query.
---

# Chapter 04 — Authentication

CruzJS ships with auth pre-configured: signup, email verification, login, and password reset. This chapter explains how it works and shows you how to build on top of it.

## Try it out

With `cruz dev` running:

1. Go to `http://localhost:5173/auth/register`
2. Sign up with any email (local dev catches all emails at `/dev/emails`)
3. Visit `http://localhost:5173/dev/emails` to see the verification email
4. Click the link — you're in

Password reset flows through the same email route.

## How auth works

Auth is provided by `@cruzjs/core`'s `AuthModule`. It exposes tRPC procedures at `trpc.auth.*`:

- `auth.login` — email + password
- `auth.register` — create account, sends verification email
- `auth.logout` — invalidates session
- `auth.forgotPassword` / `auth.resetPassword` — password reset flow

Sessions are stored in D1. Each request passes a session token via cookie. The framework resolves it to a `User` and puts it on `ctx.session`.

## `protectedProcedure`

Any tRPC procedure wrapped with `protectedProcedure` requires a valid session:

```typescript
// This works from any module
myProcedure: t.protectedProcedure.query(({ ctx }) => {
  const userId = ctx.session.user.id;
  // ...
})
```

If the user is not logged in, the procedure returns a `401` automatically. You never write auth guards by hand.

## Add a "my tasks" query

Tasks are org-scoped, but let's add a query that returns only tasks assigned to the current user — across all orgs they belong to.

In `packages/core/src/tasks/tasks.service.ts`, add:

```typescript
async listByUser(userId: string) {
  return this.db.select().from(tasks).where(eq(tasks.assigneeId, userId));
}
```

In `packages/core/src/tasks/tasks.trpc.ts`, add to the router:

```typescript
myTasks: t.protectedProcedure.query(({ ctx }) =>
  this.service.listByUser(ctx.session.user.id)
),
```

Note: this uses `protectedProcedure` (not `orgProcedure`) because it crosses org boundaries — it's user-scoped, not org-scoped.

## Access the current user in a loader

If you need the session in a React Router loader:

```typescript
// apps/web/src/routes/my-tasks.tsx
export async function loader({ context }: LoaderFunctionArgs) {
  const session = await context.getSession();
  if (!session) throw redirect('/auth/login');
  return { user: session.user };
}
```

## What we built

- Understood the built-in auth flow
- Added a `protectedProcedure` that uses `ctx.session.user.id`
- Saw how loaders access the session

**Next:** [Chapter 05 — Organizations](/tutorial/05-organizations/)
