import { test, expect } from '@playwright/test';
import { registerUser, login, createOrganization } from './helpers';

test.describe('Pipeline - Jobs', () => {
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

  test('should display jobs page with pipeline stages', async ({ page }) => {
    await page.goto(`/orgs/${testOrg.slug}/jobs`);

    // Check page header
    await expect(page.getByRole('heading', { name: /pipeline.*jobs|jobs/i })).toBeVisible();

    // Check pipeline stages
    await expect(page.getByText(/sourcing/i)).toBeVisible();
    await expect(page.getByText(/scraping/i)).toBeVisible();
    await expect(page.getByText(/analyzing/i)).toBeVisible();
  });

  test('should display stage status counts', async ({ page }) => {
    await page.goto(`/orgs/${testOrg.slug}/jobs`);

    // Each stage should show status counts
    const stages = ['Sourcing', 'Scraping', 'Analyzing'];

    for (const stage of stages) {
      // Find the stage section
      const stageSection = page.locator('div').filter({ hasText: stage }).first();
      if (await stageSection.isVisible().catch(() => false)) {
        // Should have status indicators
        await expect(stageSection.getByText(/queued/i)).toBeVisible();
        await expect(stageSection.getByText(/running/i)).toBeVisible();
        await expect(stageSection.getByText(/complete/i)).toBeVisible();
        await expect(stageSection.getByText(/failed/i)).toBeVisible();
      }
    }
  });

  test('should display progress bars for each stage', async ({ page }) => {
    await page.goto(`/orgs/${testOrg.slug}/jobs`);

    // Progress bars should be visible
    const progressBars = page.locator('[role="progressbar"], [class*="Progress"]');
    const count = await progressBars.count();

    // Should have at least 3 progress bars (one per stage)
    expect(count).toBeGreaterThanOrEqual(3);
  });

  test('should display recent jobs section', async ({ page }) => {
    await page.goto(`/orgs/${testOrg.slug}/jobs`);

    // Should have recent jobs section
    await expect(page.getByText(/recent.*jobs/i)).toBeVisible();
  });

  test('should show job details with status badge', async ({ page }) => {
    await page.goto(`/orgs/${testOrg.slug}/jobs`);

    // Check for job list items
    const jobItems = page.locator('[class*="bg-zinc-800"][class*="rounded"]');
    const hasJobs = await jobItems.first().isVisible().catch(() => false);

    if (hasJobs) {
      // Jobs should have status badges
      const statusBadges = page.locator('[class*="Badge"], [class*="badge"]');
      await expect(statusBadges.first()).toBeVisible();
    } else {
      // Empty state
      await expect(page.getByText(/no jobs/i)).toBeVisible();
    }
  });

  test('should show job type labels', async ({ page }) => {
    await page.goto(`/orgs/${testOrg.slug}/jobs`);

    // Job types should be displayed
    const jobLabels = ['Sourcing', 'Scraping', 'Analyzing'];
    const visibleLabels = [];

    for (const label of jobLabels) {
      const isVisible = await page.getByText(label).first().isVisible().catch(() => false);
      if (isVisible) {
        visibleLabels.push(label);
      }
    }

    // At least the stage headers should be visible
    expect(visibleLabels.length).toBeGreaterThanOrEqual(3);
  });

  test('should have responsive layout', async ({ page }) => {
    await page.goto(`/orgs/${testOrg.slug}/jobs`);

    // Desktop view - stages should be in grid
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.waitForTimeout(500);

    // Mobile view - should still render
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(500);

    // Page should still be visible
    await expect(page.getByText(/jobs/i).first()).toBeVisible();
  });
});
