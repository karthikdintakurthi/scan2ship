async function testCatalogConnection() {
  console.log('🔍 Testing Catalog App Connection...\n');

  const baseUrl = 'https://qa.scan2ship.in';
  
  try {
    // Test 1: Login to get token
    console.log('1. Logging in to get token...');
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

    if (!loginResponse.ok) {
      console.log('❌ Login failed');
      return;
    }

    const loginData = await loginResponse.json();
    const token = loginData.session?.token;

    if (!token) {
      console.log('❌ No token received');
      return;
    }

    console.log('✅ Login successful, token received');

    // Test 2: Test catalog connection
    console.log('\n2. Testing catalog connection...');
    const catalogResponse = await fetch(`${baseUrl}/api/catalog`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        action: 'test_connection',
        data: {}
      })
    });

    console.log(`Status: ${catalogResponse.status}`);
    
    if (catalogResponse.ok) {
      const catalogData = await catalogResponse.json();
      console.log('✅ Catalog connection successful!');
      console.log('Response:', JSON.stringify(catalogData, null, 2));
    } else {
      const errorData = await catalogResponse.json();
      console.log('❌ Catalog connection failed');
      console.log('Error:', errorData.error);
      console.log('Details:', errorData.details);
      
      // Check if it's a fetch error (connection issue)
      if (errorData.error === 'Connection test failed' && errorData.details === 'fetch failed') {
        console.log('\n🔍 Analysis: This is a connection issue.');
        console.log('The QA environment is trying to connect to the Catalog App,');
        console.log('but the Catalog App is not accessible from the QA server.');
        console.log('\nPossible solutions:');
        console.log('1. The Catalog App needs to be running and accessible');
        console.log('2. The CATALOG_APP_URL environment variable needs to be set correctly');
        console.log('3. The Catalog App might be running on a different URL/port');
      }
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testCatalogConnection();
