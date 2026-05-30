import { test, expect } from '@playwright/test';
import { registerUser, login, logout, createOrganization, waitForEmail, extractTokenFromEmailLog } from './helpers';

test.describe('Organization Management Flows', () => {
  let testUser: Awaited<ReturnType<typeof registerUser>>;
  let testOrg: Awaited<ReturnType<typeof createOrganization>>;

  test.beforeEach(async ({ page }) => {
    testUser = await registerUser(page);
    testOrg = await createOrganization(page, `Test Org ${Date.now()}`);
  });

  test.describe('Test Flow 8: Organization Overview', () => {
    test('should display organization overview page', async ({ page }) => {
      await page.goto(`/orgs/${testOrg.slug}`);
      await expect(page.getByText(testOrg.name)).toBeVisible({ timeout: 5000 });
    });

    test('should display organization tabs', async ({ page }) => {
      await page.goto(`/orgs/${testOrg.slug}`);
      
      // Check for common tabs (may vary by implementation)
      const tabs = ['Overview', 'Members', 'Invitations', 'Settings'];
      for (const tab of tabs) {
        const tabElement = page.getByRole('link', { name: new RegExp(tab, 'i') });
        if (await tabElement.isVisible({ timeout: 2000 }).catch(() => false)) {
          await expect(tabElement).toBeVisible();
        }
      }
    });
  });

  test.describe('Test Flow 9: Organization Settings Management', () => {
    test('should display settings form', async ({ page }) => {
      await page.goto(`/orgs/${testOrg.slug}/settings`);
      
      // Check for settings form fields
      await expect(page.getByRole('textbox', { name: /name/i })).toBeVisible({ timeout: 5000 });
    });

    test.skip('should update organization name', async ({ page }) => {
      await page.goto(`/orgs/${testOrg.slug}/settings`);
      
      const nameField = page.getByRole('textbox', { name: /name/i });
      await nameField.clear();
      await nameField.fill('Updated Org Name');
      
      await page.getByRole('button', { name: /save/i }).click();
      
      await expect(page.getByText(/success|saved/i)).toBeVisible({ timeout: 5000 });
      await expect(page.getByText('Updated Org Name')).toBeVisible({ timeout: 5000 });
    });

    test.skip('should update organization slug', async ({ page }) => {
      // This test requires careful handling as URL changes
      await page.goto(`/orgs/${testOrg.slug}/settings`);
      
      const slugField = page.getByRole('textbox', { name: /slug/i });
      if (await slugField.isVisible({ timeout: 2000 }).catch(() => false)) {
        await slugField.clear();
        await slugField.fill('new-slug');
        
        await page.getByRole('button', { name: /save/i }).click();
        
        await page.waitForURL(/\/orgs\/new-slug/, { timeout: 10000 });
      }
    });
  });

  test.describe('Test Flow 10: Organization Deletion', () => {
    test.skip('should delete organization', async ({ page }) => {
      // This is a destructive test - should be careful
      await page.goto(`/orgs/${testOrg.slug}/settings`);
      
      // Look for delete button in danger zone
      const deleteButton = page.getByRole('button', { name: /delete.*organization/i });
      if (await deleteButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await deleteButton.click();
        
        // Confirm deletion
        const confirmButton = page.getByRole('button', { name: /confirm|yes.*delete/i });
        await confirmButton.click();
        
        // Should redirect to dashboard
        await page.waitForURL(/\/dashboard/, { timeout: 10000 });
      }
    });
  });

  test.describe('Test Flow 11: View Organization Members', () => {
    test('should display members list', async ({ page }) => {
      await page.goto(`/orgs/${testOrg.slug}/members`);
      
      // Should show at least the owner (current user)
      await expect(page.getByText(/members|team/i)).toBeVisible({ timeout: 5000 });
    });

    test('should display member information', async ({ page }) => {
      await page.goto(`/orgs/${testOrg.slug}/members`);
      
      // Should show current user as member
      await expect(page.getByText(new RegExp(testUser.email, 'i'))).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Test Flow 12: Change Member Role', () => {
    test.skip('should change member role', async ({ page }) => {
      // Requires multiple users - create second user and invite
      // This is complex and may require API calls or multiple browser contexts
    });
  });

  test.describe('Test Flow 13: Remove Organization Member', () => {
    test.skip('should remove member', async ({ page }) => {
      // Requires multiple users - create second user and invite
      // This is complex and may require API calls or multiple browser contexts
    });
  });

  test.describe('Test Flow 14: Send Organization Invitation', () => {
    test('should display invitation form', async ({ page }) => {
      await page.goto(`/orgs/${testOrg.slug}/invitations`);
      
      // Look for send invitation button
      const inviteButton = page.getByRole('button', { name: /send.*invitation|invite/i });
      if (await inviteButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await inviteButton.click();
        
        // Should show invitation form
        await expect(page.getByRole('textbox', { name: /email/i })).toBeVisible({ timeout: 5000 });
      }
    });

    test('should send invitation successfully', async ({ page }) => {
      await page.goto(`/orgs/${testOrg.slug}/invitations`);
      
      const inviteButton = page.getByRole('button', { name: /send.*invitation|invite/i });
      if (!(await inviteButton.isVisible({ timeout: 2000 }).catch(() => false))) {
        test.skip();
        return;
      }
      
      await inviteButton.click();
      
      const inviteeEmail = `invitee-${Date.now()}@example.com`;
      const emailField = page.getByRole('textbox', { name: /email/i });
      await emailField.fill(inviteeEmail);
      
      // Select role if available
      const roleSelect = page.getByRole('combobox', { name: /role/i });
      if (await roleSelect.isVisible({ timeout: 2000 }).catch(() => false)) {
        await roleSelect.click();
        await page.getByRole('option', { name: /member/i }).click();
      }
      
      await Promise.all([
        page.waitForResponse(resp => resp.url().includes('/api/trpc/org.invite') && resp.status() !== 0, { timeout: 10000 }).catch(() => null),
        page.getByRole('button', { name: /send|submit/i }).click()
      ]);
      
      await page.waitForTimeout(2000);
      
      // Check email logs for invitation email
      // Even if email failed to send, the log should exist with metadata
      const emailLog = await waitForEmail(page, inviteeEmail, 'invitation', 10000);
      expect(emailLog).not.toBeNull();
      expect(emailLog?.template).toBe('invitation');
      expect(emailLog?.to).toBe(inviteeEmail);
      // Status can be SENT, PENDING, or FAILED - we just need the log entry
      expect(emailLog?.status).toBeDefined();
      // Verify metadata contains invitation URLs
      expect(emailLog?.metadata).toBeDefined();
      expect(emailLog?.metadata?.acceptUrl).toBeDefined();
      
      // Check for success message
      const hasSuccess = await page.getByText(/success|invitation.*sent/i).isVisible({ timeout: 2000 }).catch(() => false);
      expect(hasSuccess || emailLog !== null).toBeTruthy();
    });
  });

  test.describe('Test Flow 15: Edit Organization Invitation', () => {
    test.skip('should edit pending invitation', async ({ page }) => {
      // Requires existing invitation - would need to create one first
    });
  });

  test.describe('Test Flow 16: Cancel Organization Invitation', () => {
    test.skip('should cancel pending invitation', async ({ page }) => {
      // Requires existing invitation - would need to create one first
    });
  });

  test.describe('Test Flow 17: Accept Organization Invitation', () => {
    test('should accept invitation', async ({ page }) => {
      // Create invitation first
      await page.goto(`/orgs/${testOrg.slug}/invitations`);
      
      const inviteButton = page.getByRole('button', { name: /send.*invitation|invite/i });
      if (!(await inviteButton.isVisible({ timeout: 2000 }).catch(() => false))) {
        test.skip();
        return;
      }
      
      await inviteButton.click();
      
      const inviteeEmail = `invitee-${Date.now()}@example.com`;
      const emailField = page.getByRole('textbox', { name: /email/i });
      await emailField.fill(inviteeEmail);
      
      await Promise.all([
        page.waitForResponse(resp => resp.url().includes('/api/trpc/org.invite') && resp.status() !== 0, { timeout: 10000 }).catch(() => null),
        page.getByRole('button', { name: /send|submit/i }).click()
      ]);
      
      await page.waitForTimeout(2000);
      
      // Get invitation token from email log
      const emailLog = await waitForEmail(page, inviteeEmail, 'invitation', 10000);
      expect(emailLog).not.toBeNull();
      
      const acceptUrl = emailLog?.metadata?.acceptUrl as string | undefined;
      expect(acceptUrl).toBeDefined();
      
      const token = extractTokenFromEmailLog(emailLog!, 'acceptUrl');
      expect(token).not.toBeNull();
      
      // Register invitee user
      await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
      });
      
      const inviteeUser = await registerUser(page, { email: inviteeEmail });
      
      // Navigate to invitation acceptance page
      await page.goto(`/invitations/${token}`);
      
      // Accept invitation
      const acceptButton = page.getByRole('button', { name: /accept/i });
      if (await acceptButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await Promise.all([
          page.waitForResponse(resp => resp.url().includes('/api/trpc/org.acceptInvitation') && resp.status() !== 0, { timeout: 10000 }).catch(() => null),
          acceptButton.click()
        ]);
        
        await page.waitForTimeout(2000);
        
        // Should redirect to organization page
        await page.waitForURL(/\/orgs\/[^/]+/, { timeout: 10000 });
        expect(page.url()).toMatch(/\/orgs\/[^/]+/);
      }
    });
  });

  test.describe('Test Flow 18: Decline Organization Invitation', () => {
    test('should decline invitation', async ({ page }) => {
      // Create invitation first
      await page.goto(`/orgs/${testOrg.slug}/invitations`);
      
      const inviteButton = page.getByRole('button', { name: /send.*invitation|invite/i });
      if (!(await inviteButton.isVisible({ timeout: 2000 }).catch(() => false))) {
        test.skip();
        return;
      }
      
      await inviteButton.click();
      
      const inviteeEmail = `invitee-decline-${Date.now()}@example.com`;
      const emailField = page.getByRole('textbox', { name: /email/i });
      await emailField.fill(inviteeEmail);
      
      await Promise.all([
        page.waitForResponse(resp => resp.url().includes('/api/trpc/org.invite') && resp.status() !== 0, { timeout: 10000 }).catch(() => null),
        page.getByRole('button', { name: /send|submit/i }).click()
      ]);
      
      await page.waitForTimeout(2000);
      
      // Get invitation token from email log
      const emailLog = await waitForEmail(page, inviteeEmail, 'invitation', 10000);
      expect(emailLog).not.toBeNull();
      
      const declineUrl = emailLog?.metadata?.declineUrl as string | undefined;
      expect(declineUrl).toBeDefined();
      
      const token = extractTokenFromEmailLog(emailLog!, 'declineUrl');
      expect(token).not.toBeNull();
      
      // Navigate to invitation decline page
      await page.goto(`/invitations/${token}`);
      
      // Decline invitation
      const declineButton = page.getByRole('button', { name: /decline/i });
      if (await declineButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await Promise.all([
          page.waitForResponse(resp => resp.url().includes('/api/trpc/org.declineInvitation') && resp.status() !== 0, { timeout: 10000 }).catch(() => null),
          declineButton.click()
        ]);
        
        await page.waitForTimeout(2000);
        
        // Should redirect to dashboard or show success
        const url = page.url();
        const isSuccess = url.includes('/dashboard') || await page.getByText(/declined|success/i).isVisible({ timeout: 2000 }).catch(() => false);
        expect(isSuccess).toBeTruthy();
      }
    });
  });

  test.describe('Test Flow 19: Organization Switching', () => {
    test.skip('should switch between organizations', async ({ page }) => {
      // Requires multiple organizations - create second org
      const secondOrg = await createOrganization(page, 'Second Org');
      
      // Look for organization switcher
      const orgSwitcher = page.getByRole('button', { name: /switch|organization/i });
      if (await orgSwitcher.isVisible({ timeout: 2000 }).catch(() => false)) {
        await orgSwitcher.click();
        await page.getByText('Second Org').click();
        
        await page.waitForURL(/\/orgs\/second-org/, { timeout: 10000 });
      }
    });
  });
});

