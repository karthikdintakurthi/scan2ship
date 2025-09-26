async function debugCatalogAuth() {
  console.log('🔍 Debugging Catalog API Authentication...\n');

  const baseUrl = 'https://qa.scan2ship.in';
  
  try {
    // Test 1: Try to access catalog API without authentication
    console.log('1. Testing catalog API without authentication...');
    const noAuthResponse = await fetch(`${baseUrl}/api/catalog`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'test_connection',
        data: {}
      })
    });

    console.log(`   Status: ${noAuthResponse.status}`);
    if (!noAuthResponse.ok) {
      const errorData = await noAuthResponse.json();
      console.log(`   Error: ${errorData.error}`);
    }

    // Test 2: Try with a fake token
    console.log('\n2. Testing with fake token...');
    const fakeTokenResponse = await fetch(`${baseUrl}/api/catalog`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer fake-token'
      },
      body: JSON.stringify({
        action: 'test_connection',
        data: {}
      })
    });

    console.log(`   Status: ${fakeTokenResponse.status}`);
    if (!fakeTokenResponse.ok) {
      const errorData = await fakeTokenResponse.json();
      console.log(`   Error: ${errorData.error}`);
    }

    // Test 3: Check if we can get a valid token by logging in
    console.log('\n3. Testing login to get valid token...');
    const loginResponse = await fetch(`${baseUrl}/api/auth/login`, {
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
      console.log('   ✅ Login successful');
      console.log(`   User: ${loginData.user?.email}`);
      console.log(`   Role: ${loginData.user?.role}`);
      console.log(`   Token: ${loginData.session?.token ? 'Received' : 'Not received'}`);

      // Test 4: Use the real token
      console.log('\n4. Testing with real token...');
      const realTokenResponse = await fetch(`${baseUrl}/api/catalog`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${loginData.session?.token}`
        },
        body: JSON.stringify({
          action: 'test_connection',
          data: {}
        })
      });

      console.log(`   Status: ${realTokenResponse.status}`);
      if (realTokenResponse.ok) {
        const successData = await realTokenResponse.json();
        console.log('   ✅ Catalog API working with real token');
        console.log(`   Response: ${JSON.stringify(successData)}`);
      } else {
        const errorData = await realTokenResponse.json();
        console.log('   ❌ Catalog API failed with real token');
        console.log(`   Error: ${errorData.error}`);
        console.log(`   Details: ${errorData.details}`);
      }
    } else {
      const errorData = await loginResponse.json();
      console.log('   ❌ Login failed:', errorData.error);
    }

    // Test 5: Check if the issue is with the frontend not sending the token
    console.log('\n5. Analysis:');
    console.log('   The 401 error suggests:');
    console.log('   - Frontend is not sending Authorization header');
    console.log('   - Token is invalid or expired');
    console.log('   - User session is not properly maintained');
    console.log('   - Authentication middleware is too strict');

  } catch (error) {
    console.error('❌ Debug failed:', error.message);
  }
}

debugCatalogAuth();
