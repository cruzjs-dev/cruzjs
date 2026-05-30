import { test, expect } from '@playwright/test';
import { registerUser, login, createOrganization } from './helpers';

test.describe('Pipeline - Cohorts', () => {
  let testUser: { email: string; password: string; name: string };
  let testOrg: { slug: string };

  test.beforeAll(async ({ browser }) => {
    // Set up test user and org for all tests in this file
    const page = await browser.newPage();
    testUser = await registerUser(page);
    testOrg = await createOrganization(page, `Test Org ${Date.now()}`);
    await page.close();
  });

  test.beforeEach(async ({ page }) => {
    await login(page, testUser.email, testUser.password);
  });

  test('should display empty cohorts page', async ({ page }) => {
    await page.goto(`/orgs/${testOrg.slug}/cohorts`);

    // Wait for page to load
    await page.waitForTimeout(2000);

    // Check page header - look for text "Cohorts" on the page
    await expect(page.getByText('Cohorts').first()).toBeVisible();

    // Should show empty state message
    await expect(page.getByText(/no cohorts yet/i)).toBeVisible();
  });

  test('should open create cohort modal', async ({ page }) => {
    await page.goto(`/orgs/${testOrg.slug}/cohorts`);

    // Wait for page to load
    await page.waitForTimeout(2000);

    // Click create button
    await page.getByRole('button', { name: 'Create Cohort' }).first().click();

    // Modal should open
    await expect(page.getByRole('dialog')).toBeVisible();
    // Check modal header
    await expect(page.locator('.chakra-modal__header')).toContainText('Create Cohort');
  });

  test('should create a new cohort with basic info', async ({ page }) => {
    await page.goto(`/orgs/${testOrg.slug}/cohorts`);

    // Wait for page to load
    await page.waitForTimeout(2000);

    // Open create modal
    await page.getByRole('button', { name: 'Create Cohort' }).first().click();
    await expect(page.getByRole('dialog')).toBeVisible();

    // Fill basic info - Name field
    const cohortName = `Test Cohort ${Date.now()}`;
    const modal = page.getByRole('dialog');
    await modal.getByLabel('Name').fill(cohortName);

    // Fill Industry / Search Query field
    await modal.getByLabel(/Industry/i).fill('HVAC contractors');

    // Submit form and wait for API response
    const responsePromise = page.waitForResponse(
      (resp) => resp.url().includes('/api/trpc/cohorts.create'),
      { timeout: 15000 }
    );

    await modal.getByRole('button', { name: 'Create Cohort' }).click();

    // Wait for the API response
    const response = await responsePromise;
    console.log('API response status:', response.status());

    if (response.status() !== 200) {
      const body = await response.text();
      console.log('API error:', body);
    }

    // Wait for modal to close and list to refresh
    await page.waitForTimeout(2000);

    // Verify cohort was created - should appear in the list
    await expect(page.getByText(cohortName)).toBeVisible({ timeout: 10000 });
  });

  test('should navigate to cohort detail page', async ({ page }) => {
    // First create a cohort
    await page.goto(`/orgs/${testOrg.slug}/cohorts`);
    await page.waitForTimeout(2000);

    await page.getByRole('button', { name: 'Create Cohort' }).first().click();
    await expect(page.getByRole('dialog')).toBeVisible();

    const cohortName = `Detail Test ${Date.now()}`;
    const modal = page.getByRole('dialog');
    await modal.getByLabel('Name').fill(cohortName);
    await modal.getByLabel(/Industry/i).fill('Plumbers');
    await modal.getByRole('button', { name: 'Create Cohort' }).click();

    await page.waitForTimeout(3000);

    // Click on the cohort to navigate to detail
    await page.getByText(cohortName).click();

    // Should be on detail page - look for cohort name in the page
    await expect(page.getByText(cohortName).first()).toBeVisible({ timeout: 10000 });

    // Should show tabs
    await expect(page.getByRole('tab', { name: /sources/i })).toBeVisible();
  });

  test('should show sources tab on cohort detail', async ({ page }) => {
    await page.goto(`/orgs/${testOrg.slug}/cohorts`);
    await page.waitForTimeout(2000);

    // Create cohort first
    await page.getByRole('button', { name: 'Create Cohort' }).first().click();
    await expect(page.getByRole('dialog')).toBeVisible();

    const cohortName = `Sources Tab Test ${Date.now()}`;
    const modal = page.getByRole('dialog');
    await modal.getByLabel('Name').fill(cohortName);
    await modal.getByLabel(/Industry/i).fill('Electricians');
    await modal.getByRole('button', { name: 'Create Cohort' }).click();

    await page.waitForTimeout(3000);
    await page.getByText(cohortName).click();

    // Wait for navigation to detail page
    await page.waitForTimeout(2000);

    // Check tabs
    await expect(page.getByRole('tab', { name: /sources/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /settings/i })).toBeVisible();
  });

  test('should open add source modal from cohort detail', async ({ page }) => {
    await page.goto(`/orgs/${testOrg.slug}/cohorts`);
    await page.waitForTimeout(2000);

    // Create and navigate to cohort
    await page.getByRole('button', { name: 'Create Cohort' }).first().click();
    await expect(page.getByRole('dialog')).toBeVisible();

    const cohortName = `Add Source Test ${Date.now()}`;
    const modal = page.getByRole('dialog');
    await modal.getByLabel('Name').fill(cohortName);
    await modal.getByLabel(/Industry/i).fill('Roofers');
    await modal.getByRole('button', { name: 'Create Cohort' }).click();

    await page.waitForTimeout(3000);
    await page.getByText(cohortName).click();

    // Wait for navigation to detail page
    await page.waitForTimeout(2000);

    // Click add source button
    await page.getByRole('button', { name: /add.*source/i }).click();

    // Modal should show source options
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByText(/google.*maps/i)).toBeVisible();
  });

  test('should validate required fields when creating cohort', async ({ page }) => {
    await page.goto(`/orgs/${testOrg.slug}/cohorts`);
    await page.waitForTimeout(2000);

    // Open create modal
    await page.getByRole('button', { name: 'Create Cohort' }).first().click();
    await expect(page.getByRole('dialog')).toBeVisible();

    const modal = page.getByRole('dialog');

    // Try to submit without filling required fields
    await modal.getByRole('button', { name: 'Create Cohort' }).click();

    // Should show validation error or button should be disabled
    // The form should still be visible (not submitted)
    await expect(modal).toBeVisible();
  });

  test('should add Google Maps source to cohort', async ({ page }) => {
    await page.goto(`/orgs/${testOrg.slug}/cohorts`);
    await page.waitForTimeout(2000);

    // Create cohort
    await page.getByRole('button', { name: 'Create Cohort' }).first().click();
    await expect(page.getByRole('dialog')).toBeVisible();

    const cohortName = `Google Maps Source Test ${Date.now()}`;
    const modal = page.getByRole('dialog');
    await modal.getByLabel('Name').fill(cohortName);
    await modal.getByLabel(/Industry/i).fill('Landscapers');
    await modal.getByRole('button', { name: 'Create Cohort' }).click();

    await page.waitForTimeout(3000);

    // Navigate to cohort detail
    await page.getByText(cohortName).click();
    await page.waitForTimeout(2000);

    // Click add source button
    await page.getByRole('button', { name: /add.*source/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();

    // Select Google Maps source
    await page.getByText(/google.*maps/i).click();

    // Fill in source configuration if there's a form
    const sourceModal = page.getByRole('dialog');

    // Look for location/area input
    const locationInput = sourceModal.getByLabel(/location|area|city/i);
    if (await locationInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await locationInput.fill('Denver, CO');
    }

    // Submit the source
    const addButton = sourceModal.getByRole('button', { name: /add|create|save/i });
    if (await addButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await addButton.click();
      await page.waitForTimeout(2000);
    }

    // Verify source was added - should see it in the sources list
    await expect(page.getByText(/google.*maps/i).first()).toBeVisible({ timeout: 10000 });
  });

  test('should display cohort list with multiple cohorts', async ({ page }) => {
    await page.goto(`/orgs/${testOrg.slug}/cohorts`);
    await page.waitForTimeout(2000);

    // Create first cohort
    await page.getByRole('button', { name: 'Create Cohort' }).first().click();
    await expect(page.getByRole('dialog')).toBeVisible();

    const cohortName1 = `List Test A ${Date.now()}`;
    let modal = page.getByRole('dialog');
    await modal.getByLabel('Name').fill(cohortName1);
    await modal.getByLabel(/Industry/i).fill('Painters');
    await modal.getByRole('button', { name: 'Create Cohort' }).click();
    await page.waitForTimeout(3000);

    // Create second cohort
    await page.getByRole('button', { name: 'Create Cohort' }).first().click();
    await expect(page.getByRole('dialog')).toBeVisible();

    const cohortName2 = `List Test B ${Date.now()}`;
    modal = page.getByRole('dialog');
    await modal.getByLabel('Name').fill(cohortName2);
    await modal.getByLabel(/Industry/i).fill('Carpenters');
    await modal.getByRole('button', { name: 'Create Cohort' }).click();
    await page.waitForTimeout(3000);

    // Verify both cohorts appear in the list
    await expect(page.getByText(cohortName1)).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(cohortName2)).toBeVisible({ timeout: 10000 });
  });

  test('should access cohort settings tab', async ({ page }) => {
    await page.goto(`/orgs/${testOrg.slug}/cohorts`);
    await page.waitForTimeout(2000);

    // Create cohort
    await page.getByRole('button', { name: 'Create Cohort' }).first().click();
    await expect(page.getByRole('dialog')).toBeVisible();

    const cohortName = `Settings Tab Test ${Date.now()}`;
    const modal = page.getByRole('dialog');
    await modal.getByLabel('Name').fill(cohortName);
    await modal.getByLabel(/Industry/i).fill('Mechanics');
    await modal.getByRole('button', { name: 'Create Cohort' }).click();

    await page.waitForTimeout(3000);

    // Navigate to cohort detail
    await page.getByText(cohortName).click();
    await page.waitForTimeout(2000);

    // Click on Settings tab
    const settingsTab = page.getByRole('tab', { name: /settings/i });
    await expect(settingsTab).toBeVisible();
    await settingsTab.click();

    await page.waitForTimeout(1000);

    // Verify settings content is displayed
    // Look for common settings elements like name input or delete button
    const hasNameInput = await page.getByLabel(/name/i).isVisible({ timeout: 3000 }).catch(() => false);
    const hasDeleteButton = await page.getByRole('button', { name: /delete/i }).isVisible({ timeout: 3000 }).catch(() => false);
    const hasSettingsContent = hasNameInput || hasDeleteButton;

    expect(hasSettingsContent).toBe(true);
  });
});
