---
title: E2E Tests
description: End-to-end testing with Playwright, page objects, authentication helpers, form testing, and screenshot comparison.
---

End-to-end tests verify complete user flows in a real browser. CruzJS uses Playwright for E2E testing with automatic dev server management.

## Setup

Playwright is configured to start the dev server automatically before running tests:

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
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

Install browsers:

```bash
npx playwright install chromium
```

Run E2E tests:

```bash
cruz test:e2e
```

## Writing Tests

```typescript
// tests/e2e/auth.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('should register a new user', async ({ page }) => {
    await page.goto('/register');

    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'SecurePassword123!');
    await page.fill('input[name="confirmPassword"]', 'SecurePassword123!');
    await page.click('button[type="submit"]');

    // Should redirect to dashboard after registration
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.locator('text=Welcome')).toBeVisible();
  });

  test('should login with existing credentials', async ({ page }) => {
    await page.goto('/login');

    await page.fill('input[name="email"]', 'existing@example.com');
    await page.fill('input[name="password"]', 'ExistingPassword123!');
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/login');

    await page.fill('input[name="email"]', 'wrong@example.com');
    await page.fill('input[name="password"]', 'wrong-password');
    await page.click('button[type="submit"]');

    await expect(page.locator('[role="alert"]')).toContainText('Invalid');
  });
});
```

## Page Objects

Encapsulate page interactions in page object classes for reuse:

```typescript
// tests/e2e/pages/login.page.ts
import { Page, Locator, expect } from '@playwright/test';

export class LoginPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.locator('input[name="email"]');
    this.passwordInput = page.locator('input[name="password"]');
    this.submitButton = page.locator('button[type="submit"]');
    this.errorMessage = page.locator('[role="alert"]');
  }

  async goto() {
    await this.page.goto('/login');
  }

  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }

  async expectError(text: string) {
    await expect(this.errorMessage).toContainText(text);
  }
}
```

```typescript
// tests/e2e/pages/dashboard.page.ts
import { Page, Locator, expect } from '@playwright/test';

export class DashboardPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly orgSwitcher: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.locator('h1');
    this.orgSwitcher = page.locator('[data-testid="org-switcher"]');
  }

  async expectLoaded() {
    await expect(this.heading).toBeVisible();
  }

  async switchOrg(orgName: string) {
    await this.orgSwitcher.click();
    await this.page.locator(`text=${orgName}`).click();
  }
}
```

Use page objects in tests:

```typescript
// tests/e2e/dashboard.spec.ts
import { test, expect } from '@playwright/test';
import { LoginPage } from './pages/login.page';
import { DashboardPage } from './pages/dashboard.page';

test('should switch organizations', async ({ page }) => {
  const loginPage = new LoginPage(page);
  const dashboard = new DashboardPage(page);

  await loginPage.goto();
  await loginPage.login('admin@example.com', 'password');

  await dashboard.expectLoaded();
  await dashboard.switchOrg('Second Org');

  await expect(page).toHaveURL(/\/orgs\/second-org/);
});
```

## Authentication Helpers

For tests that need an authenticated user, create a reusable auth helper:

```typescript
// tests/e2e/helpers/auth.ts
import { Page } from '@playwright/test';

export async function loginAs(page: Page, email: string, password: string) {
  await page.goto('/login');
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard');
}
```

### Storing Authentication State

For efficiency, authenticate once and reuse the session:

```typescript
// tests/e2e/auth.setup.ts
import { test as setup, expect } from '@playwright/test';

const authFile = 'tests/e2e/.auth/user.json';

setup('authenticate', async ({ page }) => {
  await page.goto('/login');
  await page.fill('input[name="email"]', 'test@example.com');
  await page.fill('input[name="password"]', 'TestPassword123!');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard');

  // Save authentication state
  await page.context().storageState({ path: authFile });
});
```

```typescript
// playwright.config.ts
export default defineConfig({
  projects: [
    { name: 'setup', testMatch: /.*\.setup\.ts/ },
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'tests/e2e/.auth/user.json',
      },
      dependencies: ['setup'],
    },
  ],
});
```

## Testing Forms

```typescript
test('should create a project', async ({ page }) => {
  await page.goto('/orgs/acme-corp/projects/new');

  // Fill form fields
  await page.fill('input[name="name"]', 'New Project');
  await page.fill('textarea[name="description"]', 'Project description');
  await page.selectOption('select[name="status"]', 'active');

  // Submit
  await page.click('button[type="submit"]');

  // Verify redirect to project page
  await expect(page).toHaveURL(/\/projects\/[a-z0-9]+/);
  await expect(page.locator('h1')).toContainText('New Project');
});
```

## Testing Navigation

```typescript
test('should navigate between org pages', async ({ page }) => {
  await page.goto('/orgs/acme-corp/dashboard');

  // Navigate via sidebar
  await page.click('a[href*="/members"]');
  await expect(page).toHaveURL(/\/members/);

  await page.click('a[href*="/settings"]');
  await expect(page).toHaveURL(/\/settings/);

  // Browser back button
  await page.goBack();
  await expect(page).toHaveURL(/\/members/);
});
```

## Screenshot Comparison

Use visual regression testing to catch unintended UI changes:

```typescript
test('dashboard should match screenshot', async ({ page }) => {
  await page.goto('/orgs/acme-corp/dashboard');
  await page.waitForLoadState('networkidle');

  await expect(page).toHaveScreenshot('dashboard.png', {
    maxDiffPixelRatio: 0.01,  // Allow 1% pixel difference
  });
});
```

Update baseline screenshots:

```bash
npx playwright test --update-snapshots
```

## Next Steps

- [Unit Tests](/testing/unit-tests) -- Testing services in isolation
- [Database Tests](/testing/database-tests) -- Testing with real database
- [Testing Overview](/testing/getting-started) -- Configuration and strategy
