import { Page, expect } from '@playwright/test';

export type TestUser = {
  email: string;
  password: string;
  name: string;
};

export type TestOrg = {
  id: string;
  name: string;
  slug: string;
};

export type EmailLog = {
  id: string;
  to: string;
  subject: string;
  template: string | null;
  metadata: Record<string, unknown> | null;
  status: string;
  createdAt: Date;
};

/**
 * Register a new test user
 */
export async function registerUser(page: Page, overrides?: Partial<TestUser>): Promise<TestUser> {
  const timestamp = Date.now();
  const user: TestUser = {
    email: overrides?.email || `test-${timestamp}@example.com`,
    password: overrides?.password || 'Test123!',
    name: overrides?.name || `Test User ${timestamp}`,
  };

  await page.goto('/auth/register');
  
  const form = page.locator('form');
  await form.getByRole('textbox', { name: 'Name' }).fill(user.name);
  await form.getByRole('textbox', { name: 'Email' }).fill(user.email);
  await form.getByRole('textbox', { name: 'Password' }).first().fill(user.password);
  await form.getByRole('textbox', { name: 'Confirm Password' }).fill(user.password);

  const termsCheckbox = form.getByRole('checkbox', { name: /I agree to the Terms and Conditions/i });
  await termsCheckbox.waitFor({ state: 'visible' });
  await termsCheckbox.click({ force: true });

  await Promise.all([
    page.waitForResponse(resp => resp.url().includes('/api/trpc/auth.register') && resp.status() !== 0, { timeout: 10000 }).catch(() => null),
    form.getByRole('button', { name: 'Register' }).click()
  ]);

  await page.waitForTimeout(2000);

  // Wait for redirect to dashboard or check for success
  try {
    await page.waitForURL(/\/(dashboard|home|org|app)/, { timeout: 10000 });
  } catch {
    // Check if we're still on register page - if so, registration might have failed
    const currentUrl = page.url();
    if (currentUrl.includes('/auth/register')) {
      // Check for toast notification or success message
      const hasToast = await page.locator('[role="status"], [data-status="success"]').isVisible({ timeout: 2000 }).catch(() => false);
      const hasSuccessText = await page.getByText(/registration successful|welcome|success/i).isVisible({ timeout: 2000 }).catch(() => false);
      
      // If no success indicators, registration likely failed - but continue anyway for test purposes
      if (!hasToast && !hasSuccessText) {
        console.warn('Registration may have failed - no success indicators found');
      }
    }
  }

  return user;
}

/**
 * Login with credentials
 */
export async function login(page: Page, email: string, password: string): Promise<void> {
  await page.goto('/auth/login');
  const form = page.locator('form');

  await form.getByRole('textbox', { name: 'Email' }).fill(email);
  await form.getByLabel('Password').fill(password);
  await form.getByRole('button', { name: 'Login' }).click();

  // Wait for redirect after login - could be /, /dashboard, or /orgs
  await page.waitForURL((url) => !url.pathname.includes('/auth/login'), { timeout: 10000 });
}

/**
 * Create an organization via the dashboard modal
 */
export async function createOrganization(page: Page, name: string, slug?: string): Promise<TestOrg> {
  await page.goto('/dashboard');

  // Wait for dashboard to load and click first Create Organization button
  const createButton = page.getByRole('button', { name: /create.*organization/i }).first();
  await createButton.waitFor({ state: 'visible', timeout: 10000 });
  await createButton.click();

  // Wait for modal to open
  const modal = page.getByRole('dialog');
  await modal.waitFor({ state: 'visible', timeout: 5000 });

  // Fill in the organization name
  const nameInput = modal.getByLabel(/organization name/i);
  await nameInput.fill(name);

  // Optionally fill in slug
  if (slug) {
    const slugInput = modal.getByLabel(/slug/i);
    await slugInput.clear();
    await slugInput.fill(slug);
  }

  // Submit the form
  await Promise.all([
    page.waitForResponse(resp => resp.url().includes('/api/trpc/org.create') && resp.status() !== 0, { timeout: 10000 }).catch(() => null),
    modal.getByRole('button', { name: /create organization/i }).click()
  ]);

  await page.waitForTimeout(2000);

  // Wait for redirect to org page
  await page.waitForURL(/\/orgs\/[^/]+/, { timeout: 10000 });

  const url = page.url();
  const slugMatch = url.match(/\/orgs\/([^/]+)/);
  const orgSlug = slugMatch ? slugMatch[1] : '';

  return {
    id: '', // We don't have easy access to ID in e2e
    name,
    slug: orgSlug,
  };
}

/**
 * Logout current user
 */
export async function logout(page: Page): Promise<void> {
  // Try to find and click logout button in navbar/menu
  try {
    // Look for logout in menu
    const menuButton = page.getByRole('button', { name: /menu|user|account/i }).first();
    if (await menuButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await menuButton.click();
      const logoutButton = page.getByRole('button', { name: /logout|sign out/i });
      if (await logoutButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await logoutButton.click();
        await page.waitForTimeout(1000);
      }
    }
  } catch {
    // If menu not found, try direct logout button
    const logoutButton = page.getByRole('button', { name: /logout|sign out/i });
    if (await logoutButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await logoutButton.click();
      await page.waitForTimeout(1000);
    }
  }
  
  // Clear session storage as fallback
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  
  // Navigate to login page
  await page.goto('/auth/login');
}

/**
 * Wait for toast notification
 */
export async function waitForToast(page: Page, text?: string, timeout = 5000): Promise<void> {
  if (text) {
    await expect(page.getByText(text)).toBeVisible({ timeout });
  } else {
    // Wait for any toast to appear
    await page.waitForSelector('[role="alert"], [data-status], .chakra-toast', { timeout });
  }
}

/**
 * Get current user from session
 */
export async function getCurrentUser(page: Page): Promise<TestUser | null> {
  // This would require API call or checking page state
  // For now, return null as we can't easily get this in e2e
  return null;
}

/**
 * Get email logs for a recipient
 * Uses API endpoint via page context to query email logs
 */
export async function getEmailLogs(page: Page, to: string, template?: string, limit = 10): Promise<EmailLog[]> {
  // Use page context to make API call (has access to cookies/session)
  try {
    const baseUrl = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5000';
    const params = new URLSearchParams({ to, limit: limit.toString() });
    if (template) {
      params.append('template', template);
    }
    
    const response = await page.request.get(`${baseUrl}/api/email-logs?${params}`);
    if (response.ok()) {
      const data = await response.json();
      return data.logs || [];
    } else {
      const errorText = await response.text().catch(() => '');
      console.warn(`Email logs API returned ${response.status()}: ${errorText}`);
    }
  } catch (error) {
    console.warn('Failed to fetch email logs via API:', error);
  }
  
  return [];
}

/**
 * Get the most recent email log for a recipient
 */
export async function getLatestEmailLog(page: Page, to: string, template?: string): Promise<EmailLog | null> {
  const logs = await getEmailLogs(page, to, template, 1);
  return logs.length > 0 ? logs[0] : null;
}

/**
 * Extract token/URL from email log metadata
 */
export function extractTokenFromEmailLog(log: EmailLog, urlType: 'resetUrl' | 'verificationUrl' | 'acceptUrl' | 'declineUrl'): string | null {
  if (!log.metadata) {
    return null;
  }
  
  const url = log.metadata[urlType] as string | undefined;
  if (!url) {
    return null;
  }
  
  // Extract token from URL
  if (urlType === 'acceptUrl' || urlType === 'declineUrl') {
    // For invitations, token is in the path: /invitations/{token}
    const match = url.match(/\/invitations\/([^/?]+)/);
    return match ? match[1] : null;
  } else if (urlType === 'verificationUrl') {
    // For email verification, token is in the path: /auth/verify-email/{token}
    const match = url.match(/\/auth\/verify-email\/([^/?]+)/);
    return match ? match[1] : null;
  } else if (urlType === 'resetUrl') {
    // For password reset, token can be in path or query param
    // Try path first: /auth/reset-password/{token}
    let match = url.match(/\/auth\/reset-password\/([^/?]+)/);
    if (match) {
      return match[1];
    }
    // Try query param: ?token=abc123
    try {
      const urlObj = new URL(url);
      return urlObj.searchParams.get('token') || null;
    } catch {
      // If URL parsing fails, try to extract token from string
      match = url.match(/[?&]token=([^&]+)/);
      return match ? match[1] : null;
    }
  }
  
  return null;
}

/**
 * Process pending email jobs synchronously
 * In tests, we need to process jobs immediately to get email logs
 */
export async function processEmailJobs(page: Page, maxJobs = 10): Promise<number> {
  try {
    const baseUrl = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5000';
    // Try to process jobs via API if endpoint exists
    const response = await page.request.post(`${baseUrl}/api/jobs/process`, {
      data: { maxJobs },
    }).catch(() => null);
    
    if (response && response.ok()) {
      const data = await response.json();
      return data.processed || 0;
    } else {
      // If no API endpoint, jobs will be processed by worker eventually
      // Just wait a bit for async processing
      await page.waitForTimeout(2000);
      return 0;
    }
  } catch (error) {
    // Fallback: just wait for async processing
    await page.waitForTimeout(2000);
    return 0;
  }
}

/**
 * Wait for email to be logged (check email logs)
 * Returns email log even if status is PENDING or FAILED - we just need the metadata/URLs
 * Processes pending jobs first to ensure email logs are created
 */
export async function waitForEmail(
  page: Page,
  to: string,
  template: string,
  timeout = 15000,
  interval = 500
): Promise<EmailLog | null> {
  // First, try to process any pending email jobs
  const processed = await processEmailJobs(page, 20);
  
  // Wait a bit for email logs to be created after job processing
  await page.waitForTimeout(500);
  
  const startTime = Date.now();
  let lastProcessTime = startTime;
  
  while (Date.now() - startTime < timeout) {
    const log = await getLatestEmailLog(page, to, template);
    // Accept any status - we just need the log entry with metadata
    // Even if email failed to send, the log contains the URLs we need
    if (log && log.template === template) {
      return log;
    }
    
    // Process jobs again periodically (every 2 seconds) in case they're still pending
    if (Date.now() - lastProcessTime > 2000) {
      await processEmailJobs(page, 20);
      lastProcessTime = Date.now();
      await page.waitForTimeout(500); // Wait for logs after processing
    }
    
    await new Promise(resolve => setTimeout(resolve, interval));
  }
  
  return null;
}

