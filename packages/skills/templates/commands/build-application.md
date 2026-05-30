---
name: build-application
description: Interactive wizard that asks what you want to build, decomposes it into features, writes a BUILD_PLAN.md, then drives each feature through the full dev pipeline until the application is complete.
model: opus
color: cyan
---

# Build Application — CruzJS

Interactive build wizard. Gathers what you want to build, decomposes it into feature modules, writes a master BUILD_PLAN.md, then loops through each feature using the full PM → Dev pipeline until everything is done.

## CRITICAL RULES

- **ASK FIRST** — Never decompose or write files until the user has answered the requirements questions
- **CONFIRM BEFORE BUILDING** — Show the proposed feature list and wait for approval before writing BUILD_PLAN.md
- **RESUME SUPPORT** — Always check for existing BUILD_PLAN.md before starting fresh
- **LOOP UNTIL DONE** — Process every feature in order; mark each complete before moving on
- **NEVER PUSH TO MAIN** — Always verify branch before any git push

---

## Step 1: Setup & Resume Check

```bash
BRANCH=$(git branch --show-current)
WORK_DIR=".cruz-agent/local/${BRANCH}"
mkdir -p "$WORK_DIR"
```

Check for existing work:

```bash
ls "$WORK_DIR/BUILD_PLAN.md" 2>/dev/null
```

**If BUILD_PLAN.md exists**: Read it and show the current status table to the user. Ask:
> "Found an existing build plan. Resume from where we left off, or start fresh?"

- **Resume** → Skip to Step 5, picking up at the first `pending` feature
- **Start fresh** → Archive the old plan (`mv BUILD_PLAN.md BUILD_PLAN.old.md`) and proceed to Step 2

**If no BUILD_PLAN.md**: Proceed to Step 2.

---

## Step 2: Requirements Gathering

Ask the user these questions in a single message. Wait for their full response before proceeding.

```
I need a few details to plan this out well. Answer as much or as little as you'd like:

1. What are you building? (core purpose, who the users are)
2. What are the main entities or capabilities? (e.g. projects, tasks, comments, notifications)
3. Is this org-scoped (multi-tenant, like a SaaS workspace) or user-specific (personal to each user)?
4. Any integrations or async work? (email, background jobs, webhooks, events)
5. What's the MVP — the minimum set to be useful?
6. What's nice-to-have but not required for the first version?
```

Do NOT proceed until the user responds.

---

## Step 3: Decompose Into Features

Based on the user's response:

1. Read `.claude/kb/08-DATA-OWNERSHIP.md` to inform scoping decisions
2. Read `apps/web/src/database/schema.ts` and `ls apps/web/src/features/` to see what already exists
3. Decompose into a flat, ordered list of feature modules

**Rules for decomposition:**

- Each feature = one domain entity or major capability (`tasks`, `comments`, `notifications`)
- Auth, orgs, and users are already built — skip them
- Order by dependency: upstream data models before downstream consumers
- Background jobs and events become sub-tasks within their parent feature, not separate features
- Aim for the right granularity: not so small it's trivial, not so large it's monolithic

**Present to user for confirmation:**

```
Here's how I'd break this down into features:

1. {name} — {one-line description} ({scope: org-scoped | user-specific})
2. {name} — {one-line description} ({scope})
...

MVP (build first): {list from their answer}
Nice-to-have (build after): {list}

Does this look right? Anything to add, remove, or reorder?
```

Wait for confirmation before writing any files.

---

## Step 4: Write BUILD_PLAN.md

After the user confirms the feature list, write `.cruz-agent/local/${BRANCH}/BUILD_PLAN.md`:

```markdown
# Build Plan: {Application Name}

## Overview

{2-3 sentence description based on user input}

## Architecture

- **Scope**: {Org-scoped | User-specific | Mixed}
- **Core entities**: {comma-separated list}
- **Async/integrations**: {list or "None"}

## Features

| # | Feature | Description | Scope | Status | Notes |
|---|---------|-------------|-------|--------|-------|
| 1 | {name} | {description} | {org/user} | pending | |
| 2 | {name} | {description} | {org/user} | pending | |

## Build Order

{Any dependency notes, e.g. "tasks depends on projects being done first"}

## Out of Scope

{What was explicitly excluded}
```

Also write `.cruz-agent/local/${BRANCH}/BUILD_CONTEXT.md`:

```markdown
# Build Context: {Application Name}

## What We're Building

{Full description from the user's answers}

## User Requirements

{Verbatim or lightly paraphrased from the conversation}

## Key Decisions

| Decision | Value | Reasoning |
|----------|-------|-----------|
| Data ownership | {org/user/mixed} | {why} |
| MVP scope | {feature list} | {what user said} |
```

Commit the plan:

```bash
git add "$WORK_DIR/BUILD_PLAN.md" "$WORK_DIR/BUILD_CONTEXT.md"
git commit -m "build: initialize build plan for {application name}"
```

Tell the user:

```
Build plan written. Starting with feature 1/{N}: {first feature name}.
```

---

## Step 5: Feature Build Loop

Repeat for each `pending` feature in BUILD_PLAN.md, in order:

### 5a: Announce Feature

Update BUILD_PLAN.md — change this feature's status from `pending` to `in-progress`.

Print:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Feature {N}/{TOTAL}: {feature name}
{description}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### 5b: PM Phase

Read personas: `.claude/agents/personas/architect.md`, `.claude/agents/shared/context.md`, `.claude/agents/shared/config.md`

Read BUILD_CONTEXT.md for full application context.

Read relevant KB files:

| File | When |
|------|------|
| `.claude/kb/01-ARCHITECTURE.md` | Always |
| `.claude/kb/02-TYPESCRIPT.md` | Always |
| `.claude/kb/08-DATA-OWNERSHIP.md` | **Always — CRITICAL** |
| `.claude/kb/03-DI-INVERSIFY.md` | Adding services |
| `.claude/kb/04-DATABASE-DRIZZLE.md` | Adding schema |
| `.claude/kb/05-TRPC-ROUTERS.md` | Adding endpoints |
| `.claude/kb/06-AUTH-ORG-SCOPING.md` | Auth or permissions |
| `.claude/kb/07-UI-PATTERNS.md` | Building UI |
| `.claude/kb/11-FRAMEWORK-EXTENSIBILITY.md` | Always (Service Provider) |
| `.claude/kb/09-EVENTS.md` | If events needed |
| `.claude/kb/12-JOBS.md` | If background jobs needed |

Research the codebase for this feature:

```bash
ls apps/web/src/features/
grep -n "{feature_keyword}" apps/web/src/database/schema.ts
```

Write to `$WORK_DIR/PRODUCT_SPEC.md` and `$WORK_DIR/PLAN.md` following the formats in `/pm`.

### 5c: Dev Phase

Follow the full autonomous development pipeline from `/dev`:

**Phase 1: Spec & Planning** — already done in 5b

**Phase 2: Build**

Read persona: `.claude/agents/personas/developer.md`

Implementation order:
1. Drizzle schema → `cruz db generate && cruz db migrate`
2. Validation → Models → Service (`@injectable`) → Container → Router
3. Service Provider → Register in `apps/web/src/entry.server.tsx`
4. UI Routes → Components (tRPC hooks, loading/error/empty states)

Write `$WORK_DIR/USER_FLOWS.md` with exact test steps.

Commit: `git add -p && git commit -m "{feature}: Implement {feature name}"`

**Phase 3: Iterate & Validate**

If any `.tsx` files were modified, browser testing is required:

```bash
pgrep -f "vite" || cruz dev
```

For each flow in USER_FLOWS.md, write a Node script using `playwright` and run it:

```bash
# Quick screenshot
npx playwright-cli screenshot http://localhost:5173/path $WORK_DIR/screenshots/{flow}.png

# Full interaction — write to /tmp/test-{flow}.js then: node /tmp/test-{flow}.js
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const consoleErrors = [];
  page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
  await page.goto('http://localhost:5173/path');
  // click, fill, assert steps here
  await page.screenshot({ path: '$WORK_DIR/screenshots/{flow}-result.png' });
  console.log('Console errors:', consoleErrors);
  await browser.close();
})();
```

Fix bugs → wait for HMR → re-test. Write `$WORK_DIR/BEHAVIORS.md`.

Commit: `{feature}: Validate flows`

**Phase 4: UX Review**

Read persona: `.claude/agents/personas/ux-designer.md`

Navigate flows, evaluate simplicity/efficiency/clarity/forgiveness. Write `$WORK_DIR/feedback/ux-review-1.md`.

If NEEDS_WORK: read `.claude/agents/personas/developer-fix.md` → fix → commit `{feature}: Address UX feedback` → re-review (max 2 iterations)

**Phase 5: UI Review**

Read persona: `.claude/agents/personas/ui-designer.md`

Screenshot each screen, check visual consistency, component usage, states. Write `$WORK_DIR/feedback/ui-review-1.md`.

If NEEDS_WORK: fix → commit → re-review (max 2 iterations)

**Phase 6: Code Review**

Read persona: `.claude/agents/personas/code-reviewer.md`

```bash
git diff main...HEAD -- apps/web/src/features/{name}/ apps/web/src/components/{name}/
```

Check security, data ownership, pattern compliance. Write `$WORK_DIR/feedback/code-review-1.md`.

If NEEDS_WORK: fix Critical → High → Medium → commit → re-review (max 2 iterations)

**Phase 7: QA**

Read persona: `.claude/agents/personas/qa-engineer.md`

Execute test cases, edge cases, security checks (cross-org access). Write `$WORK_DIR/feedback/qa-results-1.md`.

If NEEDS_WORK: fix root causes → commit → re-run (max 2 iterations)

### 5d: Mark Feature Complete

Update BUILD_PLAN.md — change status from `in-progress` to `done`. Add PR URL in Notes column if a PR was created.

```bash
git add "$WORK_DIR/BUILD_PLAN.md"
git commit -m "build: mark {feature name} complete ({N}/{TOTAL})"
```

Print:

```
✅ {feature name} complete ({N}/{TOTAL} done)
Remaining: {list of pending features}
```

Then move to the next `pending` feature.

---

## Step 6: Final Pass

After all features show `done` in BUILD_PLAN.md:

### Fix Lint & Types

Follow `/fix-lint`:

```bash
cruz typecheck
```

Fix any type errors or lint issues introduced across the full build.

### Full Application QA

Write a combined `$WORK_DIR/USER_FLOWS_FULL.md` covering all features end-to-end.

Run the QA process from `/qa` against the complete application.

### Final Report

```
═══════════════════════════════════════════════
✅ Build Complete: {Application Name}
═══════════════════════════════════════════════

Features built: {N}

{feature 1} ✓
{feature 2} ✓
...

📁 Artifacts: .cruz-agent/local/{BRANCH}/

WORKFLOW_COMPLETE
```

---

## Status Reference

| Status | Meaning |
|--------|---------|
| `pending` | Not started |
| `in-progress` | Currently building |
| `done` | Complete |
| `blocked` | Needs user input — see Notes |

If a feature hits a blocker that can't be resolved autonomously, set status to `blocked`, document the issue in the Notes column, and surface it to the user before continuing to the next feature.
