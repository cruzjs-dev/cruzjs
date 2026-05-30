# Shared Agent Context

Common patterns and setup used by all pipeline agents.

## Pipeline Architecture

Each agent is part of a multi-stage pipeline. The autonomous commands orchestrate stage transitions.

### Development Pipeline Stages

```
spec         → Architect builds spec and plan
build        → Developer implements feature
iterate      → Developer validates with browser testing
ux-review    → UX Designer reviews (max 2 iterations)
ui-review    → UI Designer reviews (max 2 iterations)
code-review  → Code Reviewer reviews (max 2 iterations)
qa           → QA Engineer tests (max 2 iterations)
finalize     → Developer creates PR
```

## Branch & Work Directory

```bash
# Get current branch
BRANCH=$(git branch --show-current)

# Work directory for all artifacts
WORK_DIR=".cruz-agent/local/${BRANCH}"

# Standard directories
mkdir -p "${WORK_DIR}"
mkdir -p "${WORK_DIR}/progress"
mkdir -p "${WORK_DIR}/checkpoints"
mkdir -p "${WORK_DIR}/screenshots"
mkdir -p "${WORK_DIR}/feedback"
mkdir -p "${WORK_DIR}/validation-flows"
```

## Key Files

| File | Purpose | Created By | Used By |
|------|---------|------------|---------|
| `PRODUCT_SPEC.md` | Full requirements | Architect | Developer, Reviewers |
| `PLAN.md` | Implementation plan | Architect | Developer, Reviewers |
| `PROGRESS.md` | Current status | All agents | All |
| `USER_FLOWS.md` | How to test (exact steps) | Developer | **All Reviewers** |
| `BEHAVIORS.md` | Confirmed behaviors | Developer | **All Reviewers** |
| `checkpoints/*.json` | Phase completions | All agents | Orchestrator |
| `feedback/*.md` | Review feedback | Reviewers | Developer-Fix |
| `screenshots/*.png` | Evidence | Various | Reviewers |

### USER_FLOWS.md (Critical for Reviews)

This file contains **exact instructions** for testing the feature. Created by Developer, used by all reviewers.

```markdown
# User Flows for {BRANCH}

## How to Test
- URL: http://localhost:5173
- Login: {credentials from config.md}

## Flow 1: {Name}
**Entry**: `{exact URL}`
**Steps**:
1. Navigate to `{URL}`
2. Click "{button}" in {location}
3. Fill "{field}" with "{value}"
4. **Expected**: {outcome}
```

### BEHAVIORS.md (Critical for Reviews)

Documents **confirmed behaviors** after browser testing. Used by reviewers to verify correct functionality.

## Branch Management

**See `config.md` for base branch setting** (default: `main`).

### Creating Feature Branch

```bash
git stash
git checkout main
git pull origin main
git checkout -b {BRANCH_NAME}
git stash pop 2>/dev/null || true
```

### Safe Commits (Never to Main)

```bash
CURRENT=$(git branch --show-current)
[ "$CURRENT" = "main" ] && echo "ERROR: Cannot commit to main!" && exit 1
git add -p && git commit -m "{BRANCH}: {description}"
```

## CruzJS Dev Server

```bash
# Start dev server (runs on http://localhost:5173 by default)
cruz dev

# Stop dev server
cruz dev stop

# Check if running
pgrep -f "vite" && echo "Running" || echo "Not running"
```

**After code changes**: Vite HMR handles most updates automatically. For server-side changes (routers, services, providers), the server restarts automatically. Wait ~5-10 seconds after saving.

**After DB schema changes**: Must run `cruz db generate && cruz db migrate`.

## CruzJS CLI Reference

```bash
cruz dev              # Start dev server
cruz dev stop         # Stop dev server
cruz build            # Production build
cruz test             # Run unit tests (vitest)
cruz typecheck        # Type check (tsc --noEmit)
cruz db generate      # Generate Drizzle migrations
cruz db migrate       # Apply migrations to local D1
cruz db studio        # Open Drizzle Studio
cruz db query "SQL"   # Execute SQL against local D1
```

## Browser Testing (playwright-cli)

**Use for all frontend feature testing. Write a script and run it with `node`, or use the screenshot shortcut.**

```bash
# Quick screenshot
npx playwright-cli screenshot http://localhost:5173/path screenshot.png

# Full interaction script — write to /tmp/test-flow.js, then: node /tmp/test-flow.js
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const consoleErrors = [];
  page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });

  await page.goto('http://localhost:5173/path');
  await page.waitForSelector('text=Expected Element');
  await page.click('text=Button Label');
  await page.fill('[name=fieldName]', 'value');
  await page.screenshot({ path: 'screenshots/step.png' });

  console.log('Console errors:', consoleErrors);
  await browser.close();
})();
```

| Task | How |
|------|-----|
| Navigate + screenshot | `npx playwright-cli screenshot <url> <file>` |
| Click / type / assert | Write inline Node script, run with `node` |
| Check console errors | `page.on('console', ...)` in script |
| Wait for element | `page.waitForSelector(...)` in script |

## GitHub PR Creation

```bash
# Push branch
git push -u origin {BRANCH_NAME}

# Create PR
gh pr create \
  --title "{brief summary}" \
  --body "$(cat <<'EOF'
## Summary
- {bullet 1}
- {bullet 2}

## Test Plan
- [ ] Verify {flow 1}
- [ ] Verify {flow 2}

## Screenshots
{Attach screenshots from .cruz-agent/local/{BRANCH}/screenshots/}
EOF
)"
```

## Knowledge Base

Always reference KB files for framework patterns:

| File | Topic |
|------|-------|
| `.claude/kb/01-ARCHITECTURE.md` | Folder structure, domain boundaries |
| `.claude/kb/02-TYPESCRIPT.md` | TS + React conventions |
| `.claude/kb/03-DI-INVERSIFY.md` | Dependency injection |
| `.claude/kb/04-DATABASE-DRIZZLE.md` | Database patterns |
| `.claude/kb/05-TRPC-ROUTERS.md` | API endpoints |
| `.claude/kb/06-AUTH-ORG-SCOPING.md` | Auth, permissions, org context |
| `.claude/kb/07-UI-PATTERNS.md` | UI components |
| `.claude/kb/08-DATA-OWNERSHIP.md` | **CRITICAL**: User vs org scoping |
| `.claude/kb/09-EVENTS.md` | Domain events |
| `.claude/kb/10-TESTING.md` | Test coverage |
| `.claude/kb/11-FRAMEWORK-EXTENSIBILITY.md` | Service Providers |
| `.claude/kb/12-JOBS.md` | Background jobs |

## Autonomous Behavior Rules

1. **Never pause to ask permission** — Make best guesses
2. **Write files immediately** — No confirmation needed
3. **Never push to main** — Always verify branch
4. **Log progress** — Update PROGRESS.md after significant work
5. **Recover from errors** — Fix autonomously, document if unfixable
