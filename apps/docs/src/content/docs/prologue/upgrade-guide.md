---
title: Upgrade Guide
description: How to upgrade between CruzJS versions and handle breaking changes.
---

This guide covers how to upgrade your CruzJS application between versions, what to expect from breaking changes, and the project's approach to deprecations.

## Versioning Policy

CruzJS follows [Semantic Versioning](https://semver.org/):

- **Major versions** (1.x → 2.x) — Breaking changes that require code modifications
- **Minor versions** (1.1 → 1.2) — New features, backward-compatible
- **Patch versions** (1.1.0 → 1.1.1) — Bug fixes, backward-compatible

All packages in the monorepo (`@cruzjs/core`, `@cruzjs/start`, `@cruzjs/saas`, `@cruzjs/cli`) share the same version number and are released together. When you upgrade, update all `@cruzjs/*` packages to the same version.

## How to Upgrade

### Step 1: Check the Changelog

Before upgrading, read the changelog for every version between your current version and the target version. Pay special attention to entries marked **BREAKING**.

### Step 2: Update Dependencies

Update all CruzJS packages to the target version:

```bash
pnpm update @cruzjs/core @cruzjs/start @cruzjs/saas @cruzjs/cli
```

Or set the exact version in your `package.json`:

```json
{
  "dependencies": {
    "@cruzjs/core": "^1.2.0",
    "@cruzjs/start": "^1.2.0",
    "@cruzjs/saas": "^1.2.0"
  },
  "devDependencies": {
    "@cruzjs/cli": "^1.2.0"
  }
}
```

Then install:

```bash
pnpm install
```

### Step 3: Run the Type Checker

The type checker will catch most breaking changes — renamed exports, changed function signatures, removed APIs:

```bash
cruz typecheck
```

Fix any type errors before proceeding.

### Step 4: Run Database Migrations

Some upgrades include new framework-level migrations (for example, adding columns to the auth or jobs tables). Apply them:

```bash
cruz db generate
cruz db migrate
```

### Step 5: Run Tests

Verify your application works correctly:

```bash
cruz test
cruz test:e2e
```

### Step 6: Test Locally

Start the dev server and manually verify critical flows:

```bash
cruz dev
```

## Breaking Changes Format

When a major version introduces breaking changes, each change is documented with:

- **What changed** — The specific API, behavior, or configuration that changed
- **Why it changed** — The reason for the breaking change
- **Migration path** — Step-by-step instructions to update your code

Example format:

> ### `orgProcedure` context shape changed
>
> **What changed:** The `ctx.org.userId` field was renamed to `ctx.org.memberId` to clarify that it refers to the membership record, not the user identity.
>
> **Why:** The previous naming was ambiguous — `userId` could mean the auth identity ID or the org member ID. The rename eliminates this confusion.
>
> **Migration:**
> ```typescript
> // Before
> const userId = ctx.org.userId;
>
> // After
> const memberId = ctx.org.memberId;
> ```
>
> Search your codebase for `ctx.org.userId` and replace with `ctx.org.memberId`.

## Deprecation Policy

CruzJS deprecates APIs before removing them:

1. **Deprecation notice** — The API is marked as deprecated in a minor version. A console warning is emitted at runtime. The documentation is updated with the replacement.

2. **Migration window** — The deprecated API continues to work for at least one full minor version cycle. For widely-used APIs, the window may be longer.

3. **Removal** — The deprecated API is removed in the next major version. The removal is listed as a breaking change with migration instructions.

Deprecated APIs are marked with JSDoc `@deprecated` tags, so your IDE will show strikethrough and a warning:

```typescript
/**
 * @deprecated Use `container.resolve(MyService)` instead. Will be removed in v2.0.
 */
export function getService<T>(token: symbol): T {
  // ...
}
```

## Version History

### v1.0.0 (Initial Release)

The first stable release of CruzJS, including:

- `@cruzjs/core` — DI container, auth, tRPC integration, database layer, events, jobs
- `@cruzjs/start` — UI components, theming, shared layouts, organizations, members, invitations, roles, permissions
- `@cruzjs/saas` — Billing, admin dashboard, audit logging
- `@cruzjs/cli` — Unified CLI for dev, db, deploy, and scaffold commands
- Cloudflare Pages + D1 + KV + R2 support
- React Router v7 integration
- `@cruzjs/create` scaffolder

## Upgrade Checklist

Use this checklist when performing any upgrade:

- [ ] Read the changelog for all versions between current and target
- [ ] Update all `@cruzjs/*` packages to the same version
- [ ] Run `pnpm install`
- [ ] Run `cruz typecheck` and fix errors
- [ ] Run `cruz db generate` and `cruz db migrate` if there are new migrations
- [ ] Run `cruz test` and fix failures
- [ ] Run `cruz test:e2e` and fix failures
- [ ] Start `cruz dev` and manually test critical flows
- [ ] Deploy to a preview environment before production: `cruz deploy preview`
