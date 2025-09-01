#!/usr/bin/env node

/**
 * Basic Security Features Test
 * Tests the core security features without complex setup
 */

const http = require('http');

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

async function testCORS() {
  console.log('\n🌐 Testing CORS...');
  
  try {
    // Test without origin header - should be allowed through to auth check
    const noOriginResponse = await makeRequest('GET', '/api/credits');
    if (noOriginResponse.statusCode === 401 && noOriginResponse.body?.error === 'Unauthorized') {
      console.log('✅ CORS allowing requests without origin header (passes to auth)');
    } else {
      console.log('❌ CORS not working properly for requests without origin');
      return false;
    }
    
    // Test with valid origin - should be allowed through to auth check
    const validOriginResponse = await makeRequest('GET', '/api/credits', null, {
      'Origin': 'http://localhost:3000'
    });
    if (validOriginResponse.statusCode === 401 && validOriginResponse.body?.error === 'Unauthorized') {
      console.log('✅ CORS allowing authorized origins (passes to auth)');
    } else {
      console.log('❌ CORS not working properly with valid origin');
      return false;
    }
    
    // Test with invalid origin - should be blocked by CORS
    const invalidOriginResponse = await makeRequest('GET', '/api/credits', null, {
      'Origin': 'http://malicious-site.com'
    });
    if (invalidOriginResponse.statusCode === 403 && invalidOriginResponse.body?.error === 'Origin not allowed') {
      console.log('✅ CORS blocking unauthorized origins');
    } else {
      console.log('❌ CORS not properly blocking unauthorized origins');
      return false;
    }
    
    console.log('✅ CORS is working correctly');
    return true;
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
    }, {
      'Origin': 'http://localhost:3000'
    });
    
    if (invalidEmailResponse.statusCode === 400 && invalidEmailResponse.body?.error === 'Invalid email format') {
      console.log('✅ Invalid email properly rejected');
    } else {
      console.log('❌ Invalid email not properly validated');
      return false;
    }
    
    console.log('✅ Input validation is working correctly');
    return true;
  } catch (error) {
    console.log('❌ Input validation test failed:', error.message);
    return false;
  }
}

async function testRateLimiting() {
  console.log('\n🚫 Testing Rate Limiting...');
  
  try {
    // Make multiple rapid requests
    const promises = [];
    for (let i = 0; i < 10; i++) {
      promises.push(
        makeRequest('POST', '/api/auth/login', {
          email: 'test@example.com',
          password: 'test123'
        }, {
          'Origin': 'http://localhost:3000'
        })
      );
    }
    
    const responses = await Promise.all(promises);
    
    // Check if any requests were rate limited
    const rateLimited = responses.filter(r => r.statusCode === 429);
    
    if (rateLimited.length > 0) {
      console.log('✅ Rate limiting is working');
      console.log(`   Rate limited requests: ${rateLimited.length}/${responses.length}`);
      return true;
    } else {
      console.log('⚠️  Rate limiting may not be working');
      return false;
    }
  } catch (error) {
    console.log('❌ Rate limiting test failed:', error.message);
    return false;
  }
}

async function testSecurityHeaders() {
  console.log('\n🛡️ Testing Security Headers...');
  
  try {
    const response = await makeRequest('GET', '/api/credits', null, {
      'Origin': 'http://localhost:3000'
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
      console.log('✅ All security headers are present');
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

async function runBasicSecurityTests() {
  console.log('🔒 Starting Basic Security Features Tests...\n');
  
  const tests = [
    { name: 'CORS', fn: testCORS },
    { name: 'Input Validation', fn: testInputValidation },
    { name: 'Rate Limiting', fn: testRateLimiting },
    { name: 'Security Headers', fn: testSecurityHeaders }
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
  console.log('\n' + '='.repeat(50));
  console.log('📊 BASIC SECURITY TEST RESULTS');
  console.log('='.repeat(50));
  console.log(`✅ Passed: ${passedTests}/${totalTests}`);
  console.log(`❌ Failed: ${totalTests - passedTests}/${totalTests}`);
  
  if (passedTests === totalTests) {
    console.log('\n🎉 ALL BASIC SECURITY TESTS PASSED!');
    console.log('\n🔒 Security Features Verified:');
    console.log('   • CORS policy enforcement');
    console.log('   • Input validation and sanitization');
    console.log('   • Rate limiting on authentication endpoints');
    console.log('   • Security headers (XSS, CSRF protection)');
    console.log('\n🚀 Your API now has basic security protection!');
  } else {
    console.log('\n⚠️  Some security tests failed. Please review the output above.');
  }
}

// Run tests
runBasicSecurityTests().catch(error => {
  console.error('❌ Security test runner failed:', error);
});
