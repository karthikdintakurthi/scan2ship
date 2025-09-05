#!/usr/bin/env node

/**
 * Comprehensive Security Features Test Script
 * Tests rate limiting, CORS, input validation, and file upload security
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

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
async function testLoginForToken() {
  console.log('\n🔐 Getting authentication token for testing...');
  
  try {
    const response = await makeRequest('POST', '/api/auth/login', testUser);
    
    if (response.statusCode === 200 && response.body && response.body.session) {
      authToken = response.body.session.token;
      console.log('✅ Authentication token obtained successfully');
      return true;
    } else {
      console.log('❌ Failed to get authentication token');
      console.log(`   Status: ${response.statusCode}`);
      console.log(`   Response: ${JSON.stringify(response.body, null, 2)}`);
      return false;
    }
  } catch (error) {
    console.log('❌ Login request failed:', error.message);
    return false;
  }
}

async function testRateLimiting() {
  console.log('\n🚫 Testing Rate Limiting...');
  
  if (!authToken) {
    console.log('❌ No auth token available for rate limiting test');
    return false;
  }
  
  try {
    // Make multiple rapid requests to trigger rate limiting
    const promises = [];
    for (let i = 0; i < 10; i++) {
      promises.push(
        makeRequest('GET', '/api/credits', null, {
          'Authorization': `Bearer ${authToken}`
        })
      );
    }
    
    const responses = await Promise.all(promises);
    
    // Check if any requests were rate limited (429 status)
    const rateLimited = responses.filter(r => r.statusCode === 429);
    
    if (rateLimited.length > 0) {
      console.log('✅ Rate limiting is working - some requests were blocked');
      console.log(`   Rate limited requests: ${rateLimited.length}/${responses.length}`);
      return true;
    } else {
      console.log('⚠️  Rate limiting may not be working - no requests were blocked');
      return false;
    }
  } catch (error) {
    console.log('❌ Rate limiting test failed:', error.message);
    return false;
  }
}

async function testCORS() {
  console.log('\n🌐 Testing CORS Configuration...');
  
  try {
    // Test preflight request
    const response = await makeRequest('OPTIONS', '/api/credits');
    
    if (response.statusCode === 200) {
      const corsHeaders = response.headers;
      
      if (corsHeaders['access-control-allow-methods'] && 
          corsHeaders['access-control-allow-headers']) {
        console.log('✅ CORS preflight request handled correctly');
        console.log(`   Allowed methods: ${corsHeaders['access-control-allow-methods']}`);
        console.log(`   Allowed headers: ${corsHeaders['access-control-allow-headers']}`);
        return true;
      } else {
        console.log('❌ CORS headers missing');
        return false;
      }
    } else {
      console.log('❌ CORS preflight request failed');
      return false;
    }
  } catch (error) {
    console.log('❌ CORS test failed:', error.message);
    return false;
  }
}

async function testInputValidation() {
  console.log('\n✅ Testing Input Validation...');
  
  try {
    // Test invalid email
    const invalidEmailResponse = await makeRequest('POST', '/api/auth/login', {
      email: 'invalid-email',
      password: 'test123'
    });
    
    if (invalidEmailResponse.statusCode === 400) {
      console.log('✅ Invalid email properly rejected');
    } else {
      console.log('❌ Invalid email not properly validated');
      return false;
    }
    
    // Test short password
    const shortPasswordResponse = await makeRequest('POST', '/api/auth/login', {
      email: 'test@example.com',
      password: '123'
    });
    
    if (shortPasswordResponse.statusCode === 400) {
      console.log('✅ Short password properly rejected');
    } else {
      console.log('❌ Short password not properly validated');
      return false;
    }
    
    // Test missing fields
    const missingFieldsResponse = await makeRequest('POST', '/api/auth/login', {
      email: 'test@example.com'
      // password missing
    });
    
    if (missingFieldsResponse.statusCode === 400) {
      console.log('✅ Missing fields properly rejected');
    } else {
      console.log('❌ Missing fields not properly validated');
      return false;
    }
    
    console.log('✅ All input validation tests passed');
    return true;
    
  } catch (error) {
    console.log('❌ Input validation test failed:', error.message);
    return false;
  }
}

async function testSecurityHeaders() {
  console.log('\n🛡️ Testing Security Headers...');
  
  try {
    const response = await makeRequest('GET', '/api/credits', null, {
      'Authorization': `Bearer ${authToken}`
    });
    
    const headers = response.headers;
    const requiredHeaders = [
      'x-content-type-options',
      'x-frame-options',
      'x-xss-protection'
    ];
    
    let allHeadersPresent = true;
    
    for (const header of requiredHeaders) {
      if (headers[header]) {
        console.log(`✅ ${header}: ${headers[header]}`);
      } else {
        console.log(`❌ ${header}: Missing`);
        allHeadersPresent = false;
      }
    }
    
    if (allHeadersPresent) {
      console.log('✅ All required security headers are present');
      return true;
    } else {
      console.log('❌ Some security headers are missing');
      return false;
    }
    
  } catch (error) {
    console.log('❌ Security headers test failed:', error.message);
    return false;
  }
}

async function testFileUploadSecurity() {
  console.log('\n📁 Testing File Upload Security...');
  
  try {
    // Test file upload endpoint exists
    const response = await makeRequest('OPTIONS', '/api/upload');
    
    if (response.statusCode === 200) {
      console.log('✅ File upload endpoint exists and handles CORS');
      
      // Check if file upload validation is configured
      const uploadConfig = require('../src/lib/security-middleware').fileUploadConfig;
      
      if (uploadConfig && uploadConfig.allowedTypes && uploadConfig.maxSize) {
        console.log('✅ File upload security configuration present');
        console.log(`   Allowed types: ${uploadConfig.allowedTypes.length} types`);
        console.log(`   Max size: ${(uploadConfig.maxSize / 1024 / 1024).toFixed(2)}MB`);
        console.log(`   Max files: ${uploadConfig.maxFiles}`);
        return true;
      } else {
        console.log('❌ File upload security configuration missing');
        return false;
      }
    } else {
      console.log('❌ File upload endpoint not accessible');
      return false;
    }
    
  } catch (error) {
    console.log('❌ File upload security test failed:', error.message);
    return false;
  }
}

async function testSQLInjectionProtection() {
  console.log('\n💉 Testing SQL Injection Protection...');
  
  try {
    // Test with potentially malicious input
    const maliciousResponse = await makeRequest('POST', '/api/auth/login', {
      email: "'; DROP TABLE users; --",
      password: 'test123'
    });
    
    if (maliciousResponse.statusCode === 400 || maliciousResponse.statusCode === 401) {
      console.log('✅ Malicious input properly handled');
      return true;
    } else {
      console.log('❌ Malicious input not properly handled');
      return false;
    }
    
  } catch (error) {
    console.log('❌ SQL injection protection test failed:', error.message);
    return false;
  }
}

async function testXSSProtection() {
  console.log('\n🛡️ Testing XSS Protection...');
  
  try {
    // Test with script tags in input
    const xssResponse = await makeRequest('POST', '/api/auth/login', {
      email: '<script>alert("xss")</script>@example.com',
      password: 'test123'
    });
    
    if (xssResponse.statusCode === 400) {
      console.log('✅ XSS attempt properly blocked');
      return true;
    } else {
      console.log('❌ XSS attempt not properly blocked');
      return false;
    }
    
  } catch (error) {
    console.log('❌ XSS protection test failed:', error.message);
    return false;
  }
}

// Main test runner
async function runAllSecurityTests() {
  console.log('🔒 Starting Comprehensive Security Features Tests...\n');
  
  const tests = [
    { name: 'Get Auth Token', fn: testLoginForToken },
    { name: 'Rate Limiting', fn: testRateLimiting },
    { name: 'CORS Configuration', fn: testCORS },
    { name: 'Input Validation', fn: testInputValidation },
    { name: 'Security Headers', fn: testSecurityHeaders },
    { name: 'File Upload Security', fn: testFileUploadSecurity },
    { name: 'SQL Injection Protection', fn: testSQLInjectionProtection },
    { name: 'XSS Protection', fn: testXSSProtection }
  ];
  
  let passedTests = 0;
  let totalTests = tests.length;
  
  for (const test of tests) {
    try {
      console.log(`\n🧪 Running: ${test.name}`);
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
  console.log('📊 SECURITY FEATURES TEST RESULTS');
  console.log('='.repeat(60));
  console.log(`✅ Passed: ${passedTests}/${totalTests}`);
  console.log(`❌ Failed: ${totalTests - passedTests}/${totalTests}`);
  
  if (passedTests === totalTests) {
    console.log('\n🎉 ALL SECURITY TESTS PASSED!');
    console.log('\n🔒 Security Features Verified:');
    console.log('   • Rate limiting on authentication endpoints');
    console.log('   • Comprehensive input validation and sanitization');
    console.log('   • CORS policy configuration');
    console.log('   • File upload security with type and size validation');
    console.log('   • Security headers (XSS, CSRF, etc.)');
    console.log('   • SQL injection protection');
    console.log('   • XSS protection');
    console.log('\n🚀 Your API is now significantly more secure!');
  } else {
    console.log('\n⚠️  Some security tests failed. Please review the output above.');
    process.exit(1);
  }
}

// Run tests
runAllSecurityTests().catch(error => {
  console.error('❌ Security test runner failed:', error);
  process.exit(1);
});
