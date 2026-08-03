import { test, expect } from '@playwright/test';

test.describe('Aether Collaboration Workspace E2E tests', () => {
  test('should render registration page layout and forms', async ({ page }) => {
    // Navigate to local register page
    await page.goto('http://localhost:3000/register');
    
    // Verify register layouts
    await expect(page.locator('h1')).toContainText('Create your account');
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('should render login page layout and forms', async ({ page }) => {
    // Navigate to local login page
    await page.goto('http://localhost:3000/login');
    
    // Verify login layouts
    await expect(page.locator('h1')).toContainText('Sign in to Aether');
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });
});
