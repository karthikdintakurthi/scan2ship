#!/usr/bin/env node

const { execSync } = require('child_process');
const path = require('path');

console.log('🧪 [PLAYWRIGHT_RUNNER] ===== ORDER ID PREFIX PLAYWRIGHT TEST ====');
console.log('🔍 [PLAYWRIGHT_RUNNER] This script will run the Playwright test for Order ID Prefix functionality');

try {
  // Check if Playwright is installed
  console.log('📋 [PLAYWRIGHT_RUNNER] Step 1: Checking Playwright installation...');
  
  try {
    require.resolve('@playwright/test');
    console.log('✅ [PLAYWRIGHT_RUNNER] Playwright is installed');
  } catch (error) {
    console.log('⚠️ [PLAYWRIGHT_RUNNER] Playwright not found, installing...');
    execSync('npm install @playwright/test', { stdio: 'inherit' });
    console.log('✅ [PLAYWRIGHT_RUNNER] Playwright installed successfully');
  }

  // Install Playwright browsers
  console.log('📋 [PLAYWRIGHT_RUNNER] Step 2: Installing Playwright browsers...');
  execSync('npx playwright install', { stdio: 'inherit' });
  console.log('✅ [PLAYWRIGHT_RUNNER] Playwright browsers installed');

  // Check if the test file exists
  const testPath = path.join(__dirname, '..', 'tests', 'order-id-prefix-checkbox.spec.ts');
  console.log('📋 [PLAYWRIGHT_RUNNER] Step 3: Checking test file...');
  console.log('🔍 [PLAYWRIGHT_RUNNER] Test file path:', testPath);
  
  const fs = require('fs');
  if (fs.existsSync(testPath)) {
    console.log('✅ [PLAYWRIGHT_RUNNER] Test file found');
  } else {
    throw new Error('Test file not found');
  }

  // Run the specific test
  console.log('📋 [PLAYWRIGHT_RUNNER] Step 4: Running Playwright test...');
  console.log('🔍 [PLAYWRIGHT_RUNNER] Running: npx playwright test tests/order-id-prefix-checkbox.spec.ts');
  
  execSync('npx playwright test tests/order-id-prefix-checkbox.spec.ts --headed', { 
    stdio: 'inherit',
    cwd: path.join(__dirname, '..')
  });
  
  console.log('✅ [PLAYWRIGHT_RUNNER] ===== TEST COMPLETED SUCCESSFULLY =====');
  
} catch (error) {
  console.error('❌ [PLAYWRIGHT_RUNNER] Test failed:', error.message);
  console.error('❌ [PLAYWRIGHT_RUNNER] Error details:', error);
  process.exit(1);
}
