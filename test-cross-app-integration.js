const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');

// Test script for cross-app integration
async function testCrossAppIntegration() {
  console.log('🚀 Starting Cross-App Integration Test...\n');

  // Initialize Prisma clients for both apps
  const scan2shipPrisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.SCAN2SHIP_DATABASE_URL || 'postgresql://postgres:password@localhost:5432/scan2ship_dev'
      }
    }
  });

  const catalogPrisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.CATALOG_DATABASE_URL || 'postgresql://postgres:password@localhost:5432/catalog_dev'
      }
    }
  });

  try {
    // Step 1: Create a client in Scan2Ship
    console.log('📦 Step 1: Creating Scan2Ship client...');
    const scan2shipClient = await scan2shipPrisma.clients.create({
      data: {
        id: 'test-scan2ship-client-' + Date.now(),
        name: 'Test Scan2Ship Client',
        slug: 'test-scan2ship-client',
        companyName: 'Test Scan2Ship Company',
        email: 'test@scan2ship.com',
        phone: '+1234567890',
        address: '123 Test St',
        city: 'Test City',
        state: 'TS',
        country: 'USA',
        pincode: '12345',
        subscriptionPlan: 'premium',
        subscriptionStatus: 'active',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });
    console.log('✅ Scan2Ship client created:', scan2shipClient.id);

    // Step 2: Create a client in Catalog App
    console.log('\n📦 Step 2: Creating Catalog App client...');
    const catalogClient = await catalogPrisma.client.create({
      data: {
        id: 'test-catalog-client-' + Date.now(),
        name: 'Test Catalog Client',
        slug: 'test-catalog-client',
        email: 'test@catalog.com',
        phone: '+1234567890',
        address: '123 Test St',
        isActive: true,
        plan: 'PROFESSIONAL'
      }
    });
    console.log('✅ Catalog client created:', catalogClient.id);

    // Step 3: Create an API key in Catalog App
    console.log('\n🔑 Step 3: Creating Catalog API key...');
    const apiKey = 'cat_sk_' + crypto.randomBytes(32).toString('hex');
    const catalogApiKey = await catalogPrisma.apiKey.create({
      data: {
        id: 'test-api-key-' + Date.now(),
        name: 'Scan2Ship Integration Key',
        key: apiKey,
        clientId: catalogClient.id,
        permissions: ['inventory:read', 'inventory:write', 'products:read'],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });
    console.log('✅ Catalog API key created:', catalogApiKey.key);

    // Step 4: Create cross-app mapping in Scan2Ship
    console.log('\n🔗 Step 4: Creating cross-app mapping...');
    const crossAppMapping = await scan2shipPrisma.cross_app_mappings.create({
      data: {
        id: 'test-mapping-' + Date.now(),
        scan2shipClientId: scan2shipClient.id,
        catalogClientId: catalogClient.id,
        catalogApiKey: apiKey,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });
    console.log('✅ Cross-app mapping created:', crossAppMapping.id);

    // Step 5: Test the integration
    console.log('\n🧪 Step 5: Testing integration...');
    
    // Test 1: Check if cross-app mapping works
    const mapping = await scan2shipPrisma.cross_app_mappings.findFirst({
      where: {
        scan2shipClientId: scan2shipClient.id,
        isActive: true
      }
    });
    
    if (mapping) {
      console.log('✅ Cross-app mapping retrieval works');
    } else {
      console.log('❌ Cross-app mapping retrieval failed');
    }

    // Test 2: Test API key validation in Catalog App
    const catalogApiKeyValidation = await catalogPrisma.apiKey.findUnique({
      where: { key: apiKey },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            slug: true,
            isActive: true
          }
        }
      }
    });

    if (catalogApiKeyValidation && catalogApiKeyValidation.isActive) {
      console.log('✅ Catalog API key validation works');
    } else {
      console.log('❌ Catalog API key validation failed');
    }

    // Test 3: Test inventory API call
    console.log('\n📊 Step 6: Testing inventory API call...');
    
    const testInventoryCall = async () => {
      try {
        const response = await fetch('http://localhost:3001/api/public/inventory/check?client=test-catalog-client', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': apiKey,
            'X-Client-ID': catalogClient.id
          },
          body: JSON.stringify({
            items: [
              { sku: 'TEST-SKU-001', quantity: 1 }
            ]
          })
        });

        if (response.ok) {
          const data = await response.json();
          console.log('✅ Inventory API call successful:', data.success);
        } else {
          const error = await response.json();
          console.log('❌ Inventory API call failed:', error.error);
        }
      } catch (error) {
        console.log('❌ Inventory API call error:', error.message);
      }
    };

    // Only test if catalog app is running
    console.log('Note: Make sure Catalog App is running on localhost:3001 to test API calls');
    // await testInventoryCall();

    console.log('\n🎉 Cross-App Integration Test Completed!');
    console.log('\n📋 Summary:');
    console.log(`- Scan2Ship Client ID: ${scan2shipClient.id}`);
    console.log(`- Catalog Client ID: ${catalogClient.id}`);
    console.log(`- Catalog API Key: ${apiKey}`);
    console.log(`- Cross-App Mapping ID: ${crossAppMapping.id}`);

    console.log('\n🔧 Next Steps:');
    console.log('1. Start both apps locally');
    console.log('2. Test the catalog API integration from Scan2Ship');
    console.log('3. Create products in Catalog App');
    console.log('4. Test order placement with inventory reduction');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await scan2shipPrisma.$disconnect();
    await catalogPrisma.$disconnect();
  }
}

// Run the test
testCrossAppIntegration();
