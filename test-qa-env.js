#!/usr/bin/env node

/**
 * Test QA environment configuration
 */

async function testQAEnv() {
  console.log('🧪 Testing QA environment configuration...\n');

  try {
    // Test 1: Check if we can access the QA environment
    console.log('📡 Test 1: Checking QA environment access...');
    const response = await fetch('https://qa.scan2ship.in/api/debug-env');
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ QA environment accessible');
      console.log('Environment variables:', JSON.stringify(data, null, 2));
    } else {
      console.log('❌ QA environment not accessible:', response.status);
    }

    // Test 2: Check if the catalog API is working with proper auth
    console.log('\n📡 Test 2: Testing catalog API with authentication...');
    
    // First, let's try to get a session by logging in
    const loginResponse = await fetch('https://qa.scan2ship.in/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'karthik@scan2ship.in',
        password: 'admin123'
      })
    });

    if (loginResponse.ok) {
      const loginData = await loginResponse.json();
      console.log('✅ Login successful');
      
      // Now test the catalog API with the session token
      const catalogResponse = await fetch('https://qa.scan2ship.in/api/catalog', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${loginData.token}`
        },
        body: JSON.stringify({
          action: 'search_products',
          data: { query: 'test', page: 1, limit: 5 }
        })
      });

      if (catalogResponse.ok) {
        const catalogData = await catalogResponse.json();
        console.log('✅ Catalog API working:', JSON.stringify(catalogData, null, 2));
      } else {
        const errorData = await catalogResponse.json();
        console.log('❌ Catalog API failed:', response.status, errorData);
      }
    } else {
      console.log('❌ Login failed:', loginResponse.status);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testQAEnv();
