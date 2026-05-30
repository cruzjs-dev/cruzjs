import { test, expect } from '@playwright/test';

/**
 * Debug tests - Run these one at a time to verify flows manually
 */
test.describe('Pipeline Debug Tests', () => {

  test('should load landing page', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Screenshot for debugging
    await page.screenshot({ path: 'test-results/landing.png', fullPage: true });

    // Should see some landing content
    await expect(page.locator('body')).toBeVisible();
  });

  test('should load registration page', async ({ page }) => {
    await page.goto('/auth/register');
    await page.waitForLoadState('networkidle');

    await page.screenshot({ path: 'test-results/register.png', fullPage: true });

    // Check for form elements
    await expect(page.getByRole('heading', { name: /register|create.*account|sign.*up/i })).toBeVisible({ timeout: 10000 });
  });

  test('should register a new user', async ({ page }) => {
    await page.goto('/auth/register');
    await page.waitForLoadState('networkidle');

    const timestamp = Date.now();
    const email = `test-${timestamp}@example.com`;
    const name = `Test User ${timestamp}`;
    const password = 'Test123!';

    // Fill form
    await page.getByRole('textbox', { name: /name/i }).fill(name);
    await page.getByRole('textbox', { name: /email/i }).fill(email);

    // Find password fields
    const passwordFields = page.locator('input[type="password"]');
    await passwordFields.nth(0).fill(password);
    await passwordFields.nth(1).fill(password);

    // Accept terms
    const checkbox = page.getByRole('checkbox');
    if (await checkbox.isVisible()) {
      await checkbox.check();
    }

    await page.screenshot({ path: 'test-results/register-filled.png', fullPage: true });

    // Submit
    await page.getByRole('button', { name: /register|sign.*up|create/i }).click();

    // Wait for navigation or response
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'test-results/after-register.png', fullPage: true });

    // Check where we ended up
    console.log('Current URL after registration:', page.url());
  });

  test('should load login page', async ({ page }) => {
    await page.goto('/auth/login');
    await page.waitForLoadState('networkidle');

    await page.screenshot({ path: 'test-results/login.png', fullPage: true });

    await expect(page.getByRole('heading', { name: /login|sign.*in/i })).toBeVisible({ timeout: 10000 });
  });

  test('should load dashboard after login', async ({ page }) => {
    // First register
    await page.goto('/auth/register');
    const timestamp = Date.now();
    const email = `test-${timestamp}@example.com`;
    const password = 'Test123!';

    await page.getByRole('textbox', { name: /name/i }).fill(`Test ${timestamp}`);
    await page.getByRole('textbox', { name: /email/i }).fill(email);
    const passwordFields = page.locator('input[type="password"]');
    await passwordFields.nth(0).fill(password);
    await passwordFields.nth(1).fill(password);
    const checkbox = page.getByRole('checkbox');
    if (await checkbox.isVisible()) await checkbox.check();

    await page.getByRole('button', { name: /register|sign.*up|create/i }).click();
    await page.waitForTimeout(3000);

    // Should be on dashboard
    await page.screenshot({ path: 'test-results/dashboard.png', fullPage: true });
    console.log('URL after registration:', page.url());
  });

  test('should access pipeline audiences page', async ({ page }) => {
    // Register first
    await page.goto('/auth/register');
    const timestamp = Date.now();
    const email = `test-${timestamp}@example.com`;
    const password = 'Test123!';

    await page.getByRole('textbox', { name: /name/i }).fill(`Test ${timestamp}`);
    await page.getByRole('textbox', { name: /email/i }).fill(email);
    const passwordFields = page.locator('input[type="password"]');
    await passwordFields.nth(0).fill(password);
    await passwordFields.nth(1).fill(password);
    const checkbox = page.getByRole('checkbox');
    if (await checkbox.isVisible()) await checkbox.check();

    await page.getByRole('button', { name: /register|sign.*up|create/i }).click();
    await page.waitForTimeout(3000);

    // Now we need to create an org - check if modal opens
    await page.screenshot({ path: 'test-results/pre-org.png', fullPage: true });

    // Look for create org button or modal
    const createOrgBtn = page.getByRole('button', { name: /create.*org|new.*org|add.*org/i });
    if (await createOrgBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await createOrgBtn.click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: 'test-results/create-org-modal.png', fullPage: true });
    }

    console.log('Current URL:', page.url());
  });
});
