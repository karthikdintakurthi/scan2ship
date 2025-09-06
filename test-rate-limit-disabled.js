#!/usr/bin/env node

/**
 * Test Rate Limiting Disabled
 * 
 * This script tests that rate limiting is disabled for testing purposes.
 * Run with: node test-rate-limit-disabled.js
 */

const SCAN2SHIP_CONFIG = {
  baseUrl: 'https://qa.scan2ship.in/api',
  bypassToken: 'scan2shiplogisticssupersecretkey',
  credentials: {
    email: 'test@scan2ship.com',
    password: 'ammananna'
  }
};

async function testRateLimitDisabled() {
  console.log('🚫 Testing Rate Limiting Disabled\n');
  console.log('=' .repeat(50));

  let jwtToken = null;

  try {
    // Step 1: Get JWT token
    console.log('🔐 Getting JWT token...');
    const loginResponse = await fetch(`${SCAN2SHIP_CONFIG.baseUrl}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-vercel-protection-bypass': SCAN2SHIP_CONFIG.bypassToken
      },
      body: JSON.stringify(SCAN2SHIP_CONFIG.credentials)
    });

    if (!loginResponse.ok) {
      throw new Error(`Login failed: ${loginResponse.status} ${loginResponse.statusText}`);
    }

    const loginData = await loginResponse.json();
    jwtToken = loginData.session.token;
    console.log('✅ JWT token obtained');

    // Step 2: Make multiple rapid requests to test rate limiting
    console.log('\n🔄 Making multiple rapid requests to test rate limiting...');
    
    const requests = [];
    const numRequests = 20; // Make 20 requests rapidly
    
    for (let i = 0; i < numRequests; i++) {
      requests.push(
        fetch(`${SCAN2SHIP_CONFIG.baseUrl}/courier-services`, {
          headers: {
            'Authorization': `Bearer ${jwtToken}`,
            'Content-Type': 'application/json',
            'x-vercel-protection-bypass': SCAN2SHIP_CONFIG.bypassToken
          }
        })
      );
    }

    console.log(`   Making ${numRequests} concurrent requests...`);
    
    const startTime = Date.now();
    const responses = await Promise.all(requests);
    const endTime = Date.now();
    
    const duration = endTime - startTime;
    console.log(`   Completed ${numRequests} requests in ${duration}ms`);

    // Analyze responses
    const successfulRequests = responses.filter(r => r.ok).length;
    const rateLimitedRequests = responses.filter(r => r.status === 429).length;
    const otherErrors = responses.filter(r => !r.ok && r.status !== 429).length;

    console.log('\n📊 Results:');
    console.log(`   ✅ Successful requests: ${successfulRequests}/${numRequests}`);
    console.log(`   🚫 Rate limited requests: ${rateLimitedRequests}`);
    console.log(`   ❌ Other errors: ${otherErrors}`);

    if (rateLimitedRequests === 0) {
      console.log('\n🎉 SUCCESS: Rate limiting is disabled!');
      console.log('   You can now make unlimited requests for testing.');
    } else {
      console.log('\n⚠️  WARNING: Rate limiting is still active');
      console.log(`   ${rateLimitedRequests} requests were rate limited.`);
    }

    if (otherErrors > 0) {
      console.log('\n🔍 Checking for other errors...');
      const errorResponses = responses.filter(r => !r.ok && r.status !== 429);
      for (let i = 0; i < Math.min(3, errorResponses.length); i++) {
        const response = errorResponses[i];
        const errorText = await response.text();
        console.log(`   Error ${response.status}: ${errorText.substring(0, 100)}...`);
      }
    }

  } catch (error) {
    console.error('\n💥 Test failed:', error.message);
  }
}

// Run the test
if (require.main === module) {
  testRateLimitDisabled().catch(console.error);
}

module.exports = testRateLimitDisabled;
