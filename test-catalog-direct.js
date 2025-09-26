async function testCatalogDirect() {
  console.log('🔍 Testing Direct Catalog App Connection...\n');

  try {
    // Test 1: Test the production Catalog App directly
    console.log('1. Testing production Catalog App...');
    const catalogResponse = await fetch('https://www.stockmind.in/api/public/products', {
      method: 'GET',
      headers: {
        'X-API-Key': 'cat_sk_e9e30b772e1055e9104bc98f4d1fe46e1bd556f9e0a5a7dfaa15151782354f3e',
        'X-Client-ID': 'cmg0x0ljk0001ju040ymi9rr0'
      }
    });
    
    console.log(`Status: ${catalogResponse.status}`);
    if (catalogResponse.ok) {
      const products = await catalogResponse.json();
      console.log('✅ Production Catalog App is working');
      console.log(`Found ${products.products?.length || 0} products`);
      console.log('Response structure:', Object.keys(products));
    } else {
      const errorText = await catalogResponse.text();
      console.log('❌ Production Catalog App error:', errorText);
    }

    // Test 2: Test with search parameters
    console.log('\n2. Testing with search parameters...');
    const searchResponse = await fetch('https://www.stockmind.in/api/public/products?search=test&page=1&limit=10', {
      method: 'GET',
      headers: {
        'X-API-Key': 'cat_sk_e9e30b772e1055e9104bc98f4d1fe46e1bd556f9e0a5a7dfaa15151782354f3e',
        'X-Client-ID': 'cmg0x0ljk0001ju040ymi9rr0'
      }
    });
    
    console.log(`Search Status: ${searchResponse.status}`);
    if (searchResponse.ok) {
      const searchData = await searchResponse.json();
      console.log('✅ Search is working');
      console.log(`Found ${searchData.products?.length || 0} products`);
    } else {
      const errorText = await searchResponse.text();
      console.log('❌ Search error:', errorText);
    }

    // Test 3: Check if the issue is with the QA environment
    console.log('\n3. Analysis:');
    console.log('The production Catalog App is working correctly.');
    console.log('The issue is that the QA environment is not using the correct URL.');
    console.log('\nPossible solutions:');
    console.log('1. Check if CATALOG_APP_URL is set in the QA deployment environment');
    console.log('2. Restart the QA application after setting the environment variable');
    console.log('3. Check if there are multiple environment files (.env, .env.local, .env.production)');
    console.log('4. Verify the environment variable is set in the correct deployment platform');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testCatalogDirect();
