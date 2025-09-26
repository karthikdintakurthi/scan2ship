// Test script to verify integration setup
async function testIntegrationSetup() {
  console.log('🧪 Testing Cross-App Integration Setup...\n');

  const scan2shipBaseUrl = 'http://localhost:3002'; // Scan2Ship is on 3002
  const catalogBaseUrl = 'http://localhost:3003'; // Catalog App is on 3003

  try {
    // Test 1: Check if both apps are running
    console.log('📡 Step 1: Checking if both apps are running...');
    
    const scan2shipTest = await fetch(`${scan2shipBaseUrl}/api/orders`);
    const catalogTest = await fetch(`${catalogBaseUrl}/api/health`);
    
    if (scan2shipTest.status === 401) {
      console.log('✅ Scan2Ship is running (authentication required as expected)');
    } else {
      console.log('❌ Scan2Ship is not responding correctly');
      return;
    }
    
    if (catalogTest.ok) {
      console.log('✅ Catalog App is running');
    } else {
      console.log('❌ Catalog App is not responding correctly');
      return;
    }

    // Test 2: Check admin endpoints
    console.log('\n🔐 Step 2: Testing admin endpoints...');
    
    // Test Scan2Ship admin endpoints
    const scan2shipAdminTest = await fetch(`${scan2shipBaseUrl}/api/admin/api-keys`);
    if (scan2shipAdminTest.status === 401) {
      console.log('✅ Scan2Ship admin API keys endpoint is accessible');
    } else {
      console.log('❌ Scan2Ship admin API keys endpoint issue');
    }

    const scan2shipMappingsTest = await fetch(`${scan2shipBaseUrl}/api/admin/cross-app-mappings`);
    if (scan2shipMappingsTest.status === 401) {
      console.log('✅ Scan2Ship cross-app mappings endpoint is accessible');
    } else {
      console.log('❌ Scan2Ship cross-app mappings endpoint issue');
    }

    // Test Catalog App admin endpoints
    const catalogAdminTest = await fetch(`${catalogBaseUrl}/api/admin/api-keys`);
    if (catalogAdminTest.status === 401) {
      console.log('✅ Catalog App admin API keys endpoint is accessible');
    } else {
      console.log('❌ Catalog App admin API keys endpoint issue');
    }

    // Test 3: Check UI pages
    console.log('\n🖥️ Step 3: Testing UI pages...');
    
    const scan2shipUIPages = [
      '/admin/api-keys',
      '/admin/cross-app-mappings'
    ];

    for (const page of scan2shipUIPages) {
      const response = await fetch(`${scan2shipBaseUrl}${page}`);
      if (response.status === 200 || response.status === 401) {
        console.log(`✅ Scan2Ship ${page} page is accessible`);
      } else {
        console.log(`❌ Scan2Ship ${page} page issue (status: ${response.status})`);
      }
    }

    const catalogUIPages = [
      '/admin/api-keys'
    ];

    for (const page of catalogUIPages) {
      const response = await fetch(`${catalogBaseUrl}${page}`);
      if (response.status === 200 || response.status === 401) {
        console.log(`✅ Catalog App ${page} page is accessible`);
      } else {
        console.log(`❌ Catalog App ${page} page issue (status: ${response.status})`);
      }
    }

    console.log('\n🎉 Integration Setup Test Completed!');
    console.log('\n📋 Next Steps:');
    console.log('1. Open http://localhost:3000/admin in your browser');
    console.log('2. Login with karthik@scan2ship.in / admin123');
    console.log('3. Go to API Keys section to create API keys');
    console.log('4. Go to Cross-App Mappings to set up integration');
    console.log('5. Open http://localhost:3001/admin for Catalog App management');

    console.log('\n🔗 Admin URLs:');
    console.log('- Scan2Ship Admin: http://localhost:3000/admin');
    console.log('- Catalog App Admin: http://localhost:3001/admin');
    console.log('- API Keys (Scan2Ship): http://localhost:3000/admin/api-keys');
    console.log('- Cross-App Mappings: http://localhost:3000/admin/cross-app-mappings');
    console.log('- API Keys (Catalog): http://localhost:3001/admin/api-keys');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('\n💡 Make sure both apps are running:');
    console.log('- Scan2Ship: PORT=3000 npm run dev');
    console.log('- Catalog App: PORT=3001 npm run dev');
  }
}

// Run the test
testIntegrationSetup();
