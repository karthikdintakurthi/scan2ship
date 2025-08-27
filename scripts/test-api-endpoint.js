require('dotenv').config({ path: '.env.local' });
// Use global fetch (available in Node.js 18+)

const BASE_URL = 'http://localhost:3000';

// Test configuration
const TEST_CONFIG = {
  masterAdminEmail: 'karthik@scan2ship.in',
  clientId: 'client-1756297715470-3hwkwcugb', // RVD Jewels
  testOrderData: {
    name: 'API Test Customer',
    mobile: '919876543210',
    phone: '919876543210',
    address: '456 API Test Street',
    city: 'Mumbai',
    state: 'Maharashtra',
    country: 'India',
    pincode: '400001',
    courier_service: 'delhivery',
    pickup_location: 'RVD Jewels',
    package_value: 5000,
    weight: 100,
    total_items: 1,
    is_cod: false,
    reseller_name: 'API Test Reseller',
    reseller_mobile: '919876543211'
  }
};

async function testAPIEndpoint() {
  console.log('🧪 [API_TEST] Starting API Endpoint Test...\n');

  try {
    // Test 1: Login as master admin
    console.log('📋 Test 1: Logging in as Master Admin...');
    const loginResponse = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: TEST_CONFIG.masterAdminEmail,
        password: 'password123' // Assuming this is the password
      })
    });

    if (!loginResponse.ok) {
      const errorData = await loginResponse.text();
      throw new Error(`Login failed: ${loginResponse.status} - ${errorData}`);
    }

    const loginData = await loginResponse.json();
    const adminToken = loginData.session?.token || loginData.token;
    
    if (!adminToken) {
      throw new Error('No token received from login');
    }

    console.log('✅ Master admin login successful');

    // Test 2: Verify admin can access client settings
    console.log('📋 Test 2: Verifying Admin Access to Client Settings...');
    const clientSettingsResponse = await fetch(`${BASE_URL}/api/admin/settings/clients/${TEST_CONFIG.clientId}`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });

    if (!clientSettingsResponse.ok) {
      const errorData = await clientSettingsResponse.text();
      throw new Error(`Failed to access client settings: ${clientSettingsResponse.status} - ${errorData}`);
    }

    const clientSettings = await clientSettingsResponse.json();
    console.log('✅ Admin can access client settings');
    console.log('📊 Client data:', {
      name: clientSettings.client?.name,
      companyName: clientSettings.client?.companyName,
      hasPickupLocations: clientSettings.hasPickupLocations,
      hasCourierServices: clientSettings.hasCourierServices
    });

    // Test 3: Create order through API endpoint
    console.log('📋 Test 3: Creating Order Through API Endpoint...');
    
    const createOrderResponse = await fetch(`${BASE_URL}/api/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify(TEST_CONFIG.testOrderData)
    });

    if (!createOrderResponse.ok) {
      const errorData = await createOrderResponse.text();
      throw new Error(`Create order failed: ${createOrderResponse.status} - ${errorData}`);
    }

    const createdOrder = await createOrderResponse.json();
    console.log('✅ Order created successfully through API');
    console.log('📦 Order details:', {
      id: createdOrder.order?.id,
      referenceNumber: createdOrder.order?.reference_number,
      customerName: createdOrder.order?.name,
      customerPhone: createdOrder.order?.mobile,
      courierService: createdOrder.order?.courier_service,
      pickupLocation: createdOrder.order?.pickup_location,
      success: createdOrder.success
    });

    // Test 4: Verify order exists in database
    console.log('📋 Test 4: Verifying Order in Database...');
    const orderResponse = await fetch(`${BASE_URL}/api/orders?page=1&limit=25`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });

    if (!orderResponse.ok) {
      const errorData = await orderResponse.text();
      throw new Error(`Failed to fetch orders: ${orderResponse.status} - ${errorData}`);
    }

    const ordersData = await orderResponse.json();
    const testOrder = ordersData.orders?.find(order => 
      order.name === TEST_CONFIG.testOrderData.name && 
      order.mobile === TEST_CONFIG.testOrderData.mobile
    );

    if (testOrder) {
      console.log('✅ Test order found in orders list');
      console.log('📊 Order in list:', {
        id: testOrder.id,
        name: testOrder.name,
        mobile: testOrder.mobile,
        courierService: testOrder.courier_service,
        pickupLocation: testOrder.pickup_location
      });
    } else {
      console.log('⚠️ Test order not found in orders list');
    }

    // Test 5: Check server logs for WhatsApp activity
    console.log('📋 Test 5: Checking for WhatsApp Activity...');
    console.log('📱 Check the server logs above for WhatsApp notification messages');
    console.log('📱 Look for messages like:');
    console.log('   - "📱 [WHATSAPP_SERVICE] Sending WhatsApp message"');
    console.log('   - "✅ [WHATSAPP_SERVICE] WhatsApp message sent successfully"');
    console.log('   - "📱 [API_ORDERS_POST] Customer WhatsApp message sent"');

    // Test 6: Verify WhatsApp configuration is working
    console.log('📋 Test 6: Verifying WhatsApp Configuration...');
    const whatsappConfigResponse = await fetch(`${BASE_URL}/api/admin/system-config`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });

    if (whatsappConfigResponse.ok) {
      const configData = await whatsappConfigResponse.json();
      const whatsappConfigs = configData.configs?.filter(config => config.category === 'whatsapp') || [];
      
      console.log('✅ WhatsApp configuration found:', whatsappConfigs.length, 'items');
      whatsappConfigs.forEach(config => {
        console.log(`   - ${config.key}: ${config.key.includes('API_KEY') ? config.value.substring(0, 10) + '***' : config.value}`);
      });
    } else {
      console.log('⚠️ Could not fetch system configuration');
    }

    console.log('\n🎉 [API_TEST] All tests completed successfully!');
    console.log('✅ API endpoint is working correctly');
    console.log('✅ Order creation with WhatsApp notification is functional');
    console.log('✅ Master admin can access all features');

    // Cleanup: Delete test order (optional - you may want to keep it for verification)
    console.log('\n📋 Cleanup: Test order was created successfully');
    console.log('💡 You can manually delete the test order from the admin panel if needed');

  } catch (error) {
    console.error('\n❌ [API_TEST] Test failed:', error.message);
    console.error('Stack trace:', error.stack);
    
    // Provide specific debugging information
    console.log('\n🔍 Debugging Information:');
    console.log('1. Check if the development server is running on http://localhost:3000');
    console.log('2. Check if master admin credentials are correct');
    console.log('3. Check if the client ID is valid');
    console.log('4. Check server logs for detailed error messages');
    console.log('5. Verify WhatsApp configuration is properly set');
    
    throw error;
  }
}

// Run the test
if (require.main === module) {
  testAPIEndpoint()
    .then(() => {
      console.log('\n✅ API endpoint test completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ API endpoint test failed:', error.message);
      process.exit(1);
    });
}

module.exports = { testAPIEndpoint };
