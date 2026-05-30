---
title: "Step 8: Testing"
description: Write unit tests for TodosService with Vitest and end-to-end tests for the full todos flow with Playwright.
---

import { Steps, Aside } from '@astrojs/starlight/components';

You have a working todos app with org-scoped data and background jobs. Before shipping to production, you need tests. In this step, you will write:

- **Unit tests** — fast, isolated tests for `TodosService` that mock the database.
- **E2E tests** — browser-based tests that exercise the full stack from React UI to D1 database.

## Two Types of Tests

| | Unit Tests | E2E Tests |
|---|---|---|
| **Tool** | Vitest | Playwright |
| **Speed** | Milliseconds | Seconds |
| **Scope** | One class or function | Full user flow |
| **Database** | Mocked | Real (local D1) |
| **Browser** | No | Yes (Chromium) |
| **Command** | `cruz test` | `cruz test:e2e` |
| **When to use** | Business logic, edge cases | Critical user journeys |

Both are valuable. Unit tests catch logic errors fast. E2E tests catch integration issues that unit tests miss (routing, auth, database queries, UI rendering).

## Part 1: Unit Tests

### Set Up the Test Directory

```bash
mkdir -p tests/unit/features/todos
```

### The Mock Database Pattern

`TodosService` depends on the Drizzle database client. In unit tests, you do not want a real database — it would be slow, require setup, and make tests flaky. Instead, you mock the database with functions that return predictable data.

The Drizzle query builder uses method chaining: `db.select().from(table).where(condition)`. To mock this, you create an object where each method returns another object with the next method in the chain.

### Write the Test

Create `tests/unit/features/todos/todos.service.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TodosService } from '@/features/todos/todos.service';

// ── Factory: sample todo ─────────────────────────────────────────────────────

function buildTodo(overrides: Record<string, unknown> = {}) {
  return {
    id: 'todo-1',
    orgId: 'org-1',
    createdById: 'user-1',
    title: 'Buy milk',
    completed: false,
    createdAt: new Date('2025-01-15'),
    updatedAt: new Date('2025-01-15'),
    ...overrides,
  };
}

// ── Mock database ────────────────────────────────────────────────────────────

function createMockDb() {
  const sampleTodo = buildTodo();

  // returning() — used by insert/update
  const mockReturning = vi.fn().mockResolvedValue([sampleTodo]);

  // where() — used by select/update/delete chains
  const mockWhere = vi.fn().mockReturnValue({
    returning: mockReturning,
    limit: vi.fn().mockResolvedValue([sampleTodo]),
  });

  // orderBy() — used by select chains (list)
  const mockOrderBy = vi.fn().mockResolvedValue([sampleTodo]);

  // from() — used by select chains
  const mockFrom = vi.fn().mockReturnValue({
    where: mockWhere,
    orderBy: mockOrderBy,
  });

  return {
    select: vi.fn().mockReturnValue({ from: mockFrom }),
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({ returning: mockReturning }),
    }),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({ where: mockWhere }),
    }),
    delete: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    }),
    // Keep references for assertions
    _mocks: { mockFrom, mockWhere, mockOrderBy, mockReturning },
  };
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('TodosService', () => {
  let service: TodosService;
  let mockDb: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    mockDb = createMockDb();
    // Cast to `any` because we are providing a partial mock
    service = new TodosService(mockDb as any);
  });

  // ── list() ───────────────────────────────────────────────────────────────

  describe('list()', () => {
    it('queries todos filtered by orgId', async () => {
      const result = await service.list('org-1');

      expect(mockDb.select).toHaveBeenCalled();
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it('returns an empty array when no todos exist', async () => {
      mockDb._mocks.mockOrderBy.mockResolvedValueOnce([]);

      const result = await service.list('org-empty');
      expect(result).toEqual([]);
    });
  });

  // ── getById() ────────────────────────────────────────────────────────────

  describe('getById()', () => {
    it('returns the todo when it exists', async () => {
      const result = await service.getById('todo-1', 'org-1');

      expect(result).toBeDefined();
      expect(result?.id).toBe('todo-1');
    });

    it('returns null when the todo does not exist', async () => {
      mockDb._mocks.mockWhere.mockReturnValueOnce({
        returning: vi.fn().mockResolvedValue([]),
        limit: vi.fn().mockResolvedValue([]),
      });

      const result = await service.getById('nonexistent', 'org-1');
      expect(result).toBeNull();
    });
  });

  // ── create() ─────────────────────────────────────────────────────────────

  describe('create()', () => {
    it('inserts a todo with the correct orgId and createdById', async () => {
      const result = await service.create('org-1', 'user-1', { title: 'Buy milk' });

      expect(mockDb.insert).toHaveBeenCalled();
      expect(result).toBeDefined();
      expect(result.title).toBe('Buy milk');
    });
  });

  // ── update() ─────────────────────────────────────────────────────────────

  describe('update()', () => {
    it('updates a todo and returns the updated record', async () => {
      const result = await service.update('todo-1', 'org-1', { completed: true });

      expect(mockDb.update).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('returns null when updating a nonexistent todo', async () => {
      mockDb._mocks.mockWhere.mockReturnValueOnce({
        returning: vi.fn().mockResolvedValue([]),
        limit: vi.fn().mockResolvedValue([]),
      });

      const result = await service.update('nonexistent', 'org-1', { title: 'Nope' });
      expect(result).toBeNull();
    });
  });

  // ── delete() ─────────────────────────────────────────────────────────────

  describe('delete()', () => {
    it('deletes the todo without throwing', async () => {
      await expect(service.delete('todo-1', 'org-1')).resolves.toBeUndefined();
      expect(mockDb.delete).toHaveBeenCalled();
    });
  });
});
```

### Run the Unit Tests

```bash
cruz test
```

You should see output like:

```
 ✓ tests/unit/features/todos/todos.service.test.ts (6 tests)
   ✓ TodosService > list() > queries todos filtered by orgId
   ✓ TodosService > list() > returns an empty array when no todos exist
   ✓ TodosService > getById() > returns the todo when it exists
   ✓ TodosService > getById() > returns null when the todo does not exist
   ✓ TodosService > create() > inserts a todo with the correct orgId and createdById
   ✓ TodosService > update() > updates a todo and returns the updated record
   ✓ TodosService > update() > returns null when updating a nonexistent todo
   ✓ TodosService > delete() > deletes the todo without throwing

 Test Files  1 passed (1)
      Tests  8 passed (8)
```

### Understanding the Mock Pattern

The mock database may look complex, but the pattern is simple. Each Drizzle operation is a chain of method calls:

```typescript
// Real code:
db.select().from(todos).where(eq(todos.orgId, orgId)).orderBy(desc(todos.createdAt))
// ↓         ↓           ↓                              ↓
// Mock:     returns      returns                        returns the final data
//           { from }     { where }
```

Each mock method returns the next object in the chain. The last method in the chain (`orderBy`, `returning`, `limit`) returns the actual data.

<Aside type="tip">
If the mock setup feels verbose, consider extracting it into a shared test utility at `tests/helpers/mock-db.ts`. You can reuse the same `createMockDb()` function across all your service tests.
</Aside>

### Factory Functions

The `buildTodo()` function is a factory that creates test data with sensible defaults. You can override any field:

```typescript
const completedTodo = buildTodo({ completed: true, title: 'Done' });
const oldTodo = buildTodo({ createdAt: new Date('2020-01-01') });
```

Factories keep tests readable and DRY. Define one per model and reuse it everywhere.

## Part 2: E2E Tests

E2E tests run in a real browser against your running dev server. They test the entire stack: React components, tRPC requests, middleware, services, and the database.

### Prerequisites

Install Playwright if you have not already:

```bash
npx playwright install chromium
```

### Playwright Configuration

CruzJS includes a `playwright.config.ts` that starts the dev server automatically:

```typescript
// playwright.config.ts (already generated by @cruzjs/create)
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  use: {
    baseURL: 'http://localhost:5000',
  },
  webServer: {
    command: 'cruz dev',
    url: 'http://localhost:5000',
    reuseExistingServer: !process.env.CI,
  },
});
```

The `webServer` block tells Playwright to start `cruz dev` before running tests and wait until the server is ready. If the dev server is already running, it reuses it (faster for local development).

### Set Up the Test Directory

```bash
mkdir -p tests/e2e
```

### Write the E2E Test

Create `tests/e2e/todos.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';

// ── Helpers ──────────────────────────────────────────────────────────────────

async function login(page: import('@playwright/test').Page, email: string, password: string) {
  await page.goto('/auth/login');
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/dashboard/);
}

async function navigateToTodos(page: import('@playwright/test').Page, orgSlug: string) {
  await page.goto(`/orgs/${orgSlug}/todos`);
  await page.waitForSelector('input[placeholder="What needs to be done?"]');
}

// ── Test suite ───────────────────────────────────────────────────────────────

test.describe('Todos', () => {
  const testEmail = 'test@example.com';
  const testPassword = 'Test1234!';
  const orgSlug = 'test-org';

  test.beforeEach(async ({ page }) => {
    await login(page, testEmail, testPassword);
    await navigateToTodos(page, orgSlug);
  });

  test('shows the team todos heading', async ({ page }) => {
    await expect(page.locator('h1')).toHaveText('Team Todos');
  });

  test('shows empty state when no todos exist', async ({ page }) => {
    // This test assumes a clean database state.
    // In CI, you would reset the database before each run.
    const emptyMessage = page.locator('text=No team todos yet');
    if (await emptyMessage.isVisible()) {
      await expect(emptyMessage).toBeVisible();
    }
  });

  test('creates a todo', async ({ page }) => {
    const todoTitle = `E2E Todo ${Date.now()}`;

    await page.fill('input[placeholder="What needs to be done?"]', todoTitle);
    await page.click('button:has-text("Add")');

    // The new todo should appear in the list
    await expect(page.locator(`text=${todoTitle}`)).toBeVisible();
  });

  test('completes a todo', async ({ page }) => {
    const todoTitle = `Complete Me ${Date.now()}`;

    // Create the todo first
    await page.fill('input[placeholder="What needs to be done?"]', todoTitle);
    await page.click('button:has-text("Add")');
    await page.waitForSelector(`text=${todoTitle}`);

    // Check the checkbox
    const todoItem = page.locator('li').filter({ hasText: todoTitle });
    await todoItem.locator('input[type="checkbox"]').check();

    // The text should have a line-through style
    await expect(todoItem.locator('span').first()).toHaveClass(/line-through/);
  });

  test('deletes a todo', async ({ page }) => {
    const todoTitle = `Delete Me ${Date.now()}`;

    // Create the todo
    await page.fill('input[placeholder="What needs to be done?"]', todoTitle);
    await page.click('button:has-text("Add")');

    // Wait for it to appear
    const todoItem = page.locator('li').filter({ hasText: todoTitle });
    await expect(todoItem).toBeVisible();

    // Hover to reveal the delete button, then click it
    await todoItem.hover();
    await todoItem.locator('button[aria-label="Delete todo"]').click();

    // The todo should be gone
    await expect(page.locator(`text=${todoTitle}`)).not.toBeVisible();
  });

  test('updates the completion counter', async ({ page }) => {
    const todoTitle = `Counter Test ${Date.now()}`;

    // Create a todo
    await page.fill('input[placeholder="What needs to be done?"]', todoTitle);
    await page.click('button:has-text("Add")');
    await page.waitForSelector(`text=${todoTitle}`);

    // Find the stats line (e.g., "0 / 3 completed")
    const stats = page.locator('text=/\\d+ \\/ \\d+ completed/');

    // Check the todo
    const todoItem = page.locator('li').filter({ hasText: todoTitle });
    await todoItem.locator('input[type="checkbox"]').check();

    // The stats should update to reflect the completion
    await expect(stats).toBeVisible();
  });

  test('preserves todos after page reload', async ({ page }) => {
    const todoTitle = `Persist Test ${Date.now()}`;

    // Create the todo
    await page.fill('input[placeholder="What needs to be done?"]', todoTitle);
    await page.click('button:has-text("Add")');
    await expect(page.locator(`text=${todoTitle}`)).toBeVisible();

    // Reload the page
    await page.reload();
    await page.waitForSelector('input[placeholder="What needs to be done?"]');

    // The todo should still be there
    await expect(page.locator(`text=${todoTitle}`)).toBeVisible();
  });
});
```

### Run the E2E Tests

```bash
cruz test:e2e
```

Playwright will:

1. Start the dev server (or reuse it if already running).
2. Launch a headless Chromium browser.
3. Run each test in an isolated browser context.
4. Report results.

```
Running 6 tests using 1 worker

  ✓ Todos > shows the team todos heading (1.2s)
  ✓ Todos > creates a todo (2.1s)
  ✓ Todos > completes a todo (2.8s)
  ✓ Todos > deletes a todo (2.4s)
  ✓ Todos > updates the completion counter (2.6s)
  ✓ Todos > preserves todos after page reload (2.3s)

  6 passed (15.4s)
```

<Aside type="tip">
To run E2E tests with a visible browser (useful for debugging), use: `cruz test:e2e --headed`
</Aside>

### E2E Test Best Practices

**Use unique data per test.** Each test creates todos with `Date.now()` in the title to avoid conflicts between tests. This means tests can run in any order without interfering with each other.

**Do not clean up data in tests.** If a test creates a todo, leave it. Cleaning up in `afterEach` is fragile and slow. Instead, reset the database before the entire E2E suite in CI:

```bash
cruz db hard-reset && cruz test:e2e
```

**Test user journeys, not implementation.** E2E tests should mirror what a real user does: type into an input, click a button, see a result. Do not assert on internal state or API responses — those belong in unit tests.

**Keep the suite small.** E2E tests are slow. Test the 5-10 most critical flows. Use unit tests for exhaustive edge case coverage.

## Part 3: Testing Edge Cases (Unit)

Add more targeted unit tests for edge cases and error paths.

Create `tests/unit/features/todos/todos.edge-cases.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TodosService } from '@/features/todos/todos.service';

function createMockDb() {
  const mockReturning = vi.fn().mockResolvedValue([]);
  const mockWhere = vi.fn().mockReturnValue({
    returning: mockReturning,
    limit: vi.fn().mockResolvedValue([]),
  });
  const mockOrderBy = vi.fn().mockResolvedValue([]);
  const mockFrom = vi.fn().mockReturnValue({
    where: mockWhere,
    orderBy: mockOrderBy,
  });

  return {
    select: vi.fn().mockReturnValue({ from: mockFrom }),
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({ returning: mockReturning }),
    }),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({ where: mockWhere }),
    }),
    delete: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    }),
    _mocks: { mockFrom, mockWhere, mockOrderBy, mockReturning },
  };
}

describe('TodosService — edge cases', () => {
  let service: TodosService;
  let mockDb: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    mockDb = createMockDb();
    service = new TodosService(mockDb as any);
  });

  it('list() returns empty array for org with no todos', async () => {
    const result = await service.list('org-with-no-todos');
    expect(result).toEqual([]);
  });

  it('getById() returns null for wrong orgId', async () => {
    // The mock returns empty by default, simulating no match
    const result = await service.getById('todo-1', 'wrong-org');
    expect(result).toBeNull();
  });

  it('update() returns null when todo does not exist', async () => {
    const result = await service.update('nonexistent', 'org-1', { title: 'Nope' });
    expect(result).toBeNull();
  });

  it('create() passes orgId and createdById to the database', async () => {
    const mockValues = vi.fn().mockReturnValue({
      returning: vi.fn().mockResolvedValue([{
        id: 'new-1', orgId: 'org-1', createdById: 'user-1',
        title: 'Test', completed: false,
        createdAt: new Date(), updatedAt: new Date(),
      }]),
    });
    mockDb.insert.mockReturnValue({ values: mockValues });

    await service.create('org-1', 'user-1', { title: 'Test' });

    expect(mockValues).toHaveBeenCalledWith(
      expect.objectContaining({
        orgId: 'org-1',
        createdById: 'user-1',
        title: 'Test',
      }),
    );
  });
});
```

Run all unit tests:

```bash
cruz test
```

```
 ✓ tests/unit/features/todos/todos.service.test.ts (8 tests)
 ✓ tests/unit/features/todos/todos.edge-cases.test.ts (4 tests)

 Test Files  2 passed (2)
      Tests  12 passed (12)
```

## Vitest Configuration

CruzJS sets up Vitest with the `@` path alias so you can import from `@/features/...` in tests, matching your application code. The configuration lives in `vitest.config.ts`:

```typescript
// vitest.config.ts (already generated)
import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    include: ['tests/unit/**/*.test.ts'],
    globals: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

<Aside type="caution">
If you see `Cannot find module '@/features/todos/todos.service'` errors, make sure the `@` alias is configured in `vitest.config.ts`. The alias must match the one in your `tsconfig.json`.
</Aside>

## Watch Mode

During development, run tests in watch mode so they re-run automatically when you save a file:

```bash
# Unit tests in watch mode
cruz test --watch

# Or with the Vitest UI (opens a browser dashboard)
cruz test --ui
```

The Vitest UI gives you a visual test runner where you can see results, filter tests, and re-run individual tests with one click.

## File Structure

After adding tests, your project has:

```
tests/
  unit/
    features/
      todos/
        todos.service.test.ts        # core service tests
        todos.edge-cases.test.ts     # edge case coverage
  e2e/
    todos.spec.ts                    # browser-based flow tests
vitest.config.ts                     # unit test configuration
playwright.config.ts                 # E2E test configuration
```

## What to Test Next

Now that you have the basics, here are natural extensions:

- **Test the tRPC router** — create a mock context with `ctx.org.orgId` and `ctx.org.role`, then call the procedure directly. Verify that permission checks reject unauthorized roles.
- **Test the welcome email handler** — unit test `WelcomeEmailHandler.run()` to verify it calls the email service with the correct arguments.
- **Test the event listener** — verify that `WelcomeEmailListener.handle()` calls `jobService.createJob()` with the right payload.
- **Add CI integration** — run `cruz test` and `cruz test:e2e` in your GitHub Actions workflow to catch regressions before merge.

A minimal CI step:

```yaml
# .github/workflows/test.yml
- run: npm ci
- run: npx playwright install chromium
- run: cruz test
- run: cruz db hard-reset && cruz test:e2e
```

---

## Tutorial Complete

You have built a full-stack todos application with CruzJS, covering:

1. **Project setup** — scaffolding and configuration
2. **Database schema** — Drizzle ORM with D1
3. **Service and API** — tRPC with type-safe procedures
4. **React UI** — components with tRPC hooks
5. **Deployment** — Cloudflare Pages with one command
6. **Organizations** — org-scoped data with role-based permissions
7. **Background jobs** — domain events and async job processing
8. **Testing** — unit tests with Vitest, E2E tests with Playwright

From here, explore the rest of the CruzJS documentation:

- **[CRUD Factory](/advanced/crud)** — generate standard CRUD routes with one function call
- **[Billing](/pro/billing)** — add Stripe subscriptions to your app
- **[Admin Dashboard](/pro/admin)** — manage users, orgs, and data from a built-in admin panel
- **[File Uploads](/advanced/file-uploads)** — upload and serve files with R2
- **[AI Integration](/advanced/ai)** — use Workers AI for text generation and embeddings
