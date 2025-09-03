import { test, expect } from '@playwright/test';

test.describe('Playwright Setup Verification', () => {
  test('Basic setup verification', async ({ page }) => {
    console.log('🧪 [SETUP_VERIFY] Starting Playwright setup verification...');
    
    // Test basic page navigation
    await page.goto('/');
    console.log('✅ [SETUP_VERIFY] Successfully navigated to home page');
    
    // Verify page loaded
    await expect(page).toHaveTitle(/Scan2Ship/);
    console.log('✅ [SETUP_VERIFY] Page title verified');
    
    // Test basic page content
    const body = page.locator('body');
    await expect(body).toBeVisible();
    console.log('✅ [SETUP_VERIFY] Page body is visible');
    
    console.log('🎉 [SETUP_VERIFY] ===== SETUP VERIFICATION COMPLETED ====');
  });

  test('Environment check', async () => {
    console.log('🔍 [SETUP_VERIFY] Checking environment...');
    
    // Check if we're in a test environment
    expect(process.env.NODE_ENV).toBeDefined();
    console.log('✅ [SETUP_VERIFY] NODE_ENV is set:', process.env.NODE_ENV);
    
    // Check if we can access the base URL
    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    console.log('✅ [SETUP_VERIFY] Base URL configured:', baseUrl);
    
    console.log('🎉 [SETUP_VERIFY] ===== ENVIRONMENT CHECK COMPLETED ====');
  });
});
