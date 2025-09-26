#!/usr/bin/env node

/**
 * Debug QA authentication issues
 */

async function debugQAAuth() {
  console.log('🔍 Debugging QA authentication...\n');

  try {
    // Step 1: Login and get session
    console.log('📡 Step 1: Logging in...');
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

    if (!loginResponse.ok) {
      console.log('❌ Login failed:', loginResponse.status);
      return;
    }

    const loginData = await loginResponse.json();
    console.log('✅ Login successful');
    console.log('User data:', JSON.stringify(loginData.user, null, 2));
    console.log('Session data:', JSON.stringify(loginData.session, null, 2));
    console.log('Session token:', loginData.session?.token ? 'Present' : 'Missing');

    // Step 2: Test catalog API with detailed headers
    console.log('\n📡 Step 2: Testing catalog API...');
    const catalogResponse = await fetch('https://qa.scan2ship.in/api/catalog', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${loginData.session?.token}`,
        'User-Agent': 'Debug-Script/1.0'
      },
      body: JSON.stringify({
        action: 'search_products',
        data: { query: 'test', page: 1, limit: 5 }
      })
    });

    console.log('Catalog API Response Status:', catalogResponse.status);
    console.log('Catalog API Response Headers:', Object.fromEntries(catalogResponse.headers.entries()));
    
    const catalogData = await catalogResponse.json();
    console.log('Catalog API Response Body:', JSON.stringify(catalogData, null, 2));

    // Step 3: Test with a different endpoint to see if auth works
    console.log('\n📡 Step 3: Testing other authenticated endpoint...');
    const otherResponse = await fetch('https://qa.scan2ship.in/api/auth/verify', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${loginData.session?.token}`,
        'User-Agent': 'Debug-Script/1.0'
      }
    });

    console.log('Auth Verify Status:', otherResponse.status);
    if (otherResponse.ok) {
      const verifyData = await otherResponse.json();
      console.log('Auth Verify Data:', JSON.stringify(verifyData, null, 2));
    } else {
      const errorData = await otherResponse.json();
      console.log('Auth Verify Error:', errorData);
    }

  } catch (error) {
    console.error('❌ Debug failed:', error.message);
  }
}

// Run the debug
debugQAAuth();
