---
title: Testing Overview
description: Testing strategy in CruzJS with Vitest for unit tests, Playwright for E2E tests, test file naming conventions, and CLI commands.
---

CruzJS uses **Vitest** for unit and integration tests and **Playwright** for end-to-end (E2E) tests. The CLI provides commands for running all test types.

## Test Strategy

| Layer | Tool | Scope | Speed |
|---|---|---|---|
| Unit tests | Vitest | Individual services, utilities, validation | Fast (ms) |
| Integration tests | Vitest | Services with mocked DB, routers with context | Medium (ms-s) |
| E2E tests | Playwright | Full browser interaction, real server | Slow (s) |

The testing pyramid applies: write many unit tests, fewer integration tests, and a focused set of E2E tests for critical user flows.

## CLI Commands

```bash
# Run all unit/integration tests
cruz test

# Run tests in watch mode (re-run on file changes)
cruz test --watch

# Run tests with the Vitest UI (browser-based test explorer)
cruz test --ui

# Run a specific test file
cruz test src/features/projects/project.service.test.ts

# Run tests matching a name pattern
cruz test --grep "ProjectService"

# Run E2E tests
cruz test:e2e

# Run E2E tests with headed browser (visible)
cruz test:e2e --headed

# Run a specific E2E test file
cruz test:e2e tests/e2e/auth.spec.ts
```

## File Naming Conventions

| Type | Pattern | Location |
|---|---|---|
| Unit test | `*.test.ts` | Next to the source file in `src/features/` |
| Integration test | `*.test.ts` | Next to the source file in `src/features/` |
| E2E test | `*.spec.ts` | `tests/e2e/` directory |
| Test factory | `*.factory.ts` | `tests/factories/` directory |
| Test fixture | `*.fixture.ts` | `tests/fixtures/` directory |

### Example Directory Structure

```
src/
  features/
    projects/
      project.service.ts
      project.service.test.ts     # Unit test next to source
      project.router.ts
      project.router.test.ts      # Router test next to source
      routes/
        index.tsx
        $id.tsx
    notes/
      notes.service.ts
      notes.service.test.ts

tests/
  e2e/
    auth.spec.ts                  # E2E: login, register flows
    projects.spec.ts              # E2E: project CRUD
    billing.spec.ts               # E2E: checkout flow
  factories/
    user.factory.ts               # Creates test users
    org.factory.ts                # Creates test organizations
    project.factory.ts            # Creates test projects
  fixtures/
    seed.ts                       # Database seeding for tests
```

## Vitest Configuration

CruzJS projects include a `vitest.config.ts`:

```typescript
import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    exclude: ['node_modules', 'tests/e2e'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['**/*.test.ts', '**/*.spec.ts', '**/index.ts'],
    },
    setupFiles: ['tests/setup.ts'],
  },
});
```

### Test Setup File

```typescript
// tests/setup.ts
import 'reflect-metadata';

// Global test setup
// - Initialize DI container stubs
// - Set test environment variables
process.env.NODE_ENV = 'test';
process.env.AUTH_SECRET = 'test-secret-key-for-testing-only';
```

## Playwright Configuration

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:5000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: 'cruz dev',
    port: 5000,
    reuseExistingServer: !process.env.CI,
  },
});
```

## Running Tests in CI

```yaml
# .github/workflows/test.yml
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      - run: npm install
      - run: cruz test
      - run: cruz typecheck

  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      - run: npm install
      - run: npx playwright install --with-deps chromium
      - run: cruz test:e2e
```

## Next Steps

- [Unit Tests](/testing/unit-tests) -- Testing services and routers
- [E2E Tests](/testing/e2e-tests) -- Browser-based testing with Playwright
- [Database Tests](/testing/database-tests) -- Testing with real database queries
