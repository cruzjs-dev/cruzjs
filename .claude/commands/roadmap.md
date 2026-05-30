---
name: roadmap
description: Execute the next incomplete task in the CruzJS roadmap. Reads MASTER_PLAN.md, implements the task per its phase plan, runs checks, marks done. Loop with /loop /roadmap to drive the full roadmap autonomously.
model: opus
color: purple
---

# /roadmap — CruzJS Roadmap Executor

Picks the next incomplete task from `.cruz-agent/roadmap/MASTER_PLAN.md`, implements it fully per the phase spec, runs type check and tests, marks it complete. One task per invocation. Use `/loop /roadmap` to run continuously until all tasks are done.

---

## Step 1 — Read the Plan

Read `.cruz-agent/roadmap/MASTER_PLAN.md`.

Find the first line matching `- [ ]` (not `[x]` or `[~]`). That is the current task.

If no `[ ]` tasks remain: output "All roadmap tasks complete." and stop.

Extract:
- Task ID (e.g. `P1.2`)
- Task name (e.g. "Extensible email template registry")
- Phase number (from the task ID prefix: P1 = phase-1, P2 = phase-2, etc.)

Mark it in-progress: change `- [ ] P1.2` → `- [~] P1.2` in MASTER_PLAN.md.

---

## Step 2 — Read the Phase Spec

Map task ID to phase file:
- P1.x → `.cruz-agent/roadmap/phase-1-quick-wins.md`
- P2.x → `.cruz-agent/roadmap/phase-2-admin-ui.md`
- P3.x → `.cruz-agent/roadmap/phase-3-dx-ergonomics.md`
- P4.x → `.cruz-agent/roadmap/phase-4-ops-storage.md`
- P5.x → `.cruz-agent/roadmap/phase-5-docs.md`

Read the full phase file. Find the section matching the task ID and name. This is your implementation spec — follow it exactly.

---

## Step 3 — Read Relevant KB Files

The phase spec tells you which KB files apply. Always read:
- `.claude/kb/01-ARCHITECTURE.md`
- `.claude/kb/02-TYPESCRIPT.md`

Then read the domain-specific KB files listed in the spec's "Read before starting" section.

Also read any source files the spec cites as "Files to touch" — understand them before changing them.

---

## Step 4 — Implement

Follow the "Implementation steps" in the phase spec exactly. Do not add features beyond what the spec describes. Do not refactor surrounding code unless the spec says to.

### Code conventions (mandatory):
- `@injectable()` services, `createToken<T>()` injection tokens — see `03-DI-INVERSIFY.md`
- Drizzle schema in `apps/web/src/database/schema.ts` — never separate schema files
- tRPC: `protectedProcedure` for user-scoped, `orgProcedure` for org-scoped
- All new exports go through the package `index.ts`
- No comments except when WHY is non-obvious
- No `any` — if you need escape hatches, use `unknown` + narrow
- UI components: use existing components from `packages/start/src/` before creating new ones

### When adding a new service:
1. Create the file with `@injectable()` class
2. Create injection token via `createToken<ServiceInterface>('Name')`
3. Register in the relevant module's `ContainerModule`
4. Export from `packages/core/src/index.ts` or `packages/start/src/index.ts`

### When adding a new tRPC procedure:
1. Add to the existing router class (`@Router()` class with `@TrpcRouter`)
2. Use `protectedProcedure` or `orgProcedure` — never raw procedure
3. Input validated with Zod
4. No business logic in the router — call a service

### When adding a UI route:
1. Add file to `apps/web/src/routes/` using React Router v7 file convention
2. Export `loader`, `action`, default component
3. Add to the relevant module's `routes` array if framework-registered

---

## Step 5 — Run Checks

After implementing, run these in order. Fix any failures before proceeding.

```bash
# Type check — must pass with zero errors
npx tsx packages/cli/src/index.tsx typecheck

# Unit tests — run tests in the affected package
npx tsx packages/cli/src/index.tsx test --filter <affected-package>

# If a route was added — build check
npx tsx packages/cli/src/index.tsx build 2>&1 | tail -20
```

If typecheck fails: fix the errors. Do not skip or suppress.
If tests fail: fix the failures. Do not delete tests.
If build fails: fix it. A passing typecheck with a failing build means a missing import or misconfigured route.

---

## Step 6 — Write a Test

If the phase spec includes a "Test:" section and no test was written during implementation, write it now.

Test location: `packages/<affected-package>/src/__tests__/<domain>.test.ts`

Test conventions (from `.claude/kb/10-TESTING.md`):
- Use `createTestDb` for database tests
- Use `createTestContainer` for DI integration tests
- Use `createMailFake` / `createStorageFake` for service tests (once P1.4 is done)
- `describe` block named after the feature, `it` blocks named as sentences

Run the test and confirm it passes before continuing.

---

## Step 7 — Mark Complete

Update `.cruz-agent/roadmap/MASTER_PLAN.md`:
- Change `- [~] P1.2 — ...` → `- [x] P1.2 — ...`
- Update the "Completion Summary" at the bottom: increment "Complete" count, decrement "Remaining" count

---

## Step 8 — Report

Output a brief summary:

```
✓ P1.2 — Extensible email template registry

Files changed:
- packages/core/src/email/email-template.registry.ts (new)
- packages/core/src/email/template.service.ts (rewritten getTemplateComponent)
- packages/core/src/email/email.module.ts (register built-in templates)
- packages/core/src/email/index.ts (export EmailTemplateRegistry)

Tests: 2 passing
Typecheck: clean

Next task: P1.3 — Email queuing
Run /roadmap again to continue.
```

---

## Package Rename Tasks

When reaching the "Package Rename Tracking" section in MASTER_PLAN.md:

- `packages/saas` → `packages/saas`
- Update `packages/saas/package.json`: `"name": "@cruzjs/saas"`
- Global find-and-replace: `@cruzjs/saas` → `@cruzjs/saas` across all source files
- Update `apps/web/package.json` dependencies
- Update `@cruzjs/create` template references
- Update all docs references
- Run `npm install` and typecheck

---

## Error Recovery

**If a file the spec references doesn't exist:**
Search for similar files — the spec may have a slightly wrong path. If genuinely missing, create it following CruzJS conventions. Do not skip the task.

**If the spec is ambiguous:**
Default to the simplest implementation that satisfies the "Done when" criteria. Do not over-engineer.

**If typecheck fails after 2 fix attempts:**
Stop, report the specific error, and explain what you tried. Do not mark the task complete.

**If the task depends on a prior incomplete task:**
Check MASTER_PLAN.md. If a dependency task is not `[x]`, implement the dependency first (read its spec), then return to the current task.
