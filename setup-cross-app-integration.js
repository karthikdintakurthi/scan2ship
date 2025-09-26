// Using built-in fetch (Node.js 18+)
const crypto = require('crypto');

// Setup script for cross-app integration
async function setupCrossAppIntegration() {
  console.log('🚀 Setting up Cross-App Integration...\n');

  const scan2shipBaseUrl = 'http://localhost:3000';
  const catalogBaseUrl = 'http://localhost:3001';

  try {
    // Step 1: Check if both apps are running
    console.log('📡 Step 1: Checking if both apps are running...');
    
    const scan2shipHealth = await fetch(`${scan2shipBaseUrl}/api/health`);
    const catalogHealth = await fetch(`${catalogBaseUrl}/api/health`);
    
    if (scan2shipHealth.ok) {
      console.log('✅ Scan2Ship is running');
    } else {
      console.log('❌ Scan2Ship is not running');
      return;
    }
    
    if (catalogHealth.ok) {
      console.log('✅ Catalog App is running');
    } else {
      console.log('❌ Catalog App is not running');
      return;
    }

    // Step 2: Create a client in Catalog App (via API)
    console.log('\n📦 Step 2: Creating Catalog App client...');
    
    const catalogClientData = {
      name: 'Test Integration Client',
      slug: 'test-integration-client',
      email: 'test@integration.com',
      phone: '+1234567890',
      address: '123 Test St',
      isActive: true,
      plan: 'PROFESSIONAL'
    };

    // Note: This would require admin authentication in real scenario
    console.log('📝 Catalog client data prepared:', catalogClientData);

    // Step 3: Create API key in Catalog App
    console.log('\n🔑 Step 3: Creating Catalog API key...');
    
    const apiKey = 'cat_sk_' + crypto.randomBytes(32).toString('hex');
    console.log('📝 API key generated:', apiKey);

    // Step 4: Create cross-app mapping in Scan2Ship
    console.log('\n🔗 Step 4: Creating cross-app mapping...');
    
    const mappingData = {
      scan2shipClientId: 'test-scan2ship-client-123',
      catalogClientId: 'test-catalog-client-456',
      catalogApiKey: apiKey
    };

    // Note: This would require admin authentication in real scenario
    console.log('📝 Cross-app mapping data prepared:', mappingData);

    // Step 5: Test the integration
    console.log('\n🧪 Step 5: Testing integration...');
    
    // Test catalog API with API key
    const inventoryTest = await fetch(`${catalogBaseUrl}/api/public/inventory/check?client=test-integration-client`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey,
        'X-Client-ID': 'test-catalog-client-456'
      },
      body: JSON.stringify({
        items: [{ sku: 'TEST-SKU-001', quantity: 1 }]
      })
    });

    const inventoryResult = await inventoryTest.json();
    console.log('📊 Inventory API test result:', inventoryResult);

    // Test scan2ship catalog API
    const scan2shipTest = await fetch(`${scan2shipBaseUrl}/api/catalog`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      },
      body: JSON.stringify({
        action: 'reduce_inventory',
        data: {
          items: [{ sku: 'TEST-SKU-001', quantity: 1 }],
          orderId: 'TEST-ORDER-001'
        }
      })
    });

    const scan2shipResult = await scan2shipTest.json();
    console.log('📊 Scan2Ship API test result:', scan2shipResult);

    console.log('\n🎉 Cross-App Integration Setup Completed!');
    console.log('\n📋 Configuration Summary:');
    console.log(`- Scan2Ship URL: ${scan2shipBaseUrl}`);
    console.log(`- Catalog App URL: ${catalogBaseUrl}`);
    console.log(`- Catalog Client Slug: test-integration-client`);
    console.log(`- API Key: ${apiKey}`);
    console.log(`- Scan2Ship Client ID: test-scan2ship-client-123`);
    console.log(`- Catalog Client ID: test-catalog-client-456`);

    console.log('\n🔧 Manual Setup Required:');
    console.log('1. Create the catalog client in the Catalog App admin panel');
    console.log('2. Generate an API key for the catalog client');
    console.log('3. Create the cross-app mapping in Scan2Ship admin panel');
    console.log('4. Test the integration with real data');

    console.log('\n📚 API Endpoints:');
    console.log('- Scan2Ship Catalog API: POST /api/catalog');
    console.log('- Catalog Inventory Check: POST /api/public/inventory/check');
    console.log('- Catalog Inventory Reduce: POST /api/public/inventory/reduce');

  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    console.log('\n💡 Make sure both apps are running:');
    console.log('- Scan2Ship: npm run dev (port 3000)');
    console.log('- Catalog App: npm run dev (port 3001)');
  }
}

// Run the setup
setupCrossAppIntegration();
