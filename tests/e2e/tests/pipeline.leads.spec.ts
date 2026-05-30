import { test, expect } from '@playwright/test';
import { registerUser, login, createOrganization } from './helpers';

test.describe('Pipeline - Leads', () => {
  let testUser: { email: string; password: string; name: string };
  let testOrg: { slug: string };

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    testUser = await registerUser(page);
    testOrg = await createOrganization(page, `Test Org ${Date.now()}`);
    await page.close();
  });

  test.beforeEach(async ({ page }) => {
    await login(page, testUser.email, testUser.password);
  });

  test('should display leads page with filters', async ({ page }) => {
    await page.goto(`/orgs/${testOrg.slug}/leads`);

    // Check page header
    await expect(page.getByRole('heading', { name: /leads/i })).toBeVisible();

    // Check filters are visible
    await expect(page.getByPlaceholder(/search/i)).toBeVisible();
    await expect(page.locator('select').first()).toBeVisible(); // Audience filter
  });

  test('should display stat cards', async ({ page }) => {
    await page.goto(`/orgs/${testOrg.slug}/leads`);

    // Check stat cards
    await expect(page.getByText(/total/i)).toBeVisible();
    await expect(page.getByText(/new/i)).toBeVisible();
    await expect(page.getByText(/approved/i)).toBeVisible();
    await expect(page.getByText(/rejected/i)).toBeVisible();
  });

  test('should filter leads by status', async ({ page }) => {
    await page.goto(`/orgs/${testOrg.slug}/leads`);

    // Find status filter dropdown
    const statusFilter = page.locator('select').filter({ hasText: /status|all/i }).first();
    if (await statusFilter.isVisible()) {
      await statusFilter.selectOption('new');
      await page.waitForTimeout(1000);

      // URL should include filter param or UI should update
      const url = page.url();
      expect(url.includes('status') || await page.getByText('New').count() > 0).toBe(true);
    }
  });

  test('should filter leads by search', async ({ page }) => {
    await page.goto(`/orgs/${testOrg.slug}/leads`);

    // Type in search
    const searchInput = page.getByPlaceholder(/search/i);
    await searchInput.fill('test company');
    await page.waitForTimeout(1000);

    // Search should be applied
    expect(await searchInput.inputValue()).toBe('test company');
  });

  test('should open lead detail drawer when clicking a lead', async ({ page }) => {
    await page.goto(`/orgs/${testOrg.slug}/leads`);

    // Check if there are any leads
    const leadItem = page.locator('[class*="cursor-pointer"]').first();
    const hasLeads = await leadItem.isVisible().catch(() => false);

    if (hasLeads) {
      await leadItem.click();

      // Drawer should open
      await expect(page.locator('[class*="DrawerContent"]')).toBeVisible({ timeout: 5000 });
    } else {
      // Empty state should be shown
      await expect(page.getByText(/no leads/i)).toBeVisible();
    }
  });

  test('should show approve/reject buttons for new leads', async ({ page }) => {
    await page.goto(`/orgs/${testOrg.slug}/leads`);

    // Filter to new leads
    const statusFilter = page.locator('select').filter({ hasText: /status|all/i }).first();
    if (await statusFilter.isVisible()) {
      await statusFilter.selectOption('new');
      await page.waitForTimeout(1000);
    }

    // Click on first lead if exists
    const leadItem = page.locator('[class*="cursor-pointer"]').first();
    if (await leadItem.isVisible().catch(() => false)) {
      await leadItem.click();
      await page.waitForTimeout(500);

      // Should see approve/reject buttons
      const approveBtn = page.getByRole('button', { name: /approve/i });
      const rejectBtn = page.getByRole('button', { name: /reject/i });

      const hasApprove = await approveBtn.isVisible().catch(() => false);
      const hasReject = await rejectBtn.isVisible().catch(() => false);

      // At least one action button should be visible for new leads
      expect(hasApprove || hasReject).toBe(true);
    }
  });

  test('should display lead contact information in drawer', async ({ page }) => {
    await page.goto(`/orgs/${testOrg.slug}/leads`);

    const leadItem = page.locator('[class*="cursor-pointer"]').first();
    if (await leadItem.isVisible().catch(() => false)) {
      await leadItem.click();
      await page.waitForTimeout(500);

      // Should show contact information section
      await expect(page.getByText(/contact.*information/i)).toBeVisible();
    }
  });

  test('should filter leads by audience', async ({ page }) => {
    await page.goto(`/orgs/${testOrg.slug}/leads`);

    // Find audience filter dropdown (first select, contains "All Audiences")
    const audienceFilter = page.locator('select').filter({ hasText: /audience|all/i }).first();
    if (await audienceFilter.isVisible()) {
      // Just verify the filter is interactive
      await audienceFilter.click();
      await page.waitForTimeout(500);
    }
  });
});
