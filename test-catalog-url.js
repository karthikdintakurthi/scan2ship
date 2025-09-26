async function testCatalogUrl() {
  console.log('🔍 Testing Catalog App URL Configuration...\n');

  const baseUrl = 'https://qa.scan2ship.in';
  
  try {
    // Test 1: Login to get token
    console.log('1. Logging in...');
    const loginResponse = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'karthik@scan2ship.in',
        password: 'admin123'
      })
    });

    const loginData = await loginResponse.json();
    const token = loginData.session?.token;

    // Test 2: Test product search (this will show the connection error)
    console.log('\n2. Testing product search...');
    const searchResponse = await fetch(`${baseUrl}/api/catalog`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        action: 'search_products',
        data: { query: 'test', page: 1, limit: 10 }
      })
    });

    console.log(`Status: ${searchResponse.status}`);
    
    if (!searchResponse.ok) {
      const errorData = await searchResponse.json();
      console.log('Error:', errorData.error);
      
      if (errorData.error === 'Product search error' && errorData.details?.includes('ECONNREFUSED 127.0.0.1:3000')) {
        console.log('\n🔍 CONFIRMED: The issue is that QA is trying to connect to localhost:3000');
        console.log('This means CATALOG_APP_URL is not set in the QA environment.');
      }
    }

    // Test 3: Test direct connection to production Catalog App
    console.log('\n3. Testing direct connection to production Catalog App...');
    try {
      const catalogResponse = await fetch('https://www.stockmind.in/api/public/products', {
        method: 'GET',
        headers: {
          'X-API-Key': 'cat_sk_e9e30b772e1055e9104bc98f4d1fe46e1bd556f9e0a5a7dfaa15151782354f3e',
          'X-Client-ID': 'cmg0x0ljk0001ju040ymi9rr0'
        }
      });
      
      console.log(`Production Catalog App Status: ${catalogResponse.status}`);
      if (catalogResponse.ok) {
        console.log('✅ Production Catalog App is accessible');
      } else {
        console.log('❌ Production Catalog App returned error');
      }
    } catch (error) {
      console.log('❌ Production Catalog App connection failed:', error.message);
    }

    console.log('\n📋 SOLUTION:');
    console.log('Set the following environment variable in your QA deployment:');
    console.log('CATALOG_APP_URL=https://www.stockmind.in');
    console.log('\nAfter setting this and restarting the QA app, the integration will work.');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testCatalogUrl();
