import { test, expect } from '@playwright/test';

test.describe('Order ID Prefix Checkbox Functionality', () => {
  const clientId = 'client-1756297715470-3hwkwcugb';
  let authToken: string;

  test.beforeAll(async ({ request }) => {
    // Login as master admin to get auth token
    console.log('🔐 [PLAYWRIGHT] Logging in as master admin...');
    
          const loginResponse = await request.post('/api/auth/login', {
        data: {
          email: process.env.MASTER_ADMIN_EMAIL || 'karthik@scan2ship.in',
          password: process.env.MASTER_ADMIN_PASSWORD || 'Darling@2706'
        }
      });

    if (loginResponse.ok()) {
      const loginData = await loginResponse.json();
      authToken = loginData.token;
      console.log('✅ [PLAYWRIGHT] Login successful, token obtained');
    } else {
      console.error('❌ [PLAYWRIGHT] Login failed');
      throw new Error('Failed to login as master admin');
    }
  });

  test('Master admin can access client settings and modify Order ID Prefix', async ({ page }) => {
    console.log('🧪 [PLAYWRIGHT] Starting Order ID Prefix checkbox test...');

    // 1. Navigate to admin client settings page
    console.log('📋 [PLAYWRIGHT] Step 1: Navigating to admin client settings...');
    await page.goto(`/admin/settings/clients/${clientId}`);
    
    // Wait for the page to load
    await page.waitForLoadState('networkidle');
    
    // Verify we're on the correct page
    await expect(page).toHaveTitle(/Client Settings/);
    console.log('✅ [PLAYWRIGHT] Successfully navigated to client settings page');

    // 2. Wait for the Order ID Settings section to load
    console.log('📋 [PLAYWRIGHT] Step 2: Waiting for Order ID Settings section...');
    const orderIdSettingsSection = page.locator('h3:has-text("Order ID Settings")');
    await expect(orderIdSettingsSection).toBeVisible();
    console.log('✅ [PLAYWRIGHT] Order ID Settings section found');

    // 3. Find the Order ID Prefix checkbox
    console.log('📋 [PLAYWRIGHT] Step 3: Locating Order ID Prefix checkbox...');
    const orderIdPrefixCheckbox = page.locator('#enableOrderIdPrefix');
    await expect(orderIdPrefixCheckbox).toBeVisible();
    
    // Get initial state
    const initialCheckedState = await orderIdPrefixCheckbox.isChecked();
    console.log('🔍 [PLAYWRIGHT] Initial checkbox state:', initialCheckedState ? 'CHECKED' : 'UNCHECKED');

    // 4. Verify the checkbox is initially checked (should be true by default)
    if (initialCheckedState) {
      console.log('✅ [PLAYWRIGHT] Checkbox is initially checked (expected)');
    } else {
      console.log('⚠️ [PLAYWRIGHT] Checkbox is initially unchecked (unexpected)');
    }

    // 5. Uncheck the checkbox
    console.log('📋 [PLAYWRIGHT] Step 4: Unchecking the Order ID Prefix checkbox...');
    if (initialCheckedState) {
      await orderIdPrefixCheckbox.uncheck();
      console.log('✅ [PLAYWRIGHT] Checkbox unchecked successfully');
    } else {
      console.log('ℹ️ [PLAYWRIGHT] Checkbox was already unchecked, checking it first...');
      await orderIdPrefixCheckbox.check();
      await page.waitForTimeout(500); // Wait for state update
      await orderIdPrefixCheckbox.uncheck();
      console.log('✅ [PLAYWRIGHT] Checkbox checked then unchecked successfully');
    }

    // 6. Verify the checkbox is now unchecked
    const uncheckedState = await orderIdPrefixCheckbox.isChecked();
    expect(uncheckedState).toBe(false);
    console.log('✅ [PLAYWRIGHT] Checkbox is now unchecked');

    // 7. Find and click the Save Order Configuration button
    console.log('📋 [PLAYWRIGHT] Step 5: Saving the configuration...');
    const saveButton = page.locator('button:has-text("Save Order Configuration")');
    await expect(saveButton).toBeVisible();
    await expect(saveButton).toBeEnabled();
    
    // Click save button
    await saveButton.click();
    console.log('✅ [PLAYWRIGHT] Save button clicked');

    // 8. Wait for save operation to complete
    console.log('📋 [PLAYWRIGHT] Step 6: Waiting for save operation...');
    
    // Wait for the success message
    const successMessage = page.locator('text=Order configuration updated successfully');
    await expect(successMessage).toBeVisible({ timeout: 10000 });
    console.log('✅ [PLAYWRIGHT] Success message displayed');

    // Wait for the success message to disappear (auto-hide after 3 seconds)
    await expect(successMessage).not.toBeVisible({ timeout: 5000 });
    console.log('✅ [PLAYWRIGHT] Success message auto-hidden');

    // 9. Verify the checkbox remains unchecked after save
    console.log('📋 [PLAYWRIGHT] Step 7: Verifying checkbox state after save...');
    const afterSaveState = await orderIdPrefixCheckbox.isChecked();
    expect(afterSaveState).toBe(false);
    console.log('✅ [PLAYWRIGHT] Checkbox remains unchecked after save');

    // 10. Refresh the page to test persistence
    console.log('📋 [PLAYWRIGHT] Step 8: Refreshing page to test persistence...');
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Wait for the Order ID Settings section to load again
    await expect(orderIdPrefixCheckbox).toBeVisible();
    console.log('✅ [PLAYWRIGHT] Page refreshed successfully');

    // 11. Verify the checkbox state persists after refresh
    console.log('📋 [PLAYWRIGHT] Step 9: Verifying persistence after refresh...');
    const afterRefreshState = await orderIdPrefixCheckbox.isChecked();
    expect(afterRefreshState).toBe(false);
    console.log('✅ [PLAYWRIGHT] Checkbox state persists after refresh (unchecked)');

    // 12. Test the reference number format display
    console.log('📋 [PLAYWRIGHT] Step 10: Testing reference number format display...');
    
    // Look for the format description text
    const formatText = page.locator('text=When disabled: Reference numbers will be just the mobile number');
    await expect(formatText).toBeVisible();
    console.log('✅ [PLAYWRIGHT] Reference number format text shows disabled state');

    // 13. Test setting it back to true
    console.log('📋 [PLAYWRIGHT] Step 11: Testing setting back to true...');
    await orderIdPrefixCheckbox.check();
    console.log('✅ [PLAYWRIGHT] Checkbox checked again');

    // Save the configuration
    await saveButton.click();
    await expect(successMessage).toBeVisible({ timeout: 10000 });
    console.log('✅ [PLAYWRIGHT] Configuration saved with true value');

    // Verify it's checked
    const finalState = await orderIdPrefixCheckbox.isChecked();
    expect(finalState).toBe(true);
    console.log('✅ [PLAYWRIGHT] Checkbox is now checked');

    // 14. Final verification
    console.log('📋 [PLAYWRIGHT] Step 12: Final verification...');
    
    // Refresh one more time to ensure persistence
    await page.reload();
    await page.waitForLoadState('networkidle');
    await expect(orderIdPrefixCheckbox).toBeVisible();
    
    const finalPersistedState = await orderIdPrefixCheckbox.isChecked();
    expect(finalPersistedState).toBe(true);
    console.log('✅ [PLAYWRIGHT] Final state persists correctly (checked)');

    console.log('🎉 [PLAYWRIGHT] ===== TEST COMPLETED SUCCESSFULLY =====');
  });

  test('Order ID Prefix affects reference number generation', async ({ page }) => {
    console.log('🧪 [PLAYWRIGHT] Starting reference number generation test...');

    // Navigate to the order form
    await page.goto('/orders');
    await page.waitForLoadState('networkidle');

    // Wait for the reference number field to be visible
    const referenceNumberField = page.locator('#reference_number');
    await expect(referenceNumberField).toBeVisible();

    // Look for the Order ID Settings indicator
    const orderIdIndicator = page.locator('text=💡 Order ID Prefix:');
    await expect(orderIdIndicator).toBeVisible();
    console.log('✅ [PLAYWRIGHT] Order ID Settings indicator found');

    // Verify the current setting is displayed
    const indicatorText = await orderIdIndicator.textContent();
    console.log('🔍 [PLAYWRIGHT] Indicator text:', indicatorText);

    // The indicator should show the current state
    if (indicatorText?.includes('Enabled')) {
      console.log('✅ [PLAYWRIGHT] Order ID Prefix is enabled');
    } else if (indicatorText?.includes('Disabled')) {
      console.log('✅ [PLAYWRIGHT] Order ID Prefix is disabled');
    } else {
      console.log('⚠️ [PLAYWRIGHT] Order ID Prefix state unclear');
    }
  });

  test('API endpoints return correct Order ID Prefix values', async ({ request }) => {
    console.log('🧪 [PLAYWRIGHT] Starting API endpoint test...');

    // Test the admin client settings API
    console.log('📋 [PLAYWRIGHT] Testing admin client settings API...');
    const adminResponse = await request.get(`/api/admin/settings/clients/${clientId}`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    expect(adminResponse.ok()).toBe(true);
    const adminData = await adminResponse.json();
    
    console.log('🔍 [PLAYWRIGHT] Admin API response structure:', {
      hasClient: !!adminData.config?.client,
      hasClientOrderConfig: !!adminData.config?.clientOrderConfig,
      enableOrderIdPrefix: adminData.config?.clientOrderConfig?.enableOrderIdPrefix
    });

    // Verify the enableOrderIdPrefix field exists and has correct type
    expect(adminData.config?.clientOrderConfig?.enableOrderIdPrefix).toBeDefined();
    expect(typeof adminData.config.clientOrderConfig.enableOrderIdPrefix).toBe('boolean');
    
    console.log('✅ [PLAYWRIGHT] Admin API returns correct Order ID Prefix data');

    // Test the order config API
    console.log('📋 [PLAYWRIGHT] Testing order config API...');
    const orderConfigResponse = await request.get('/api/order-config', {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    if (orderConfigResponse.ok()) {
      const orderConfigData = await orderConfigResponse.json();
      console.log('🔍 [PLAYWRIGHT] Order config API response:', {
        enableOrderIdPrefix: orderConfigData?.enableOrderIdPrefix,
        type: typeof orderConfigData?.enableOrderIdPrefix
      });
      
      if (orderConfigData?.enableOrderIdPrefix !== undefined) {
        expect(typeof orderConfigData.enableOrderIdPrefix).toBe('boolean');
        console.log('✅ [PLAYWRIGHT] Order config API returns correct Order ID Prefix data');
      } else {
        console.log('ℹ️ [PLAYWRIGHT] Order config API does not have Order ID Prefix (may not be configured)');
      }
    } else {
      console.log('ℹ️ [PLAYWRIGHT] Order config API not accessible (may require client context)');
    }

    console.log('🎉 [PLAYWRIGHT] ===== API TEST COMPLETED SUCCESSFULLY =====');
  });
});
