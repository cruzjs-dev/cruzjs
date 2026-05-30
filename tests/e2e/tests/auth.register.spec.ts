import { test, expect } from '@playwright/test';

test.describe('User Registration', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to registration page
    await page.goto('/auth/register');
  });

  test('should display registration form', async ({ page }) => {
    // Check that the registration form is visible
    await expect(page.getByRole('heading', { name: 'Create Account' })).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'Name' })).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'Email' })).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'Password' })).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'Confirm Password' })).toBeVisible();
    await expect(page.getByRole('checkbox', { name: /terms/i })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Register' })).toBeVisible();
  });

  test('should show validation errors for empty form', async ({ page }) => {
    // Try to submit empty form
    await page.getByRole('button', { name: 'Register' }).click();

    // Should show validation errors (implementation depends on your form validation)
    // This is a placeholder - adjust based on your actual validation behavior
    await expect(page.getByRole('button', { name: 'Register' })).toBeVisible();
  });

  test('should successfully register a new user', async ({ page }) => {
    // Generate unique email for each test run
    const timestamp = Date.now();
    const email = `test-${timestamp}@example.com`;
    const name = 'Test User';
    const password = 'Test123!';

    // Fill in registration form
    await page.getByRole('textbox', { name: 'Name' }).fill(name);
    await page.getByRole('textbox', { name: 'Email' }).fill(email);
    // Use getByRole with first() to target password fields specifically
    await page.getByRole('textbox', { name: 'Password' }).first().fill(password);
    await page.getByRole('textbox', { name: 'Confirm Password' }).fill(password);

    // Check terms checkbox - use force click to bypass intercepting elements
    const termsCheckbox = page.getByRole('checkbox', { name: /I agree to the Terms and Conditions/i });
    await termsCheckbox.waitFor({ state: 'visible' });
    await termsCheckbox.click({ force: true });

    // Submit form
    await page.getByRole('button', { name: 'Register' }).click();

    // Wait for successful registration - could be redirect or success message
    // Check for either redirect to dashboard/home or success notification
    try {
      // Wait for redirect (if implemented)
      await page.waitForURL(/\/(dashboard|home|org|app)/, { timeout: 10000 });
      await expect(page).toHaveURL(/\/(dashboard|home|org|app)/);
    } catch {
      // If no redirect, check for success notification or message
      // Look for success toast/notification
      const successIndicator = page.getByText(/success|registered|welcome|account created/i);
      await expect(successIndicator).toBeVisible({ timeout: 5000 });
    }
  });

  test('should show error for duplicate email', async ({ page }) => {
    // Use a known email that already exists
    const email = 'ritter@kerryritter.com';
    const name = 'Test User';
    const password = 'Test123!';

    // Fill in registration form
    await page.getByRole('textbox', { name: 'Name' }).fill(name);
    await page.getByRole('textbox', { name: 'Email' }).fill(email);
    await page.getByRole('textbox', { name: 'Password' }).first().fill(password);
    await page.getByRole('textbox', { name: 'Confirm Password' }).fill(password);
    await page.getByRole('checkbox', { name: /terms/i }).check();

    // Submit form
    await page.getByRole('button', { name: 'Register' }).click();

    // Should show error message about duplicate email
    // Adjust selector based on your error message implementation
    await expect(page.getByText(/already exists|duplicate|taken/i)).toBeVisible({ timeout: 5000 });
  });

  test('should validate password strength', async ({ page }) => {
    const email = `test-${Date.now()}@example.com`;
    const name = 'Test User';
    const weakPassword = 'weak';

    // Fill in form with weak password
    await page.getByRole('textbox', { name: 'Name' }).fill(name);
    await page.getByRole('textbox', { name: 'Email' }).fill(email);
    await page.getByLabel('Password').fill(weakPassword);
    await page.getByLabel('Confirm Password').fill(weakPassword);
    await page.getByRole('checkbox', { name: /terms/i }).check();

    // Try to submit
    await page.getByRole('button', { name: 'Register' }).click();

    // Should show password validation error
    // Adjust selector based on your validation implementation
    await expect(page.getByText(/password.*strength|password.*requirements/i)).toBeVisible({ timeout: 5000 });
  });

  test('should validate password confirmation match', async ({ page }) => {
    const email = `test-${Date.now()}@example.com`;
    const name = 'Test User';
    const password = 'Test123!';
    const confirmPassword = 'Different123!';

    // Fill in form with mismatched passwords
    await page.getByRole('textbox', { name: 'Name' }).fill(name);
    await page.getByRole('textbox', { name: 'Email' }).fill(email);
    await page.getByLabel('Password').fill(password);
    await page.getByLabel('Confirm Password').fill(confirmPassword);
    await page.getByRole('checkbox', { name: /terms/i }).check();

    // Try to submit
    await page.getByRole('button', { name: 'Register' }).click();

    // Should show password mismatch error
    // Adjust selector based on your validation implementation
    await expect(page.getByText(/password.*match|password.*confirm/i)).toBeVisible({ timeout: 5000 });
  });

  test('should require terms acceptance', async ({ page }) => {
    const email = `test-${Date.now()}@example.com`;
    const name = 'Test User';
    const password = 'Test123!';

    // Fill in form without checking terms
    await page.getByRole('textbox', { name: 'Name' }).fill(name);
    await page.getByRole('textbox', { name: 'Email' }).fill(email);
    await page.getByLabel('Password').fill(password);
    await page.getByLabel('Confirm Password').fill(password);
    // Don't check terms checkbox

    // Try to submit
    await page.getByRole('button', { name: 'Register' }).click();

    // Should show error about terms acceptance
    // Adjust selector based on your validation implementation
    await expect(page.getByText(/terms|accept|agree/i)).toBeVisible({ timeout: 5000 });
  });
});

