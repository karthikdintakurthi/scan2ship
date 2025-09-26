async function debugEnvVars() {
  console.log('🔍 Debugging Environment Variables...\n');

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

    // Test 2: Create a test endpoint to check environment variables
    console.log('\n2. Testing environment variable detection...');
    
    // Let's test the catalog API and see what URL it's actually trying to connect to
    console.log('Testing catalog API to see what URL it uses...');
    
    const searchResponse = await fetch(`${baseUrl}/api/catalog`, {
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

    console.log(`Status: ${searchResponse.status}`);
    
    if (!searchResponse.ok) {
      const errorData = await searchResponse.json();
      console.log('Error:', errorData.error);
      console.log('Details:', errorData.details);
      
      // Check if it's still trying to connect to localhost
      if (errorData.details?.includes('ECONNREFUSED 127.0.0.1:3000')) {
        console.log('\n❌ CONFIRMED: Still trying to connect to localhost:3000');
        console.log('This suggests the environment variable is not being read correctly.');
        console.log('\nPossible causes:');
        console.log('1. Environment variable not set in the correct environment');
        console.log('2. Application not restarted after setting the variable');
        console.log('3. Environment variable name mismatch');
        console.log('4. Caching issue');
        console.log('5. The variable is set but not in the right scope');
      }
    } else {
      console.log('✅ Catalog API is working!');
      const responseData = await searchResponse.json();
      console.log('Response:', JSON.stringify(responseData, null, 2));
    }

    // Test 3: Check if we can access the production Catalog App directly
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
        const products = await catalogResponse.json();
        console.log(`Found ${products.products?.length || 0} products`);
      } else {
        console.log('❌ Production Catalog App returned error');
      }
    } catch (error) {
      console.log('❌ Production Catalog App connection failed:', error.message);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

debugEnvVars();
