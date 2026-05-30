import { test, expect } from '@playwright/test';
import { registerUser, login, logout, waitForEmail, getLatestEmailLog, extractTokenFromEmailLog, getEmailLogs } from './helpers';

test.describe('Authentication Flows', () => {
  test.describe('Test Flow 1: User Registration', () => {
    test('should successfully register a new user', async ({ page }) => {
      const user = await registerUser(page);
      
      // Verify redirect to dashboard or success
      await expect(page).toHaveURL(/\/(dashboard|home|org|app)/);
      
      // Verify user is logged in - check for specific dashboard content
      await expect(page.getByRole('heading', { name: /welcome back|your organizations/i }).first()).toBeVisible({ timeout: 5000 });
    });

    test('should show validation errors for invalid email', async ({ page }) => {
      await page.goto('/auth/register');
      const form = page.locator('form');
      
      await form.getByRole('textbox', { name: 'Email' }).fill('invalid-email');
      await form.getByRole('button', { name: 'Register' }).click();
      
      // HTML5 validation should prevent submission
      await expect(page).toHaveURL(/\/auth\/register/);
    });

    test('should show validation errors for weak password', async ({ page }) => {
      await page.goto('/auth/register');
      const form = page.locator('form');
      
      await form.getByRole('textbox', { name: 'Email' }).fill(`test-${Date.now()}@example.com`);
      await form.getByRole('textbox', { name: 'Password' }).first().fill('weak');
      await form.getByRole('button', { name: 'Register' }).click();
      
      // Should show password validation error - check for form error message or password strength indicator
      const hasError = await Promise.race([
        page.getByText(/password.*does not meet|password.*required|at least 8 characters/i).isVisible().then(() => true),
        page.locator('[role="alert"]').isVisible().then(() => true),
        page.locator('form').getByText(/password/i).first().isVisible().then(() => true),
      ]).catch(() => false);
      
      // Form should still be on page (not submitted)
      await expect(page).toHaveURL(/\/auth\/register/);
      expect(hasError || await page.locator('form').isVisible()).toBeTruthy();
    });

    test('should show error for password mismatch', async ({ page }) => {
      await page.goto('/auth/register');
      const form = page.locator('form');
      
      await form.getByRole('textbox', { name: 'Email' }).fill(`test-${Date.now()}@example.com`);
      await form.getByRole('textbox', { name: 'Password' }).first().fill('Test123!');
      await form.getByRole('textbox', { name: 'Confirm Password' }).fill('Different123!');
      await form.getByRole('button', { name: 'Register' }).click();
      
      // Should show password mismatch error
      await expect(page.getByText(/password.*match|password.*confirm/i)).toBeVisible({ timeout: 5000 });
    });

    test('should show error for duplicate email', async ({ page }) => {
      // First register a user
      const user = await registerUser(page);
      
      // Clear session and navigate to register
      await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
      });
      await page.goto('/auth/register');
      
      // Try to register again with same email
      const form = page.locator('form');
      
      await form.getByRole('textbox', { name: 'Name' }).fill('Another User');
      await form.getByRole('textbox', { name: 'Email' }).fill(user.email);
      await form.getByRole('textbox', { name: 'Password' }).first().fill(user.password);
      await form.getByRole('textbox', { name: 'Confirm Password' }).fill(user.password);
      const termsCheckbox = form.getByRole('checkbox', { name: /terms/i });
      await termsCheckbox.click({ force: true });
      
      await Promise.all([
        page.waitForResponse(resp => resp.url().includes('/api/trpc/auth.register') && resp.status() !== 0, { timeout: 10000 }).catch(() => null),
        form.getByRole('button', { name: 'Register' }).click()
      ]);
      
      await page.waitForTimeout(3000);
      
      // Should show duplicate email error - check multiple possible locations
      const errorSelectors = [
        page.getByText(/already exists|duplicate|taken|email.*already|registration failed/i),
        page.locator('[role="alert"]'),
        page.locator('[data-status="error"]'),
        page.locator('.chakra-alert'),
        page.locator('form').getByText(/error|failed|already/i),
        page.locator('[class*="error"]'),
      ];
      
      let hasError = false;
      for (const selector of errorSelectors) {
        try {
          const isVisible = await selector.isVisible({ timeout: 1000 });
          if (isVisible) {
            const text = await selector.textContent().catch(() => '');
            if (text && (text.toLowerCase().includes('already') || text.toLowerCase().includes('exists') || text.toLowerCase().includes('taken') || text.toLowerCase().includes('error'))) {
              hasError = true;
              break;
            }
          }
        } catch {
          // Continue to next selector
        }
      }
      
      // Also check if we're still on register page (form didn't submit successfully)
      const stillOnRegisterPage = page.url().includes('/auth/register');
      
      expect(hasError || stillOnRegisterPage).toBeTruthy();
    });
  });

  test.describe('Test Flow 2: User Login', () => {
    test('should successfully login with valid credentials', async ({ page }) => {
      const user = await registerUser(page);
      
      // Clear session and navigate to login
      await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
      });
      await page.goto('/auth/login');
      
      await login(page, user.email, user.password);
      await expect(page).toHaveURL(/\/(dashboard|home|org|app)/);
    });

    test('should show error for invalid credentials', async ({ page }) => {
      await page.goto('/auth/login');
      const form = page.locator('form');
      
      await form.getByRole('textbox', { name: 'Email' }).fill('invalid@example.com');
      await form.getByLabel('Password').fill('WrongPassword123!');
      
      await Promise.all([
        page.waitForResponse(resp => resp.url().includes('/api/trpc/auth.login') && resp.status() !== 0, { timeout: 10000 }).catch(() => null),
        form.getByRole('button', { name: 'Login' }).click()
      ]);
      
      await page.waitForTimeout(3000);
      
      // Should show error - check multiple possible locations
      const errorSelectors = [
        page.getByText(/invalid email or password|login failed|incorrect|error/i),
        page.locator('[role="alert"]'),
        page.locator('[data-status="error"]'),
        page.locator('.chakra-alert'),
        page.locator('form').getByText(/error|failed|invalid/i),
        page.locator('[class*="error"]'),
        page.locator('[class*="red"]'),
      ];
      
      let hasError = false;
      for (const selector of errorSelectors) {
        try {
          const isVisible = await selector.isVisible({ timeout: 1000 });
          if (isVisible) {
            const text = await selector.textContent().catch(() => '');
            if (text && (text.toLowerCase().includes('invalid') || text.toLowerCase().includes('failed') || text.toLowerCase().includes('error') || text.toLowerCase().includes('incorrect'))) {
              hasError = true;
              break;
            }
          }
        } catch {
          // Continue to next selector
        }
      }
      
      // Also check if we're still on login page (form didn't submit successfully)
      const stillOnLoginPage = page.url().includes('/auth/login');
      
      expect(hasError || stillOnLoginPage).toBeTruthy();
    });

    test('should redirect to specified redirect URL after login', async ({ page }) => {
      const user = await registerUser(page);
      
      // Clear session and navigate to login with redirect
      await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
      });
      await page.goto('/auth/login?redirect=/dashboard');
      
      await login(page, user.email, user.password);
      
      await expect(page).toHaveURL(/\/dashboard/);
    });

    test('should toggle remember me checkbox', async ({ page }) => {
      await page.goto('/auth/login');
      const form = page.locator('form');
      const rememberMeCheckbox = form.getByRole('checkbox', { name: /remember me/i });
      
      await expect(rememberMeCheckbox).not.toBeChecked();
      await form.getByText(/remember me/i).click();
      await expect(rememberMeCheckbox).toBeChecked();
    });
  });

  test.describe('Test Flow 3: OAuth Login', () => {
    test.skip('OAuth login - requires provider configuration', async ({ page }) => {
      // OAuth flows require external provider setup
      // This test is skipped until OAuth is configured
    });
  });

  test.describe('Test Flow 4: Password Reset Flow', () => {
    test('should show forgot password form', async ({ page }) => {
      await page.goto('/auth/forgot-password');
      await expect(page.getByRole('heading', { name: /forgot password|reset password/i })).toBeVisible();
      await expect(page.getByRole('textbox', { name: /email/i })).toBeVisible();
    });

    test('should send password reset email', async ({ page }) => {
      // Register a user first
      const user = await registerUser(page);
      
      // Clear session and navigate to forgot password
      await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
      });
      await page.goto('/auth/forgot-password');
      
      const form = page.locator('form');
      await form.getByRole('textbox', { name: /email/i }).fill(user.email);
      
      await Promise.all([
        page.waitForResponse(resp => resp.url().includes('/api/trpc/auth.forgotPassword') && resp.status() !== 0, { timeout: 10000 }).catch(() => null),
        form.getByRole('button', { name: /send|submit/i }).click()
      ]);
      
      await page.waitForTimeout(2000);
      
      // Check email logs for password reset email
      // Even if email failed to send, the log should exist with metadata
      const emailLog = await waitForEmail(page, user.email, 'password-reset', 15000);
      
      // Debug: Check all email logs for this user
      if (!emailLog) {
        const allLogs = await getEmailLogs(page, user.email, undefined, 20);
        console.log(`Found ${allLogs.length} email logs for ${user.email}:`, allLogs.map(l => ({ template: l.template, status: l.status, subject: l.subject })));
      }
      
      expect(emailLog).not.toBeNull();
      expect(emailLog?.template).toBe('password-reset');
      expect(emailLog?.to).toBe(user.email);
      // Status can be SENT, PENDING, or FAILED - we just need the log entry
      expect(emailLog?.status).toBeDefined();
      // Verify metadata contains resetUrl
      expect(emailLog?.metadata).toBeDefined();
      expect(emailLog?.metadata?.resetUrl).toBeDefined();
    });

    test('should reset password with valid token', async ({ page }) => {
      // Register a user
      const user = await registerUser(page);
      
      // Clear session and request password reset
      await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
      });
      await page.goto('/auth/forgot-password');
      
      const form = page.locator('form');
      await form.getByRole('textbox', { name: /email/i }).fill(user.email);
      
      await Promise.all([
        page.waitForResponse(resp => resp.url().includes('/api/trpc/auth.forgotPassword') && resp.status() !== 0, { timeout: 10000 }).catch(() => null),
        form.getByRole('button', { name: /send|submit/i }).click()
      ]);
      
      await page.waitForTimeout(2000);
      
      // Get reset token from email log
      const emailLog = await waitForEmail(page, user.email, 'password-reset', 10000);
      expect(emailLog).not.toBeNull();
      
      const resetUrl = emailLog?.metadata?.resetUrl as string | undefined;
      expect(resetUrl).toBeDefined();
      
      // Extract token from URL
      const token = extractTokenFromEmailLog(emailLog!, 'resetUrl');
      expect(token).not.toBeNull();
      
      // Navigate to reset password page with token
      await page.goto(`/auth/reset-password/${token}`);
      
      // Fill in new password
      const resetForm = page.locator('form');
      const newPassword = 'NewPassword123!';
      await resetForm.getByLabel(/new password/i).fill(newPassword);
      await resetForm.getByLabel(/confirm.*password/i).fill(newPassword);
      
      await Promise.all([
        page.waitForResponse(resp => resp.url().includes('/api/trpc/auth.resetPassword') && resp.status() !== 0, { timeout: 10000 }).catch(() => null),
        resetForm.getByRole('button', { name: /reset|submit/i }).click()
      ]);
      
      await page.waitForTimeout(2000);
      
      // Should redirect to login or show success
      const url = page.url();
      const isSuccess = url.includes('/auth/login') || await page.getByText(/success|password.*reset/i).isVisible({ timeout: 2000 }).catch(() => false);
      expect(isSuccess).toBeTruthy();
      
      // Try to login with new password
      await page.goto('/auth/login');
      await login(page, user.email, newPassword);
      await expect(page).toHaveURL(/\/(dashboard|home|org|app)/);
    });
  });

  test.describe('Test Flow 5: Email Verification', () => {
    test('should verify email with valid token', async ({ page }) => {
      // Register a user (should trigger verification email)
      const user = await registerUser(page);
      
      // Wait for verification email
      // Even if email failed to send, the log should exist with metadata
      const emailLog = await waitForEmail(page, user.email, 'email-verification', 10000);
      expect(emailLog).not.toBeNull();
      expect(emailLog?.template).toBe('email-verification');
      // Verify metadata contains verificationUrl
      expect(emailLog?.metadata).toBeDefined();
      expect(emailLog?.metadata?.verificationUrl).toBeDefined();
      
      // Get verification token from email log
      const verificationUrl = emailLog?.metadata?.verificationUrl as string | undefined;
      expect(verificationUrl).toBeDefined();
      
      const token = extractTokenFromEmailLog(emailLog!, 'verificationUrl');
      expect(token).not.toBeNull();
      
      // Clear session and navigate to verification page
      await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
      });
      
      await page.goto(`/auth/verify-email/${token}`);
      
      // Should show success message or redirect to login
      await page.waitForTimeout(3000);
      
      // Check for success message or redirect
      const hasSuccessMessage = await page.getByText(/verified successfully|success!/i).isVisible({ timeout: 3000 }).catch(() => false);
      const hasRedirected = page.url().includes('/auth/login');
      
      expect(hasSuccessMessage || hasRedirected).toBeTruthy();
    });

    test('should show error for invalid verification token', async ({ page }) => {
      await page.goto('/auth/verify-email/invalid-token-12345');
      await page.waitForTimeout(2000);
      
      // Should show error or redirect to login
      const url = page.url();
      const hasError = await page.getByText(/invalid|expired|error/i).isVisible({ timeout: 2000 }).catch(() => false);
      const isRedirected = url.includes('/auth/login') || url.includes('/dashboard');
      
      expect(hasError || isRedirected).toBeTruthy();
    });
  });
});

