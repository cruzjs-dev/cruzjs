# Testing Patterns

## Test Structure

```
tests/
├── unit/              # Unit tests (mirrors src structure)
│   ├── features/
│   └── ...
├── e2e/               # E2E tests (Playwright)
│   └── tests/
├── utils/             # Test utilities and factories
│   └── factories.ts
└── setup.ts           # Vitest setup
```

## Unit Tests

Unit tests use Vitest and live in `tests/unit/`.

### Service Test Pattern

```typescript
// tests/unit/features/my-feature/my-feature.service.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MyFeatureService } from '@cruzjs/web/features/my-feature/my-feature.service';

describe('MyFeatureService', () => {
  let service: MyFeatureService;
  let mockDb: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockDb = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      values: vi.fn().mockReturnThis(),
      returning: vi.fn(),
      update: vi.fn().mockReturnThis(),
      set: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
    };

    service = new MyFeatureService(mockDb);
  });

  describe('list', () => {
    it('should return items for org', async () => {
      const mockItems = [
        { id: '1', name: 'Item 1', orgId: 'org-123' },
      ];
      mockDb.orderBy.mockResolvedValue(mockItems);

      const result = await service.list('org-123');

      expect(result).toEqual(mockItems);
      expect(mockDb.select).toHaveBeenCalled();
      expect(mockDb.where).toHaveBeenCalled();
    });

    it('should filter by orgId', async () => {
      mockDb.orderBy.mockResolvedValue([]);

      await service.list('org-123');

      // Verify orgId filter was applied
      expect(mockDb.where).toHaveBeenCalled();
    });
  });

  describe('create', () => {
    it('should create and return item', async () => {
      const mockItem = { id: '1', name: 'New Item', orgId: 'org-123' };
      mockDb.returning.mockResolvedValue([mockItem]);

      const result = await service.create('org-123', 'user-456', {
        name: 'New Item',
      });

      expect(result).toEqual(mockItem);
      expect(mockDb.insert).toHaveBeenCalled();
      expect(mockDb.values).toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('should delete by id and orgId', async () => {
      mockDb.where.mockResolvedValue(undefined);

      await service.delete('item-123', 'org-123');

      expect(mockDb.delete).toHaveBeenCalled();
      expect(mockDb.where).toHaveBeenCalled();
    });
  });
});
```

### Router Test Pattern

```typescript
// tests/unit/features/my-feature/my-feature.trpc.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { myFeatureTrpc } from '@cruzjs/web/features/my-feature/my-feature.trpc';

describe('myFeatureTrpc', () => {
  let mockService: any;
  let mockContainer: any;

  beforeEach(() => {
    mockService = {
      list: vi.fn(),
      create: vi.fn(),
    };

    // Procedures resolve services via ctx.container.get(Service)
    mockContainer = {
      get: vi.fn().mockReturnValue(mockService),
    };
  });

  it('should have list procedure', () => {
    expect(myFeatureTrpc.list).toBeDefined();
  });

  it('should have create procedure', () => {
    expect(myFeatureTrpc.create).toBeDefined();
  });
});
```

## Test Utilities

### Factory Functions

```typescript
// tests/utils/factories.ts
import { createId } from '@paralleldrive/cuid2';

export const createMockUser = (overrides = {}) => ({
  id: createId(),
  email: 'test@example.com',
  name: 'Test User',
  emailVerified: new Date(),
  ...overrides,
});

export const createMockOrg = (overrides = {}) => ({
  id: createId(),
  name: 'Test Org',
  slug: 'test-org',
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

export const createMockMember = (overrides = {}) => ({
  id: createId(),
  userId: createId(),
  orgId: createId(),
  role: 'MEMBER' as const,
  createdAt: new Date(),
  ...overrides,
});

export const createMockJob = (overrides = {}) => ({
  id: createId(),
  type: 'test-job',
  payload: {},
  status: 'PENDING' as const,
  priority: 50,
  attempts: 0,
  maxAttempts: 3,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});
```

### Context Mocks

```typescript
// tests/utils/context.ts
export const createMockContext = (overrides = {}) => ({
  request: new Request('http://localhost'),
  session: {
    user: { id: 'user-123', email: 'test@example.com' },
  },
  // Procedures resolve services via ctx.container.get(Service)
  container: { get: () => undefined, resolve: () => undefined },
  ...overrides,
});

export const createMockOrgContext = (overrides = {}) => ({
  ...createMockContext(),
  org: {
    orgId: 'org-123',
    userId: 'user-123',
    role: 'ADMIN' as const,
  },
  ...overrides,
});
```

## E2E Tests

E2E tests use Playwright and live in `tests/e2e/`.

### E2E Test Pattern

```typescript
// tests/e2e/tests/auth.flows.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Authentication Flows', () => {
  test('can register a new account', async ({ page }) => {
    await page.goto('/auth/register');

    await page.fill('input[name="name"]', 'Test User');
    await page.fill('input[name="email"]', `test-${Date.now()}@example.com`);
    await page.fill('input[name="password"]', 'Password123!');

    await page.click('button[type="submit"]');

    await expect(page).toHaveURL('/dashboard');
  });

  test('can login with existing account', async ({ page }) => {
    await page.goto('/auth/login');

    await page.fill('input[name="email"]', 'admin@example.com');
    await page.fill('input[name="password"]', 'password123');

    await page.click('button[type="submit"]');

    await expect(page).toHaveURL('/dashboard');
  });

  test('shows error for invalid credentials', async ({ page }) => {
    await page.goto('/auth/login');

    await page.fill('input[name="email"]', 'wrong@example.com');
    await page.fill('input[name="password"]', 'wrongpassword');

    await page.click('button[type="submit"]');

    await expect(page.locator('[role="alert"]')).toBeVisible();
  });
});
```

### E2E Helpers

```typescript
// tests/e2e/tests/helpers.ts
import { Page } from '@playwright/test';

export const login = async (page: Page, email: string, password: string) => {
  await page.goto('/auth/login');
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL('/dashboard');
};

export const createOrg = async (page: Page, name: string) => {
  await page.click('text=Create Organization');
  await page.fill('input[name="name"]', name);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/orgs\//);
};

export const logout = async (page: Page) => {
  await page.click('[data-testid="user-menu"]');
  await page.click('text=Logout');
  await page.waitForURL('/auth/login');
};
```

### E2E Feature Test

```typescript
// tests/e2e/tests/org-management.flows.spec.ts
import { test, expect } from '@playwright/test';
import { login, createOrg } from './helpers';

test.describe('Organization Management', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'admin@example.com', 'password123');
  });

  test('can create an organization', async ({ page }) => {
    await createOrg(page, 'My Test Org');

    await expect(page.locator('h1')).toContainText('My Test Org');
  });

  test('can invite a member', async ({ page }) => {
    await page.goto('/orgs/my-test-org/invitations');

    await page.click('text=Invite Member');
    await page.fill('input[name="email"]', 'newmember@example.com');
    await page.selectOption('select[name="role"]', 'MEMBER');
    await page.click('button:has-text("Send Invitation")');

    await expect(page.locator('text=newmember@example.com')).toBeVisible();
  });
});
```

## Running Tests

### Unit Tests

```bash
# Run all unit tests
cruz test

# Vitest UI mode
cruz test --ui

# Run specific file
npx vitest tests/unit/features/my-feature/my-feature.service.test.ts
```

### E2E Tests

```bash
# Run all E2E tests
cruz test:e2e

# Run specific test
npx playwright test tests/e2e/tests/auth.flows.spec.ts
```

## Test Configuration

### Vitest Config

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/unit/**/*.test.ts'],
    setupFiles: ['tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
  },
});
```

### Playwright Config

```typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e/tests',
  fullyParallel: true,
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'npm run dev',
    port: 3000,
    reuseExistingServer: true,
  },
});
```

## Best Practices

1. **Test behavior, not implementation** - Test what the service does, not how
2. **Use factories** - Create consistent test data
3. **Mock external dependencies** - Database, APIs, etc.
4. **Test edge cases** - Null values, errors, permissions
5. **Keep tests fast** - Mock expensive operations
6. **Test security** - Verify ownership filters, permissions
7. **Use descriptive names** - `it('should return empty array when org has no items')`
