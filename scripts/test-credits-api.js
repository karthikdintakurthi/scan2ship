#!/usr/bin/env node

/**
 * Comprehensive Credits API Test Script
 * Tests all credits-related endpoints to ensure they work correctly
 */

const http = require('http');

const BASE_URL = 'http://localhost:3000';
let authToken = null;

// Test data
const testUser = {
  email: 'test@example.com',
  password: 'test123'
};

// Helper function to make HTTP requests
function makeRequest(method, path, data = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        try {
          const response = {
            statusCode: res.statusCode,
            headers: res.headers,
            body: body ? JSON.parse(body) : null
          };
          resolve(response);
        } catch (error) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: body,
            parseError: error.message
          });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

// Test functions
async function testLogin() {
  console.log('\n🔐 Testing Login Endpoint...');
  
  try {
    const response = await makeRequest('POST', '/api/auth/login', testUser);
    
    if (response.statusCode === 200 && response.body && response.body.user) {
      console.log('✅ Login successful');
      console.log(`   User ID: ${response.body.user.id}`);
      console.log(`   Client ID: ${response.body.user.clientId}`);
      
      // Extract token for subsequent tests
      if (response.body.session && response.body.session.token) {
        authToken = response.body.session.token;
        console.log('✅ Auth token extracted');
      } else {
        console.log('❌ No auth token found in response');
      }
      
      return true;
    } else {
      console.log('❌ Login failed');
      console.log(`   Status: ${response.statusCode}`);
      console.log(`   Response: ${JSON.stringify(response.body, null, 2)}`);
      return false;
    }
  } catch (error) {
    console.log('❌ Login request failed:', error.message);
    return false;
  }
}

async function testCreditsWithoutAuth() {
  console.log('\n💰 Testing Credits Endpoint (No Auth)...');
  
  try {
    const response = await makeRequest('GET', '/api/credits');
    
    if (response.statusCode === 401 && response.body && response.body.error === 'Unauthorized') {
      console.log('✅ Properly returns Unauthorized without token');
      return true;
    } else {
      console.log('❌ Unexpected response without auth');
      console.log(`   Status: ${response.statusCode}`);
      console.log(`   Response: ${JSON.stringify(response.body, null, 2)}`);
      return false;
    }
  } catch (error) {
    console.log('❌ Credits request failed:', error.message);
    return false;
  }
}

async function testCreditsWithAuth() {
  console.log('\n💰 Testing Credits Endpoint (With Auth)...');
  
  if (!authToken) {
    console.log('❌ No auth token available');
    return false;
  }
  
  try {
    const response = await makeRequest('GET', '/api/credits', null, {
      'Authorization': `Bearer ${authToken}`
    });
    
    if (response.statusCode === 200 && response.body && response.body.success) {
      console.log('✅ Credits retrieved successfully');
      console.log(`   Balance: ${response.body.data.balance}`);
      console.log(`   Total Added: ${response.body.data.totalAdded}`);
      console.log(`   Total Used: ${response.body.data.totalUsed}`);
      return true;
    } else {
      console.log('❌ Failed to retrieve credits');
      console.log(`   Status: ${response.statusCode}`);
      console.log(`   Response: ${JSON.stringify(response.body, null, 2)}`);
      return false;
    }
  } catch (error) {
    console.log('❌ Credits request failed:', error.message);
    return false;
  }
}

async function testTransactionsWithoutAuth() {
  console.log('\n📊 Testing Transactions Endpoint (No Auth)...');
  
  try {
    const response = await makeRequest('GET', '/api/credits/transactions');
    
    if (response.statusCode === 401 && response.body && response.body.error === 'Unauthorized') {
      console.log('✅ Properly returns Unauthorized without token');
      return true;
    } else {
      console.log('❌ Unexpected response without auth');
      console.log(`   Status: ${response.statusCode}`);
      console.log(`   Response: ${JSON.stringify(response.body, null, 2)}`);
      return false;
    }
  } catch (error) {
    console.log('❌ Transactions request failed:', error.message);
    return false;
  }
}

async function testTransactionsWithAuth() {
  console.log('\n📊 Testing Transactions Endpoint (With Auth)...');
  
  if (!authToken) {
    console.log('❌ No auth token available');
    return false;
  }
  
  try {
    const response = await makeRequest('GET', '/api/credits/transactions', null, {
      'Authorization': `Bearer ${authToken}`
    });
    
    if (response.statusCode === 200 && response.body && response.body.success) {
      console.log('✅ Transactions retrieved successfully');
      console.log(`   Total transactions: ${response.body.pagination.total}`);
      console.log(`   Page: ${response.body.pagination.page}`);
      return true;
    } else {
      console.log('❌ Failed to retrieve transactions');
      console.log(`   Status: ${response.statusCode}`);
      console.log(`   Response: ${JSON.stringify(response.body, null, 2)}`);
      return false;
    }
  } catch (error) {
    console.log('❌ Transactions request failed:', error.message);
    return false;
  }
}

async function testVerifyPaymentWithoutAuth() {
  console.log('\n💳 Testing Verify Payment Endpoint (No Auth)...');
  
  try {
    const response = await makeRequest('POST', '/api/credits/verify-payment', {
      amount: 100,
      transactionRef: 'TEST123'
    });
    
    if (response.statusCode === 401 && response.body && response.body.error === 'Unauthorized') {
      console.log('✅ Properly returns Unauthorized without token');
      return true;
    } else {
      console.log('❌ Unexpected response without auth');
      console.log(`   Status: ${response.statusCode}`);
      console.log(`   Response: ${JSON.stringify(response.body, null, 2)}`);
      return false;
    }
  } catch (error) {
    console.log('❌ Verify payment request failed:', error.message);
    return false;
  }
}

async function testVerifyPaymentWithAuth() {
  console.log('\n💳 Testing Verify Payment Endpoint (With Auth)...');
  
  if (!authToken) {
    console.log('❌ No auth token available');
    return false;
  }
  
  try {
    const response = await makeRequest('POST', '/api/credits/verify-payment', {
      amount: 100,
      transactionRef: 'TEST123'
    }, {
      'Authorization': `Bearer ${authToken}`
    });
    
    if (response.statusCode === 200 && response.body) {
      console.log('✅ Verify payment endpoint working');
      console.log(`   Response: ${JSON.stringify(response.body, null, 2)}`);
      return true;
    } else {
      console.log('❌ Verify payment failed');
      console.log(`   Status: ${response.statusCode}`);
      console.log(`   Response: ${JSON.stringify(response.body, null, 2)}`);
      return false;
    }
  } catch (error) {
    console.log('❌ Verify payment request failed:', error.message);
    return false;
  }
}

async function testInvalidToken() {
  console.log('\n🚫 Testing Invalid Token...');
  
  try {
    const response = await makeRequest('GET', '/api/credits', null, {
      'Authorization': 'Bearer invalid-token-123'
    });
    
    if (response.statusCode === 401) {
      console.log('✅ Properly rejects invalid token');
      return true;
    } else {
      console.log('❌ Unexpected response with invalid token');
      console.log(`   Status: ${response.statusCode}`);
      console.log(`   Response: ${JSON.stringify(response.body, null, 2)}`);
      return false;
    }
  } catch (error) {
    console.log('❌ Invalid token test failed:', error.message);
    return false;
  }
}

// Main test runner
async function runAllTests() {
  console.log('🧪 Starting Comprehensive Credits API Tests...\n');
  
  const tests = [
    { name: 'Login', fn: testLogin },
    { name: 'Credits (No Auth)', fn: testCreditsWithoutAuth },
    { name: 'Credits (With Auth)', fn: testCreditsWithAuth },
    { name: 'Transactions (No Auth)', fn: testTransactionsWithoutAuth },
    { name: 'Transactions (With Auth)', fn: testTransactionsWithAuth },
    { name: 'Verify Payment (No Auth)', fn: testVerifyPaymentWithoutAuth },
    { name: 'Verify Payment (With Auth)', fn: testVerifyPaymentWithAuth },
    { name: 'Invalid Token', fn: testInvalidToken }
  ];
  
  let passedTests = 0;
  let totalTests = tests.length;
  
  for (const test of tests) {
    try {
      const result = await test.fn();
      if (result) {
        passedTests++;
      }
    } catch (error) {
      console.log(`❌ ${test.name} test crashed:`, error.message);
    }
  }
  
  // Final summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST RESULTS SUMMARY');
  console.log('='.repeat(60));
  console.log(`✅ Passed: ${passedTests}/${totalTests}`);
  console.log(`❌ Failed: ${totalTests - passedTests}/${totalTests}`);
  
  if (passedTests === totalTests) {
    console.log('\n🎉 ALL TESTS PASSED! The Credits API is working perfectly!');
    console.log('\n🔒 Security Features Verified:');
    console.log('   • Authentication required for protected endpoints');
    console.log('   • Proper JWT token validation');
    console.log('   • Unauthorized access properly blocked');
    console.log('   • No 500 errors or crashes');
  } else {
    console.log('\n⚠️  Some tests failed. Please review the output above.');
    process.exit(1);
  }
}

// Run tests
runAllTests().catch(error => {
  console.error('❌ Test runner failed:', error);
  process.exit(1);
});
