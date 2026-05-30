---
title: "05 — Organizations"
description: Create an org, invite a member, and see how orgProcedure auto-scopes data.
---

# Chapter 05 — Organizations

CruzJS has multi-tenancy built in. Every piece of data belongs to an org. This chapter shows how it works and how isolation is enforced.

## Create your first org

After logging in, visit `/orgs/new`. Enter a name ("Acme Corp") and create it. You're now the owner.

Invite a teammate by going to `/orgs/settings/members` and entering their email. They'll receive an invitation link.

## How `orgProcedure` works

When a user makes a request to an `orgProcedure`, the framework:

1. Reads the active org from the session (set when the user selects an org)
2. Verifies the user is a member of that org
3. Puts the org on `ctx.org`

```typescript
tasks.list: t.orgProcedure.query(({ ctx }) => {
  // ctx.org.id is guaranteed — framework verified membership
  return this.service.listByOrg(ctx.org.id);
})
```

If the user is not a member, the procedure returns `403`. You never check this yourself.

## Data isolation in practice

Open two browser sessions with two different accounts — one as org owner, one as a fresh account with no orgs. Call `trpc.tasks.list` from both:

```javascript
// Session A (owner of Acme Corp)
await window.__trpc.tasks.list.query()
// → [{ id: '...', title: 'Deploy infra', orgId: 'acme' }]

// Session B (different user, different org)
await window.__trpc.tasks.list.query()
// → [] or 403 if not in an org
```

Org B cannot see Org A's tasks because the service always filters by `ctx.org.id`. The client never passes `orgId` — the framework provides it from the verified session.

## Switching orgs

If a user belongs to multiple orgs, they can switch with:

```typescript
await trpc.org.switchActive.mutate({ orgId: 'other-org-id' });
```

The framework updates the session's active org. Subsequent `orgProcedure` calls use the new org.

## What we built

- Created an org and invited a member
- Understood how `orgProcedure` enforces org isolation automatically
- Verified that cross-org data leakage is impossible at the framework level

**Next:** [Chapter 06 — Permissions](/tutorial/06-permissions/)
