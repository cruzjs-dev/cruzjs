import { test, expect } from '@playwright/test';

/**
 * Local Development Mode Tests
 *
 * These tests verify that the local dev facade works correctly:
 * - Server starts without wrangler (using better-sqlite3)
 * - Pages load and render properly
 * - Basic navigation works
 */
test.describe('Local Development Mode', () => {
  test('should start server and load homepage', async ({ page }) => {
    // Navigate to the root URL
    const response = await page.goto('/');

    // Server should respond with 200 or redirect to login
    expect(response?.status()).toBeLessThan(500);

    // Page should have loaded something
    await expect(page.locator('body')).toBeVisible();
  });

  test('should load login page', async ({ page }) => {
    await page.goto('/auth/login');

    // Should be on login page or similar auth page
    await expect(page).toHaveURL(/\/auth/);

    // Should have a login form or auth UI
    const hasLoginButton = await page.getByRole('button', { name: /login|sign in/i }).isVisible().catch(() => false);
    const hasEmailInput = await page.locator('input[type="email"], input[name="email"]').isVisible().catch(() => false);
    const hasForm = await page.locator('form').isVisible().catch(() => false);

    expect(hasLoginButton || hasEmailInput || hasForm).toBeTruthy();
  });

  test('should load register page', async ({ page }) => {
    await page.goto('/auth/register');

    // Should be on register page or similar auth page
    await expect(page).toHaveURL(/\/auth/);

    // Should have a register form or auth UI
    const hasRegisterButton = await page.getByRole('button', { name: /register|sign up|create/i }).isVisible().catch(() => false);
    const hasEmailInput = await page.locator('input[type="email"], input[name="email"]').isVisible().catch(() => false);
    const hasForm = await page.locator('form').isVisible().catch(() => false);

    expect(hasRegisterButton || hasEmailInput || hasForm).toBeTruthy();
  });

  test('should handle API health check', async ({ page }) => {
    // Navigate to health endpoint
    const response = await page.goto('/api/health');

    // Health endpoint should respond
    expect(response?.status()).toBeLessThan(500);
  });

  test('should redirect unauthenticated users from dashboard', async ({ page }) => {
    // Clear any existing session
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });

    // Try to access protected route
    await page.goto('/dashboard');

    // Should redirect to login
    await expect(page).toHaveURL(/\/auth\/login/);
  });
});
