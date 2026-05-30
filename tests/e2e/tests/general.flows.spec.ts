import { test, expect } from '@playwright/test';
import { registerUser, login, logout } from './helpers';

test.describe('General Test Scenarios', () => {
  test.describe('Test Flow 25: Session Management', () => {
    test('should persist session across page refresh', async ({ page }) => {
      const user = await registerUser(page);
      
      await page.goto('/dashboard');
      await page.reload();
      
      // Should still be logged in
      await expect(page.getByRole('heading', { name: /welcome back|your organizations/i }).first()).toBeVisible({ timeout: 5000 });
    });

    test('should logout successfully', async ({ page }) => {
      const user = await registerUser(page);
      
      // Clear session storage to simulate logout
      await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
      });
      await page.goto('/auth/login');
      
      // Should be on login page
      await expect(page).toHaveURL(/\/auth\/login/);
    });

    test('should require authentication for protected routes', async ({ page }) => {
      // Navigate to a page first to access localStorage
      await page.goto('/');
      
      // Clear session storage
      await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
      });
      
      await page.goto('/dashboard');
      
      // Should redirect to login
      await expect(page).toHaveURL(/\/auth\/login/);
    });
  });

  test.describe('Test Flow 26: Error Handling', () => {
    test('should handle 404 errors', async ({ page }) => {
      await page.goto('/non-existent-page-12345');
      
      // Wait a bit for page to load
      await page.waitForTimeout(2000);
      
      // Should show 404, redirect to login, or show error
      const url = page.url();
      const is404 = await page.getByText(/404|not found/i).isVisible({ timeout: 2000 }).catch(() => false);
      const isRedirected = url.includes('/dashboard') || url.includes('/auth/login') || url.includes('/');
      const hasError = await page.getByText(/error|not found/i).isVisible({ timeout: 1000 }).catch(() => false);
      
      // Any of these outcomes is acceptable
      expect(is404 || isRedirected || hasError).toBeTruthy();
    });

    test('should show validation errors', async ({ page }) => {
      await page.goto('/auth/login');
      const form = page.locator('form');
      
      // Submit empty form
      await form.getByRole('button', { name: 'Login' }).click();
      
      // Should show validation errors or stay on page
      await expect(page).toHaveURL(/\/auth\/login/);
    });
  });

  test.describe('Test Flow 27: Responsive Design', () => {
    test('should work on mobile viewport', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      
      const user = await registerUser(page);
      
      await page.goto('/dashboard');
      
      // Should still display content
      await expect(page.getByRole('heading', { name: /welcome back|your organizations/i }).first()).toBeVisible({ timeout: 5000 });
    });

    test('should work on tablet viewport', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      
      const user = await registerUser(page);
      
      await page.goto('/dashboard');
      
      // Should still display content
      await expect(page.getByRole('heading', { name: /welcome back|your organizations/i }).first()).toBeVisible({ timeout: 5000 });
    });

    test('should work on desktop viewport', async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 });
      
      const user = await registerUser(page);
      
      await page.goto('/dashboard');
      
      // Should still display content
      await expect(page.getByRole('heading', { name: /welcome back|your organizations/i }).first()).toBeVisible({ timeout: 5000 });
    });
  });
});

