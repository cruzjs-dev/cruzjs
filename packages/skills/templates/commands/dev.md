---
name: dev
description: Full autonomous development workflow for CruzJS. Also use as a code conventions quick reference.
model: opus
color: green
---

# Dev — CruzJS

Use as either:
- **`/dev`** — Full autonomous development pipeline with review loops
- **`/dev` (conventions)** — Quick reference for CruzJS code patterns while coding

---

# Code Conventions Quick Reference

## KB Files by Task

| Task | Read |
|------|------|
| Any feature | `01-ARCHITECTURE.md`, `02-TYPESCRIPT.md` |
| Data ownership | `08-DATA-OWNERSHIP.md` — **CRITICAL** |
| Services / DI | `03-DI-INVERSIFY.md` |
| Database / schema | `04-DATABASE-DRIZZLE.md` |
| API endpoints | `05-TRPC-ROUTERS.md` |
| Auth / permissions | `06-AUTH-ORG-SCOPING.md` |
| UI components | `07-UI-PATTERNS.md` |
| Domain events | `09-EVENTS.md` |
| Tests | `10-TESTING.md` |
| Service providers | `11-FRAMEWORK-EXTENSIBILITY.md` |
| Background jobs | `12-JOBS.md` |

## Feature Module Structure

```
apps/web/src/features/<domain>/
├── index.ts
├── <domain>.provider.ts      # Service provider
├── <domain>.module.ts        # @Module (providers, routers, routes, events)
├── <domain>.routes.ts        # React Router route config
├── <domain>.trpc.ts          # tRPC router
├── <domain>.service.ts       # Business logic
├── <domain>.validation.ts    # Zod schemas
├── <domain>.models.ts        # Response types
├── routes/                   # Route page components
│   └── <domain>._index.tsx
└── events/                   # Optional
```

## Data Ownership (CRITICAL)

```typescript
// Org-scoped → orgProcedure + requirePermission() + filter by orgId
orgProcedure.query(async ({ ctx }) => {
  await requirePermission(ctx.org, 'resource:read');
  return service.list(ctx.org.orgId);
});

// User-specific → protectedProcedure + filter by userId
protectedProcedure.query(async ({ ctx }) => {
  return service.list(ctx.session.user.id);
});
```

## Drizzle Schema

```typescript
export const myTable = pgTable('MyTable', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  orgId: text('orgId').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  createdById: text('createdById').notNull().references(() => identities.id),
  name: text('name').notNull(),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
  updatedAt: timestamp('updatedAt').defaultNow().notNull(),
}, (table) => ({
  orgIdIdx: index('MyTable_orgId_idx').on(table.orgId),
}));
export type MyEntity = typeof myTable.$inferSelect;
```

## Service

```typescript
@injectable()
export class MyService {
  constructor(@inject(DRIZZLE) private readonly db: DrizzleDatabase) {}

  async list(orgId: string): Promise<MyResponse[]> {
    return this.db.select().from(myTable).where(eq(myTable.orgId, orgId));
  }
}
```

## Container

```typescript
export const MyContainer = new ContainerModule((options) => {
  options.bind<MyService>(MyService).toSelf().inSingletonScope();
});
```

## Module + Provider

```typescript
// <domain>.routes.ts
export function myRoutes(helpers: CruzRouteHelpers) {
  return [...helpers.prefix('my-feature', [
    helpers.index('features/my-feature/routes/my-feature._index.tsx'),
  ])];
}

// <domain>.module.ts
@Module({ providers: [MyService], routers: { my: myTrpc }, routes: myRoutes })
export class MyModule {}

// <domain>.provider.ts — minimal, routes live in @Module
export const MyProvider: ServiceProvider = { module: MyModule };

// Register in apps/web/src/entry.server.tsx
// routes.ts: createCruzRoutes({ modules: [MyModule], ... })
```

## Component

```typescript
export const MyList: React.FC<{ orgId: string; currentUserRole: OrgRole | null }> = ({ orgId, currentUserRole }) => {
  const { data, isLoading, error, refetch } = trpc.my.list.useQuery();
  const canManage = currentUserRole === 'OWNER' || currentUserRole === 'ADMIN';
  if (isLoading) return <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto my-8" />;
  if (error) return <div className="bg-destructive/10 text-destructive p-4 rounded-md">{error.message}</div>;
  if (!data?.length) return <div className="text-muted-foreground py-8 text-center">No items yet.</div>;
  return <div className="space-y-2">{data.map(item => <Card key={item.id}><CardContent>{item.name}</CardContent></Card>)}</div>;
};
```

## Quick Checklist

- [ ] Data ownership correct (`userId` vs `orgId`)
- [ ] Procedure type correct (`protectedProcedure` vs `orgProcedure`)
- [ ] `requirePermission()` on org-scoped mutations
- [ ] `@injectable()` + `@inject()` in constructor
- [ ] Schema has indexes on FK columns
- [ ] Zod validation on all inputs
- [ ] Loading / error / empty states in UI
- [ ] Audit logging on sensitive mutations

## CLI Reference

```bash
cruz dev              # Start dev server (http://localhost:5173)
cruz dev stop         # Stop dev server
cruz build            # Production build
cruz test             # Unit tests (vitest)
cruz typecheck        # tsc --noEmit
cruz db generate      # Generate Drizzle migrations
cruz db migrate       # Apply to local D1
cruz db studio        # Open Drizzle Studio
cruz db query "SQL"   # Run SQL against local D1
```

---

# Autonomous Pipeline

## CRITICAL RULES

- **YOU ARE FULLY AUTHORIZED** to write any file anywhere in this repo
- **NEVER PAUSE** — Make best guesses when unsure
- **NEVER PUSH TO MAIN** — Always verify branch first
- **ALWAYS WRITE CHECKPOINTS** — After each phase, write checkpoint JSON
- **BROWSER TESTING IS MANDATORY** for frontend features — NO EXCEPTIONS
- **ALL REVIEW LOOPS MUST RUN** — UX, UI, Code, QA — DO NOT SKIP

## Pipeline Overview

```
Phase 1: Spec & Planning  → checkpoint 01-spec.json
Phase 2: Build            → checkpoint 02-build.json
Phase 3: Iterate/Validate → checkpoint 03-iterate.json (BROWSER TESTING REQUIRED)
Phase 4: UX Review        → checkpoint 04-ux-review.json (max 2 iterations)
Phase 5: UI Review        → checkpoint 05-ui-review.json (max 2 iterations)
Phase 6: Code Review      → checkpoint 06-code-review.json (max 2 iterations)
Phase 7: QA               → checkpoint 07-qa.json (max 2 iterations)
Phase 8: Finalize         → PR created on GitHub
```

## Setup

Read first: `.claude/agents/shared/context.md`, `.claude/agents/shared/config.md`

```bash
BRANCH=$(git branch --show-current)
WORK_DIR=".cruz-agent/local/${BRANCH}"
mkdir -p "$WORK_DIR"/{checkpoints,feedback,screenshots,validation-flows,progress}
```

Check for existing work:
```bash
ls "$WORK_DIR/PROGRESS.md" 2>/dev/null
ls "$WORK_DIR/checkpoints/"*.json 2>/dev/null
```
- Existing work found → **Continuation Mode** (see below)
- No existing work → Create feature branch and proceed

```bash
git stash && git checkout main && git pull origin main
git checkout -b {BRANCH_NAME}
git stash pop 2>/dev/null || true
```

## Continuation Mode

1. Read `PROGRESS.md` and all `feedback/*.md`
2. Check checkpoints to find resume point
3. Apply fixes for any NEEDS_WORK feedback
4. Document iteration in `PROGRESS.md`

---

## Execution Phases

### Phase 1: Spec & Planning

Read persona: `.claude/agents/personas/architect.md`

1. Read feature requirements from input or GitHub issue (`gh issue view {number}`)
2. Read relevant KB files (see table above)
3. Research codebase: `ls apps/web/src/features/`
4. Determine data ownership model
5. Write `PRODUCT_SPEC.md` and `PLAN.md` to `$WORK_DIR`
6. **Write checkpoint**: `checkpoints/01-spec.json`

Output: `STAGE_COMPLETE: spec`

---

### Phase 2: Build

Read persona: `.claude/agents/personas/developer.md`

Read before writing any code: `08-DATA-OWNERSHIP.md`, `03-DI-INVERSIFY.md`, `04-DATABASE-DRIZZLE.md`, `05-TRPC-ROUTERS.md`, `07-UI-PATTERNS.md`, `11-FRAMEWORK-EXTENSIBILITY.md`

Implementation order:
1. Drizzle Schema → `cruz db generate && cruz db migrate`
2. Validation (Zod) → Models (types) → Service (@injectable) → Container → Router (procedures + permissions)
3. Service Provider → Register in `entry.server.tsx`
4. UI Routes → Components (tRPC hooks, loading/error/empty states)

**Create `USER_FLOWS.md`** with exact test steps for reviewers.

Commit: `git add -p && git commit -m "{BRANCH}: Implement {feature}"`

**Write checkpoint**: `checkpoints/02-build.json`

Output: `STAGE_COMPLETE: build`

---

### Phase 3: Iterate & Validate (BROWSER TESTING MANDATORY)

Read persona: `.claude/agents/personas/developer.md`

**Frontend feature** (any `.tsx` modified) → browser testing required.
**Backend-only** → `cruz test` + `cruz typecheck`.

#### Frontend Testing:

```bash
pgrep -f "vite" || cruz dev  # wait ~10s
```

For each flow in `USER_FLOWS.md`, write a Node script using `playwright` and run it:

```bash
# Quick screenshot
npx playwright-cli screenshot http://localhost:5173{path} .cruz-agent/local/{BRANCH}/validation-flows/{flow}/attempt-{N}/screenshot.png

# Full interaction — write to /tmp/test-{flow}.js then: node /tmp/test-{flow}.js
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const consoleErrors = [];
  page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
  await page.goto('http://localhost:5173{path}');
  // click, fill, assert steps here
  await page.screenshot({ path: '.cruz-agent/local/{BRANCH}/validation-flows/{flow}/attempt-{N}/result.png' });
  console.log('Console errors:', consoleErrors);
  await browser.close();
})();
```

Screenshots: `.cruz-agent/local/{BRANCH}/validation-flows/{flow}/attempt-{N}/`

Fix → `cruz db generate && cruz db migrate` (if DB changed) → wait for HMR → re-test.

Artifacts: update `USER_FLOWS.md`, create `BEHAVIORS.md`.
Commit: `{BRANCH}: Validate and document flows`

**Write checkpoint**: `checkpoints/03-iterate.json`

Output: `STAGE_COMPLETE: iterate`

---

## Review Loop Phases

**ALL review loops MUST run. Do NOT skip.**

Pattern: Run reviewer → APPROVED or NEEDS_WORK → if NEEDS_WORK: run developer-fix → commit → re-run (max 2 iterations)

### Phase 4: UX Review

Persona: `.claude/agents/personas/ux-designer.md`

- Navigate each flow in browser, count clicks, evaluate simplicity/efficiency/clarity/forgiveness
- Write `feedback/ux-review-{N}.md`
- If NEEDS_WORK: persona `developer-fix.md` → fix → commit `{BRANCH}: Address UX feedback` → re-review

**Write checkpoint**: `checkpoints/04-ux-review.json`

### Phase 5: UI Review

Persona: `.claude/agents/personas/ui-designer.md`

- Screenshot each screen, check visual consistency, component usage, polish, states
- Write `feedback/ui-review-{N}.md`
- If NEEDS_WORK: fix → commit → re-review

**Write checkpoint**: `checkpoints/05-ui-review.json`

### Phase 6: Code Review

Persona: `.claude/agents/personas/code-reviewer.md`

- `git diff main...HEAD` → security + data ownership + pattern compliance
- Write `feedback/code-review-{N}.md`
- If NEEDS_WORK: fix Critical → High → Medium → commit → re-review

**Write checkpoint**: `checkpoints/06-code-review.json`

### Phase 7: QA

Persona: `.claude/agents/personas/qa-engineer.md`

- Execute test cases from `USER_FLOWS.md`, edge cases, security (cross-org access)
- Write `feedback/qa-results-{N}.md`
- If NEEDS_WORK: fix root causes → commit → re-run

**Write checkpoint**: `checkpoints/07-qa.json`

---

### Phase 8: Finalize

Persona: `.claude/agents/personas/developer.md`

```bash
cruz typecheck && cruz test
```

Capture screenshots → `screenshots/`.

```bash
git add . && git commit -m "{BRANCH}: Final cleanup"
BRANCH=$(git branch --show-current)
[ "$BRANCH" = "main" ] && echo "ERROR: ON MAIN!" && exit 1
git push -u origin $BRANCH
```

```bash
gh pr create \
  --title "{brief feature summary}" \
  --body "$(cat <<'EOF'
## Summary
- {bullet 1}

## Test Plan
- [ ] Verify {flow 1}

## Review Summary
- UX: {N} iterations → APPROVED
- UI: {N} iterations → APPROVED
- Code: {N} iterations → APPROVED
- QA: {N} iterations → APPROVED
EOF
)"
```

**Write checkpoint**: `checkpoints/08-finalize.json`

---

## Required Output

**On success**:
```
✅ Development complete for {BRANCH}
📝 PR: {PR_URL}
## Review Loop Summary
- UX: {N} → APPROVED  |  UI: {N} → APPROVED  |  Code: {N} → APPROVED  |  QA: {N} → APPROVED
WORKFLOW_COMPLETE
```

**If blocked**:
```
WORKFLOW_BLOCKED: {reason}
```
