#!/usr/bin/env node

/**
 * CORS Configuration Test Script
 * Tests CORS headers for different origins
 */

const https = require('https');
const http = require('http');

// Test origins
const testOrigins = [
  'http://localhost:3000',
  'http://localhost:3001', 
  'https://qa.scan2ship.in',
  'https://malicious-site.com',
  'https://scan2ship.in'
];

// Test endpoints
const testEndpoints = [
  'http://localhost:3000/api/auth/login',
  'http://localhost:3000/api/upload',
  'http://localhost:3000/api/orders'
];

/**
 * Test CORS for a specific origin and endpoint
 */
async function testCORS(origin, endpoint) {
  return new Promise((resolve) => {
    const url = new URL(endpoint);
    const options = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname,
      method: 'OPTIONS',
      headers: {
        'Origin': origin,
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type, Authorization'
      }
    };

    const client = url.protocol === 'https:' ? https : http;
    
    const req = client.request(options, (res) => {
      const corsHeaders = {
        'Access-Control-Allow-Origin': res.headers['access-control-allow-origin'],
        'Access-Control-Allow-Methods': res.headers['access-control-allow-methods'],
        'Access-Control-Allow-Headers': res.headers['access-control-allow-headers'],
        'Access-Control-Allow-Credentials': res.headers['access-control-allow-credentials']
      };
      
      resolve({
        origin,
        endpoint,
        status: res.statusCode,
        corsHeaders,
        allowed: res.headers['access-control-allow-origin'] === origin || 
                 res.headers['access-control-allow-origin'] === '*'
      });
    });

    req.on('error', (error) => {
      resolve({
        origin,
        endpoint,
        error: error.message,
        allowed: false
      });
    });

    req.end();
  });
}

/**
 * Run all CORS tests
 */
async function runCORSTests() {
  console.log('🔒 Testing CORS Configuration...\n');
  
  const results = [];
  
  for (const origin of testOrigins) {
    for (const endpoint of testEndpoints) {
      console.log(`Testing ${origin} -> ${endpoint}`);
      const result = await testCORS(origin, endpoint);
      results.push(result);
      
      if (result.error) {
        console.log(`  ❌ Error: ${result.error}`);
      } else {
        console.log(`  Status: ${result.status}`);
        console.log(`  CORS Origin: ${result.corsHeaders['Access-Control-Allow-Origin']}`);
        console.log(`  Allowed: ${result.allowed ? '✅' : '❌'}`);
      }
      console.log('');
    }
  }
  
  // Summary
  console.log('📊 CORS Test Summary:');
  console.log('=' .repeat(50));
  
  const allowedCount = results.filter(r => r.allowed).length;
  const totalCount = results.length;
  
  console.log(`Total Tests: ${totalCount}`);
  console.log(`Allowed: ${allowedCount}`);
  console.log(`Blocked: ${totalCount - allowedCount}`);
  
  // Check specific origins
  const qaOrigin = results.filter(r => r.origin === 'https://qa.scan2ship.in');
  const qaAllowed = qaOrigin.filter(r => r.allowed).length;
  
  console.log(`\nQA Environment (https://qa.scan2ship.in):`);
  console.log(`  Tests: ${qaOrigin.length}`);
  console.log(`  Allowed: ${qaAllowed}`);
  console.log(`  Blocked: ${qaOrigin.length - qaAllowed}`);
  
  if (qaAllowed === qaOrigin.length) {
    console.log('  ✅ QA environment CORS is working correctly');
  } else {
    console.log('  ❌ QA environment CORS has issues');
  }
  
  // Check malicious origins
  const maliciousOrigin = results.filter(r => r.origin === 'https://malicious-site.com');
  const maliciousAllowed = maliciousOrigin.filter(r => r.allowed).length;
  
  console.log(`\nMalicious Origin (https://malicious-site.com):`);
  console.log(`  Tests: ${maliciousOrigin.length}`);
  console.log(`  Allowed: ${maliciousAllowed}`);
  console.log(`  Blocked: ${maliciousOrigin.length - maliciousAllowed}`);
  
  if (maliciousAllowed === 0) {
    console.log('  ✅ Malicious origins are properly blocked');
  } else {
    console.log('  ❌ Malicious origins are not properly blocked');
  }
}

// Run tests if script is executed directly
if (require.main === module) {
  runCORSTests().catch(console.error);
}

module.exports = { testCORS, runCORSTests };
