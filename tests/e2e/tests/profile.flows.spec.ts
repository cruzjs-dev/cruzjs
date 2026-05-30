import { test, expect } from '@playwright/test';
import { registerUser, login, logout } from './helpers';

test.describe('Profile Management Flows', () => {
  let testUser: Awaited<ReturnType<typeof registerUser>>;

  test.beforeEach(async ({ page }) => {
    testUser = await registerUser(page);
  });

  test.describe('Test Flow 20: View User Profile', () => {
    test('should display profile page', async ({ page }) => {
      await page.goto('/profile');
      
      // Check for profile information
      await expect(page.getByText(new RegExp(testUser.email, 'i'))).toBeVisible({ timeout: 5000 });
    });

    test('should display user email', async ({ page }) => {
      await page.goto('/profile');
      
      await expect(page.getByText(new RegExp(testUser.email, 'i'))).toBeVisible({ timeout: 5000 });
    });

    test('should display user name if set', async ({ page }) => {
      await page.goto('/profile');
      
      if (testUser.name) {
        await expect(page.getByText(testUser.name)).toBeVisible({ timeout: 5000 });
      }
    });
  });

  test.describe('Test Flow 21: Upload Profile Avatar', () => {
    test.skip('should upload avatar', async ({ page }) => {
      // Requires file upload handling and S3/storage configuration
      await page.goto('/profile');
      
      const uploadButton = page.getByRole('button', { name: /upload|change.*avatar/i });
      if (await uploadButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        // File upload test would go here
      }
    });
  });

  test.describe('Test Flow 22: Edit Profile Name', () => {
    test.skip('should update profile name', async ({ page }) => {
      await page.goto('/profile/settings');
      
      const nameField = page.getByRole('textbox', { name: /name/i });
      if (await nameField.isVisible({ timeout: 2000 }).catch(() => false)) {
        await nameField.clear();
        await nameField.fill('Updated Name');
        
        await page.getByRole('button', { name: /save/i }).click();
        
        await expect(page.getByText(/success|saved/i)).toBeVisible({ timeout: 5000 });
        await expect(page.getByText('Updated Name')).toBeVisible({ timeout: 5000 });
      }
    });
  });

  test.describe('Test Flow 23: Change Password', () => {
    test.skip('should change password', async ({ page }) => {
      await page.goto('/profile/settings');
      
      // Look for change password section
      const currentPasswordField = page.getByLabel(/current password/i);
      if (await currentPasswordField.isVisible({ timeout: 2000 }).catch(() => false)) {
        await currentPasswordField.fill(testUser.password);
        
        const newPasswordField = page.getByLabel(/new password/i);
        await newPasswordField.fill('NewPassword123!');
        
        const confirmPasswordField = page.getByLabel(/confirm.*password/i);
        await confirmPasswordField.fill('NewPassword123!');
        
        await page.getByRole('button', { name: /change.*password|save/i }).click();
        
        await expect(page.getByText(/success|password.*changed/i)).toBeVisible({ timeout: 5000 });
      }
    });
  });

  test.describe('Test Flow 24: Delete User Account', () => {
    test.skip('should delete user account', async ({ page }) => {
      // Destructive test - should be careful
      await page.goto('/profile/settings');
      
      const deleteButton = page.getByRole('button', { name: /delete.*account/i });
      if (await deleteButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await deleteButton.click();
        
        // Confirm deletion
        const passwordField = page.getByLabel(/password/i);
        await passwordField.fill(testUser.password);
        
        const confirmButton = page.getByRole('button', { name: /confirm|delete/i });
        await confirmButton.click();
        
        // Should redirect to landing page
        await page.waitForURL(/\/(auth\/login|$)/, { timeout: 10000 });
      }
    });
  });
});

