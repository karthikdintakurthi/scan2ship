#!/usr/bin/env node

/**
 * Comprehensive API Endpoints Test Script
 * Tests all API endpoints to ensure they're working correctly with centralized security middleware
 */

const https = require('https');
const http = require('http');

// Configuration
const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';
const TEST_TOKEN = process.env.TEST_TOKEN || 'test-token-placeholder';

// Test results tracking
const testResults = {
  passed: 0,
  failed: 0,
  total: 0,
  details: []
};

// Helper function to make HTTP requests
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const client = isHttps ? https : http;
    
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TEST_TOKEN}`,
        ...options.headers
      }
    };

    const req = client.request(requestOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: data
        });
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (options.body) {
      req.write(JSON.stringify(options.body));
    }

    req.end();
  });
}

// Test function
async function testEndpoint(name, url, method = 'GET', body = null, expectedStatus = 401) {
  try {
    console.log(`🧪 Testing: ${name} (${method} ${url})`);
    
    const response = await makeRequest(url, {
      method,
      body
    });

    const success = response.statusCode === expectedStatus;
    
    if (success) {
      console.log(`✅ ${name}: PASSED (Status: ${response.statusCode})`);
      testResults.passed++;
    } else {
      console.log(`❌ ${name}: FAILED (Expected: ${expectedStatus}, Got: ${response.statusCode})`);
      testResults.failed++;
    }

    testResults.total++;
    testResults.details.push({
      name,
      url,
      method,
      expectedStatus,
      actualStatus: response.statusCode,
      success
    });

  } catch (error) {
    console.log(`❌ ${name}: ERROR - ${error.message}`);
    testResults.failed++;
    testResults.total++;
    testResults.details.push({
      name,
      url,
      method,
      expectedStatus,
      error: error.message,
      success: false
    });
  }
}

// Test all API endpoints
async function runAllTests() {
  console.log('🚀 Starting Comprehensive API Endpoints Test');
  console.log(`📍 Base URL: ${BASE_URL}`);
  console.log(`🔑 Test Token: ${TEST_TOKEN.substring(0, 20)}...`);
  console.log('=' .repeat(80));

  // Test endpoints that should return 401 (Unauthorized) without valid token
  const endpoints = [
    // Analytics endpoints
    { name: 'Analytics Track', url: '/api/analytics/track', method: 'POST', body: { eventType: 'test' } },
    { name: 'Analytics Clients', url: '/api/analytics/clients' },
    { name: 'Analytics Clients [ID]', url: '/api/analytics/clients/test-id' },
    { name: 'Analytics Platform', url: '/api/analytics/platform' },
    
    // Order endpoints
    { name: 'Orders List', url: '/api/orders' },
    { name: 'Orders Create', url: '/api/orders', method: 'POST', body: { name: 'Test Order' } },
    { name: 'Orders [ID]', url: '/api/orders/1' },
    { name: 'Orders Waybill', url: '/api/orders/1/waybill' },
    { name: 'Orders Shipping Label', url: '/api/orders/1/shipping-label' },
    { name: 'Orders Retry Delhivery', url: '/api/orders/1/retry-delhivery', method: 'POST' },
    
    // User endpoints
    { name: 'User Profile', url: '/api/users/profile' },
    
    // Credit endpoints
    { name: 'Credits', url: '/api/credits' },
    { name: 'Credits Transactions', url: '/api/credits/transactions' },
    { name: 'Credits Verify Payment', url: '/api/credits/verify-payment', method: 'POST', body: { transactionRef: 'test' } },
    
    // Processing endpoints
    { name: 'Process Image', url: '/api/process-image', method: 'POST', body: { imageData: 'test' } },
    { name: 'Process Text', url: '/api/process-text', method: 'POST', body: { text: 'test' } },
    { name: 'Format Address', url: '/api/format-address', method: 'POST', body: { addressText: 'test' } },
    { name: 'Format Address Image', url: '/api/format-address-image', method: 'POST', body: { image: 'test' } },
    { name: 'Validate Payment Screenshot', url: '/api/validate-payment-screenshot', method: 'POST', body: { screenshot: 'test' } },
    
    // Upload endpoint
    { name: 'Upload Files', url: '/api/upload', method: 'POST', body: { files: [] } },
    
    // Admin endpoints (should also return 401 without admin token)
    { name: 'Admin Users', url: '/api/admin/users' },
    { name: 'Admin Clients', url: '/api/admin/clients' },
    { name: 'Admin Client Configurations', url: '/api/admin/client-configurations' },
    { name: 'Admin Credits', url: '/api/admin/credits' },
    { name: 'Admin Database Health', url: '/api/admin/database-health' },
    { name: 'Admin JWT Secrets', url: '/api/admin/jwt-secrets' },
    { name: 'Admin System Config', url: '/api/admin/system-config' },
    { name: 'Admin Settings Clients [ID]', url: '/api/admin/settings/clients/test-id' },
    { name: 'Admin Clients [ID]', url: '/api/admin/clients/test-id' },
    { name: 'Admin Users [ID] Update Password', url: '/api/admin/users/test-id/update-password', method: 'PUT' },
    { name: 'Admin Clients [ID] Update Password', url: '/api/admin/clients/test-id/update-password', method: 'PUT' },
    
    // Other endpoints
    { name: 'Courier Services', url: '/api/courier-services' },
    { name: 'Pickup Locations', url: '/api/pickup-locations' },
    { name: 'Order Config', url: '/api/order-config' },
    { name: 'Validate Pincode', url: '/api/validate-pincode' },
    { name: 'PWA Manifest', url: '/api/pwa/manifest' },
    { name: 'WhatsApp Test', url: '/api/whatsapp/test', method: 'POST' },
    { name: 'Test Admin', url: '/api/test-admin' },
    { name: 'Test Auth', url: '/api/test-auth' },
    { name: 'Test Clear Cache', url: '/api/test-clear-cache', method: 'POST' }
  ];

  // Run tests sequentially to avoid overwhelming the server
  for (const endpoint of endpoints) {
    await testEndpoint(
      endpoint.name,
      `${BASE_URL}${endpoint.url}`,
      endpoint.method,
      endpoint.body
    );
    
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  // Print summary
  console.log('\n' + '=' .repeat(80));
  console.log('📊 TEST SUMMARY');
  console.log('=' .repeat(80));
  console.log(`✅ Passed: ${testResults.passed}`);
  console.log(`❌ Failed: ${testResults.failed}`);
  console.log(`📈 Total: ${testResults.total}`);
  console.log(`📊 Success Rate: ${((testResults.passed / testResults.total) * 100).toFixed(1)}%`);

  if (testResults.failed > 0) {
    console.log('\n❌ FAILED TESTS:');
    testResults.details
      .filter(test => !test.success)
      .forEach(test => {
        console.log(`  - ${test.name}: Expected ${test.expectedStatus}, got ${test.actualStatus || 'ERROR'}`);
      });
  }

  console.log('\n🎯 EXPECTED BEHAVIOR:');
  console.log('  - All endpoints should return 401 (Unauthorized) without valid authentication');
  console.log('  - This confirms centralized security middleware is working correctly');
  console.log('  - No endpoints should crash or return 500 errors');

  return testResults.failed === 0;
}

// Run tests if this script is executed directly
if (require.main === module) {
  runAllTests()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('💥 Test execution failed:', error);
      process.exit(1);
    });
}

module.exports = { runAllTests, testEndpoint };
