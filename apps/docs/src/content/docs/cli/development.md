---
title: Development Commands
description: Local development workflow with cruz dev, build, start, test, and typecheck.
---

CruzJS development commands wrap Vite, Vitest, Playwright, and TypeScript into simple `cruz` subcommands. All commands run from the project root.

## cruz dev

Starts the local development server in the background. The server provides hot module replacement via Vite, a local database, in-memory KV, and the full tRPC endpoint.

```bash
# Start the dev server
cruz dev

# The server runs in the background. Visit:
# http://localhost:5173
```

The dev server runs as a background process, so your terminal is free for other commands. Manage it with subcommands:

```bash
# Check if the dev server is running
cruz dev status

# Stop the dev server
cruz dev stop

# Restart the dev server (useful after config changes)
cruz dev restart
```

### What Runs Under the Hood

`cruz dev` starts a Wrangler Pages dev server with Vite integration. It:

1. Reads your `cruz.config.ts` and generates a `wrangler.toml` for local development.
2. Starts Vite with HMR for the React frontend.
3. Provisions a local database appropriate for your adapter (e.g., SQLite for Cloudflare, PostgreSQL for others).
4. Sets up local KV and R2 storage in `.wrangler/state/`.
5. Exposes the tRPC endpoint at `/api/trpc/*`.

## cruz build

Runs a production build of the application. This compiles the React Router app with Vite and bundles the Cloudflare Pages worker.

```bash
cruz build
```

The build output goes to `dist/`:
- `dist/client/` -- Static assets (JS bundles, CSS, images)
- `dist/server/` -- Server-side rendering entry point

This command is automatically run as part of `cruz deploy`, so you typically only need it for local production testing.

## cruz start

Starts the production server locally. Useful for testing the production build before deploying.

```bash
# Build first, then start
cruz build
cruz start
```

This runs the Wrangler Pages dev server against the production build output rather than the Vite dev server.

## cruz test

Runs unit tests with [Vitest](https://vitest.dev/). Tests are discovered from files matching `*.test.ts`, `*.test.tsx`, `*.spec.ts`, and `*.spec.tsx`.

```bash
# Run all unit tests
cruz test

# Watch mode -- re-runs tests on file changes
cruz test --watch

# Open the Vitest UI in your browser
cruz test --ui

# Run with coverage reporting
cruz test --coverage
```

### Test Options

| Flag | Description |
|------|-------------|
| `--watch` | Re-run tests when files change |
| `--ui` | Open the interactive Vitest UI |
| `--coverage` | Generate code coverage report |

### Example Test

```typescript
// src/features/project/project.service.test.ts
import { describe, it, expect, vi } from 'vitest';
import { ProjectService } from './project.service';

describe('ProjectService', () => {
  it('should create a project with the correct org ID', async () => {
    const mockDb = createMockDb();
    const service = new ProjectService(mockDb);

    const project = await service.create({
      name: 'Test Project',
      orgId: 'org_123',
    });

    expect(project.name).toBe('Test Project');
    expect(project.orgId).toBe('org_123');
  });
});
```

## cruz test:e2e

Runs end-to-end tests with [Playwright](https://playwright.dev/). E2E tests live in `tests/e2e/` and test the full application flow in a real browser.

```bash
# Run all E2E tests
cruz test:e2e

# Run in headed mode (visible browser)
cruz test:e2e --headed

# Watch mode
cruz test:e2e --watch

# Open the Playwright UI
cruz test:e2e --ui
```

### E2E Test Options

| Flag | Description |
|------|-------------|
| `--headed` | Run tests with a visible browser window |
| `--watch` | Re-run tests on file changes |
| `--ui` | Open Playwright's interactive test UI |

### Example E2E Test

```typescript
// tests/e2e/tests/dashboard.spec.ts
import { test, expect } from '@playwright/test';

test('dashboard shows stats after login', async ({ page }) => {
  await page.goto('/auth/login');
  await page.fill('[name=email]', 'test@example.com');
  await page.fill('[name=password]', 'password');
  await page.click('button[type=submit]');

  await expect(page).toHaveURL('/dashboard');
  await expect(page.locator('text=Total Users')).toBeVisible();
});
```

## cruz typecheck

Runs the TypeScript compiler in check-only mode (`tsc --noEmit`). This verifies type correctness across the entire project without producing output files.

```bash
# Type-check the application
cruz typecheck

# Include test files in type checking
cruz typecheck --tests
```

### Options

| Flag | Description |
|------|-------------|
| `--tests` | Also type-check test files |

Run `cruz typecheck` as part of your CI pipeline and before deployments to catch type errors early:

```bash
# Full pre-deploy check
cruz typecheck && cruz test && cruz build
```

## Recommended Development Workflow

A typical local development session looks like this:

```bash
# 1. Start the dev server
cruz dev

# 2. Make schema changes, then generate and apply migrations
cruz db generate
cruz db migrate

# 3. Run tests as you develop
cruz test --watch

# 4. Type-check before committing
cruz typecheck

# 5. Stop the dev server when done
cruz dev stop
```
