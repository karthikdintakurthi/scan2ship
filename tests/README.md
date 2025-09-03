# Playwright Tests for Order ID Prefix Functionality

This directory contains Playwright tests that verify the Order ID Prefix checkbox functionality in the admin client settings.

## Test Overview

The `order-id-prefix-checkbox.spec.ts` test file contains comprehensive tests that simulate the exact user scenario:

1. **Login as master admin**
2. **Navigate to client settings** for `client-1756297715470-3hwkwcugb`
3. **Uncheck the "Enable Order ID Prefix" checkbox**
4. **Save the configuration**
5. **Refresh the page** to verify persistence
6. **Verify the checkbox remains unchecked**

## Prerequisites

- Node.js 18+ installed
- Access to the database with the test client
- Master admin credentials configured

## Installation

1. **Install Playwright:**
   ```bash
   npm install @playwright/test
   ```

2. **Install Playwright browsers:**
   ```bash
   npx playwright install
   ```

## Running Tests

### Option 1: Using the test runner script
```bash
node scripts/run-playwright-test.js
```

### Option 2: Using npm scripts
```bash
# Run all tests
npm run test

# Run with UI
npm run test:ui

# Run in headed mode (see browser)
npm run test:headed

# Run in debug mode
npm run test:debug

# Show test report
npm run test:report
```

### Option 3: Direct Playwright commands
```bash
# Run the specific test file
npx playwright test tests/order-id-prefix-checkbox.spec.ts

# Run with headed mode
npx playwright test tests/order-id-prefix-checkbox.spec.ts --headed

# Run with UI
npx playwright test tests/order-id-prefix-checkbox.spec.ts --ui
```

## Test Configuration

The tests are configured in `playwright.config.ts` with:

- **Base URL**: `http://localhost:3000` (configurable via `BASE_URL` env var)
- **Web Server**: Automatically starts `npm run dev` before tests
- **Browsers**: Tests run against Chromium, Firefox, and WebKit
- **Screenshots**: Taken on test failure
- **Videos**: Recorded on test failure
- **Traces**: Collected on retry

## Environment Variables

Set these environment variables for the tests:

```bash
# Master admin credentials
MASTER_ADMIN_EMAIL=admin@scan2ship.com
MASTER_ADMIN_PASSWORD=admin123

# Base URL (optional, defaults to localhost:3000)
BASE_URL=http://localhost:3000
```

## Test Structure

The test suite contains three main tests:

### 1. Main Functionality Test
- Tests the complete checkbox workflow
- Verifies state persistence
- Tests both unchecking and re-checking

### 2. Reference Number Generation Test
- Verifies the Order ID Settings indicator on the order form
- Shows how the setting affects the UI

### 3. API Endpoint Test
- Verifies API responses contain correct data
- Tests both admin and order config endpoints

## What the Tests Verify

✅ **Frontend State Management**
- Checkbox changes update local state correctly
- Save button becomes enabled when changes are made

✅ **API Integration**
- Save operations send correct data to backend
- Success messages are displayed
- Error handling works properly

✅ **Data Persistence**
- Changes are saved to database
- Page refresh loads correct state
- Checkbox state persists across sessions

✅ **UI Behavior**
- Checkbox reflects database state correctly
- Reference number format text updates
- Order ID Settings indicator shows current state

## Troubleshooting

### Common Issues

1. **Login Failed**
   - Check master admin credentials
   - Ensure the user has admin/master_admin role

2. **Client Not Found**
   - Verify the client ID exists in the database
   - Check database connection

3. **Page Not Loading**
   - Ensure the dev server is running
   - Check for JavaScript errors in console

4. **Test Timeouts**
   - Increase timeout values in the test
   - Check network performance

### Debug Mode

Run tests in debug mode to step through them:

```bash
npm run test:debug
```

This will:
- Open Playwright Inspector
- Allow step-by-step execution
- Show detailed state information

### Headed Mode

Run tests with visible browser:

```bash
npm run test:headed
```

This allows you to see exactly what the tests are doing.

## Expected Results

When the tests pass successfully, you should see:

```
✅ [PLAYWRIGHT] ===== TEST COMPLETED SUCCESSFULLY =====
✅ [PLAYWRIGHT] - User unchecked the checkbox
✅ [PLAYWRIGHT] - Value saved as false in database
✅ [PLAYWRIGHT] - Page refresh shows correct data
✅ [PLAYWRIGHT] - Checkbox shows as unchecked
```

## Integration with CI/CD

The tests are configured to work in CI environments:

- **Retries**: 2 retries on CI, 0 locally
- **Workers**: 1 worker on CI for stability
- **Screenshots/Videos**: Automatically captured on failure
- **Traces**: Collected for debugging failed tests

## Support

If you encounter issues:

1. Check the browser console for JavaScript errors
2. Verify database connectivity
3. Ensure all environment variables are set
4. Run in debug mode to step through the test
5. Check the test report for detailed failure information
