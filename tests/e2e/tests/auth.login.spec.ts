import { test, expect } from '@playwright/test';

// Helper function to register a test user
async function registerTestUser(page: any) {
  const timestamp = Date.now();
  const email = `test-login-${timestamp}@example.com`;
  const name = 'Test Login User';
  const password = 'Test123!';

  // Navigate to registration page
  await page.goto('/auth/register');

  // Fill in registration form
  const registerForm = page.locator('form');
  await registerForm.getByRole('textbox', { name: 'Name' }).fill(name);
  await registerForm.getByRole('textbox', { name: 'Email' }).fill(email);
  await registerForm.getByRole('textbox', { name: 'Password' }).first().fill(password);
  await registerForm.getByRole('textbox', { name: 'Confirm Password' }).fill(password);

  // Check terms checkbox
  const termsCheckbox = registerForm.getByRole('checkbox', { name: /I agree to the Terms and Conditions/i });
  await termsCheckbox.waitFor({ state: 'visible' });
  await termsCheckbox.click({ force: true });

  // Submit form and wait for response
  const [response] = await Promise.all([
    page.waitForResponse(resp => resp.url().includes('/api/trpc/auth.register') && resp.status() !== 0, { timeout: 10000 }).catch(() => null),
    registerForm.getByRole('button', { name: 'Register' }).click()
  ]);

  // Wait a bit for UI to update
  await page.waitForTimeout(2000);

  // Check response status if we got one
  if (response && !response.ok()) {
    const responseText = await response.text().catch(() => '');
    throw new Error(`Registration API failed with status ${response.status()}: ${responseText}`);
  }

  // Check for error messages in UI
  const errorSelectors = [
    page.locator('[class*="red"]').first(),
    page.locator('[data-status="error"]').first(),
    page.getByText(/failed|error|already exists/i).first()
  ];
  
  for (const errorSelector of errorSelectors) {
    const isVisible = await errorSelector.isVisible().catch(() => false);
    if (isVisible) {
      const errorText = await errorSelector.textContent().catch(() => '');
      if (errorText && errorText.trim() && errorText !== '*') {
        throw new Error(`Registration failed: ${errorText}`);
      }
    }
  }

  // Wait for either successful registration (redirect) or success message
  try {
    // Wait for successful registration (redirect to dashboard)
    await page.waitForURL(/\/(dashboard|home|org|app)/, { timeout: 10000 });
  } catch (error) {
    // Check for success toast/notification as fallback
    const successIndicator = page.getByText(/success|registered|welcome|account created/i);
    const hasSuccess = await successIndicator.isVisible({ timeout: 2000 }).catch(() => false);
    
    if (!hasSuccess) {
      // Check current URL to see what happened
      const currentUrl = page.url();
      // Get page content for debugging
      const pageContent = await page.textContent('body').catch(() => '');
      throw new Error(`Registration did not redirect or show success. Current URL: ${currentUrl}. Page contains errors: ${hasError}`);
    }
  }

  // Clear session to simulate logout
  await page.evaluate(() => {
    localStorage.removeItem('auth_token');
  });

  return { email, password };
}

test.describe('User Login', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to login page
    await page.goto('/auth/login');
  });

  test('should display login form', async ({ page }) => {
    // Check that the login form is visible
    const form = page.locator('form');
    await expect(page.getByRole('heading', { name: 'Login' })).toBeVisible();
    await expect(form.getByRole('textbox', { name: 'Email' })).toBeVisible();
    await expect(form.getByLabel('Password')).toBeVisible();
    await expect(form.getByRole('checkbox', { name: /remember me/i })).toBeVisible();
    await expect(form.getByRole('button', { name: 'Login' })).toBeVisible();
    await expect(form.getByRole('link', { name: /forgot password/i })).toBeVisible();
    await expect(form.getByRole('link', { name: 'Register' })).toBeVisible();
  });

  test('should show validation errors for empty form', async ({ page }) => {
    // Try to submit empty form
    const form = page.locator('form');
    await form.getByRole('button', { name: 'Login' }).click();

    // HTML5 validation should prevent submission or show validation errors
    // The form should remain on the login page
    await expect(page).toHaveURL(/\/auth\/login/);
  });

  test('should show error for invalid credentials', async ({ page }) => {
    const email = 'invalid@example.com';
    const password = 'WrongPassword123!';
    const form = page.locator('form');

    // Fill in login form with invalid credentials
    await form.getByRole('textbox', { name: 'Email' }).fill(email);
    await form.getByLabel('Password').fill(password);

    // Submit form
    await form.getByRole('button', { name: 'Login' }).click();

    // Should show error message - check for toast or error box
    const errorMessage = page.getByText(/invalid email or password|login failed/i).first();
    await expect(errorMessage).toBeVisible({ timeout: 5000 });
  });

  test('should successfully login with valid credentials', async ({ page }) => {
    // First register a test user
    const { email, password } = await registerTestUser(page);

    // Navigate to login page
    await page.goto('/auth/login');
    const form = page.locator('form');

    // Fill in login form
    await form.getByRole('textbox', { name: 'Email' }).fill(email);
    await form.getByLabel('Password').fill(password);

    // Submit form
    await form.getByRole('button', { name: 'Login' }).click();

    // Wait for successful login - should redirect to dashboard or home
    await page.waitForURL(/\/(dashboard|home|org|app)/, { timeout: 10000 });
    await expect(page).toHaveURL(/\/(dashboard|home|org|app)/);
  });

  test('should redirect to specified redirect URL after login', async ({ page }) => {
    // First register a test user
    const { email, password } = await registerTestUser(page);

    const redirectPath = '/dashboard';

    // Navigate to login with redirect parameter
    await page.goto(`/auth/login?redirect=${redirectPath}`);

    const form = page.locator('form');
    // Fill in login form
    await form.getByRole('textbox', { name: 'Email' }).fill(email);
    await form.getByLabel('Password').fill(password);

    // Submit form
    await form.getByRole('button', { name: 'Login' }).click();

    // Should redirect to the specified path
    await page.waitForURL(redirectPath, { timeout: 10000 });
    await expect(page).toHaveURL(redirectPath);
  });

  test('should toggle remember me checkbox', async ({ page }) => {
    const form = page.locator('form');
    const rememberMeCheckbox = form.getByRole('checkbox', { name: /remember me/i });

    // Check that checkbox is initially unchecked
    await expect(rememberMeCheckbox).not.toBeChecked();

    // Click checkbox label to toggle (Chakra UI checkbox needs label click)
    await form.getByText(/remember me/i).click();

    // Check that checkbox is now checked
    await expect(rememberMeCheckbox).toBeChecked();

    // Click again to uncheck
    await form.getByText(/remember me/i).click();
    await expect(rememberMeCheckbox).not.toBeChecked();
  });

  test('should navigate to forgot password page', async ({ page }) => {
    const form = page.locator('form');
    // Click forgot password link
    await form.getByRole('link', { name: /forgot password/i }).click();

    // Should navigate to forgot password page
    await expect(page).toHaveURL(/\/auth\/forgot-password/);
  });

  test('should navigate to register page', async ({ page }) => {
    const form = page.locator('form');
    // Click register link
    await form.getByRole('link', { name: 'Register' }).click();

    // Should navigate to register page
    await expect(page).toHaveURL(/\/auth\/register/);
  });

  test('should show loading state during login', async ({ page }) => {
    // First register a test user
    const { email, password } = await registerTestUser(page);

    // Navigate to login page
    await page.goto('/auth/login');
    const form = page.locator('form');

    // Fill in login form
    await form.getByRole('textbox', { name: 'Email' }).fill(email);
    await form.getByLabel('Password').fill(password);

    // Start login (don't wait for completion)
    const loginPromise = form.getByRole('button', { name: 'Login' }).click();

    // Check for loading state
    await expect(form.getByRole('button', { name: /logging in/i })).toBeVisible({ timeout: 1000 });

    // Wait for login to complete
    await loginPromise;
  });
});

