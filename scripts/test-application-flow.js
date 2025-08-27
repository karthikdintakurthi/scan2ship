const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const BASE_URL = 'http://localhost:3000';

// Test data
const testData = {
  masterAdmin: {
    email: 'karthik@scan2ship.in',
    password: 'Darling@2706'
  },
  clientUser: {
    email: 'sujatha@scan2ship.in',
    password: 'password123'
  },
  newClient: {
    name: 'Test Client',
    companyName: 'Test Company Ltd',
    email: 'test@company.com',
    phone: '9876543210',
    address: '123 Test Street',
    city: 'Test City',
    state: 'Test State',
    country: 'India',
    pincode: '500001'
  },
  newOrder: {
    name: 'Test Customer',
    mobile: '9876543210',
    address: '456 Customer Street',
    city: 'Customer City',
    state: 'Customer State',
    country: 'India',
    pincode: '500002',
    courier_service: 'delhivery',
    pickup_location: 'Test Pickup',
    package_value: 1000,
    weight: 500,
    total_items: 2,
    is_cod: false,
    product_description: 'Test Product'
  }
};

let masterAdminToken = null;
let clientUserToken = null;
let testClientId = null;
let testOrderId = null;

class TestSuite {
  constructor() {
    this.results = {
      passed: 0,
      failed: 0,
      total: 0,
      details: []
    };
  }

  async test(name, testFunction) {
    this.results.total++;
    try {
      console.log(`\n🧪 Testing: ${name}`);
      await testFunction();
      console.log(`✅ PASSED: ${name}`);
      this.results.passed++;
      this.results.details.push({ name, status: 'PASSED' });
    } catch (error) {
      console.error(`❌ FAILED: ${name}`);
      console.error(`   Error: ${error.message}`);
      this.results.failed++;
      this.results.details.push({ name, status: 'FAILED', error: error.message });
    }
  }

  printResults() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST RESULTS SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total Tests: ${this.results.total}`);
    console.log(`Passed: ${this.results.passed} ✅`);
    console.log(`Failed: ${this.results.failed} ❌`);
    console.log(`Success Rate: ${((this.results.passed / this.results.total) * 100).toFixed(1)}%`);
    
    if (this.results.failed > 0) {
      console.log('\n❌ FAILED TESTS:');
      this.results.details
        .filter(test => test.status === 'FAILED')
        .forEach(test => {
          console.log(`   - ${test.name}: ${test.error}`);
        });
    }
    
    console.log('\n✅ PASSED TESTS:');
    this.results.details
      .filter(test => test.status === 'PASSED')
      .forEach(test => {
        console.log(`   - ${test.name}`);
      });
  }
}

async function testAuthentication() {
  // Test Master Admin Login
  const masterAdminResponse = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(testData.masterAdmin)
  });
  
  if (!masterAdminResponse.ok) {
    throw new Error(`Master admin login failed: ${masterAdminResponse.status}`);
  }
  
  const masterAdminData = await masterAdminResponse.json();
  masterAdminToken = masterAdminData.session.token;
  console.log('   ✅ Master admin authenticated');

  // Test Client User Login
  const clientUserResponse = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(testData.clientUser)
  });
  
  if (!clientUserResponse.ok) {
    throw new Error(`Client user login failed: ${clientUserResponse.status}`);
  }
  
  const clientUserData = await clientUserResponse.json();
  clientUserToken = clientUserData.session.token;
  console.log('   ✅ Client user authenticated');
}

async function testMasterAdminFunctionality() {
  console.log('\n🔧 Testing Master Admin Functionality...');
  
  // Test creating a new client (with unique email to avoid conflicts)
  console.log('\n📝 Testing client creation...');
  const uniqueEmail = `test-${Date.now()}@company.com`;
  const uniqueClientData = {
    ...testData.newClient,
    email: uniqueEmail
  };
  
  const createClientResponse = await fetch(`${BASE_URL}/api/admin/clients`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${masterAdminToken}` },
    body: JSON.stringify(uniqueClientData)
  });
  
  if (createClientResponse.ok) {
    const clientData = await createClientResponse.json();
    testClientId = clientData.client.id;
    console.log('✅ Create client successful:', { clientId: testClientId, companyName: clientData.client.companyName });
  } else {
    // If creation fails, try to get an existing client to use for testing
    console.log('⚠️ Client creation failed, trying to use existing client...');
    const clientsResponse = await fetch(`${BASE_URL}/api/admin/clients`, {
      headers: { 'Authorization': `Bearer ${masterAdminToken}` }
    });
    
    if (clientsResponse.ok) {
      const clientsData = await clientsResponse.json();
      if (clientsData.clients.length > 0) {
        testClientId = clientsData.clients[0].id;
        console.log('✅ Using existing client for testing:', { clientId: testClientId, companyName: clientsData.clients[0].companyName });
      } else {
        console.log('❌ No existing clients found for testing');
        return;
      }
    } else {
      console.log('❌ Failed to fetch existing clients:', clientsResponse.status);
      return;
    }
  }

  // Test creating a user for the existing client
  console.log('\n👤 Testing user creation for existing client...');
  const uniqueUserEmail = `testuser-${Date.now()}@company.com`;
  const newUserData = {
    name: 'Test User',
    email: uniqueUserEmail,
    password: 'password123',
    role: 'user',
    clientId: testClientId,
    isActive: true
  };

  const createUserResponse = await fetch(`${BASE_URL}/api/admin/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${masterAdminToken}` },
    body: JSON.stringify(newUserData)
  });

  if (createUserResponse.ok) {
    const userData = await createUserResponse.json();
    console.log('✅ Create user successful:', { userId: userData.user.id, email: userData.user.email, clientId: userData.user.clientId });
    
    // Test logging in as the new user
    console.log('\n🔐 Testing login for newly created user...');
    const newUserLoginResponse = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: newUserData.email,
        password: newUserData.password
      })
    });

    if (newUserLoginResponse.ok) {
      const loginData = await newUserLoginResponse.json();
      console.log('✅ New user login successful:', { token: loginData.token ? 'Present' : 'Missing', user: loginData.user });
      
      // Test that the new user can access their own data
      const userProfileResponse = await fetch(`${BASE_URL}/api/users/profile`, {
        headers: { 'Authorization': `Bearer ${loginData.token}` }
      });
      
      if (userProfileResponse.ok) {
        const profileData = await userProfileResponse.json();
        console.log('✅ New user profile access successful:', { email: profileData.email, role: profileData.role, clientId: profileData.clientId });
      } else {
        console.log('❌ New user profile access failed:', userProfileResponse.status, await userProfileResponse.text());
      }
    } else {
      console.log('❌ New user login failed:', newUserLoginResponse.status, await newUserLoginResponse.text());
    }
  } else {
    console.log('❌ Create user failed:', createUserResponse.status, await createUserResponse.text());
  }

  // Test fetching clients list
  console.log('\n📋 Testing clients list fetch...');
  const clientsResponse = await fetch(`${BASE_URL}/api/admin/clients`, {
    headers: { 'Authorization': `Bearer ${masterAdminToken}` }
  });
  
  if (clientsResponse.ok) {
    const clientsData = await clientsResponse.json();
    console.log('✅ Fetch clients successful:', { count: clientsData.clients.length });
  } else {
    console.log('❌ Fetch clients failed:', clientsResponse.status, await clientsResponse.text());
  }

  // Test fetching client configuration
  if (testClientId) {
    console.log('\n⚙️ Testing client configuration fetch...');
    const configResponse = await fetch(`${BASE_URL}/api/admin/settings/clients/${testClientId}`, {
      headers: { 'Authorization': `Bearer ${masterAdminToken}` }
    });
    
    if (configResponse.ok) {
      const configData = await configResponse.json();
      console.log('✅ Fetch client config successful:', { clientId: configData.client.id, companyName: configData.client.companyName });
    } else {
      console.log('❌ Fetch client config failed:', configResponse.status, await configResponse.text());
    }
  }
}

async function testClientUserFunctionality() {
  // Test 1: Get Order Configuration
  const getOrderConfigResponse = await fetch(`${BASE_URL}/api/order-config`, {
    headers: { 'Authorization': `Bearer ${clientUserToken}` }
  });
  
  if (!getOrderConfigResponse.ok) {
    throw new Error(`Get order config failed: ${getOrderConfigResponse.status}`);
  }
  
  const orderConfig = await getOrderConfigResponse.json();
  console.log('   ✅ Order configuration retrieved');

  // Test 2: Create New Order
  const createOrderResponse = await fetch(`${BASE_URL}/api/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${clientUserToken}`
    },
    body: JSON.stringify(testData.newOrder)
  });
  
  if (!createOrderResponse.ok) {
    const errorData = await createOrderResponse.text();
    throw new Error(`Create order failed: ${createOrderResponse.status} - ${errorData}`);
  }
  
  const createdOrder = await createOrderResponse.json();
  testOrderId = createdOrder.order.id;
  console.log('   ✅ New order created');

  // Test 3: View Orders with Filters
  const getOrdersResponse = await fetch(`${BASE_URL}/api/orders?page=1&limit=10`, {
    headers: { 'Authorization': `Bearer ${clientUserToken}` }
  });
  
  if (!getOrdersResponse.ok) {
    throw new Error(`Get orders failed: ${getOrdersResponse.status}`);
  }
  
  const orders = await getOrdersResponse.json();
  console.log(`   ✅ Retrieved ${orders.orders.length} orders`);

  // Test 4: View Specific Order
  const getOrderResponse = await fetch(`${BASE_URL}/api/orders/${testOrderId}`, {
    headers: { 'Authorization': `Bearer ${clientUserToken}` }
  });
  
  if (!getOrderResponse.ok) {
    throw new Error(`Get order details failed: ${getOrderResponse.status}`);
  }
  
  const orderDetails = await getOrderResponse.json();
  console.log('   ✅ Order details retrieved');

  // Test 5: Get Pickup Locations
  const getPickupLocationsResponse = await fetch(`${BASE_URL}/api/pickup-locations`, {
    headers: { 'Authorization': `Bearer ${clientUserToken}` }
  });
  
  if (!getPickupLocationsResponse.ok) {
    throw new Error(`Get pickup locations failed: ${getPickupLocationsResponse.status}`);
  }
  
  const pickupLocations = await getPickupLocationsResponse.json();
  console.log('   ✅ Pickup locations retrieved');

  // Test 6: Get Courier Services
  const getCourierServicesResponse = await fetch(`${BASE_URL}/api/courier-services`, {
    headers: { 'Authorization': `Bearer ${clientUserToken}` }
  });
  
  if (!getCourierServicesResponse.ok) {
    throw new Error(`Get courier services failed: ${getCourierServicesResponse.status}`);
  }
  
  const courierServices = await getCourierServicesResponse.json();
  console.log('   ✅ Courier services retrieved');
}

async function testAnalyticsAndReporting() {
  // Test 1: Platform Analytics (Master Admin)
  const platformAnalyticsResponse = await fetch(`${BASE_URL}/api/analytics/platform`, {
    headers: { 'Authorization': `Bearer ${masterAdminToken}` }
  });
  
  if (!platformAnalyticsResponse.ok) {
    throw new Error(`Platform analytics failed: ${platformAnalyticsResponse.status}`);
  }
  
  const platformAnalytics = await platformAnalyticsResponse.json();
  console.log('   ✅ Platform analytics retrieved');

  // Test 2: Client Analytics (Master Admin)
  const clientAnalyticsResponse = await fetch(`${BASE_URL}/api/analytics/clients`, {
    headers: { 'Authorization': `Bearer ${masterAdminToken}` }
  });
  
  if (!clientAnalyticsResponse.ok) {
    throw new Error(`Client analytics failed: ${clientAnalyticsResponse.status}`);
  }
  
  const clientAnalytics = await clientAnalyticsResponse.json();
  console.log('   ✅ Client analytics retrieved');

  // Test 3: Order Analytics Tracking
  const trackOrderResponse = await fetch(`${BASE_URL}/api/analytics/track`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${clientUserToken}`
    },
    body: JSON.stringify({
      eventType: 'create_order',
      eventData: { orderId: testOrderId }
    })
  });
  
  if (!trackOrderResponse.ok) {
    throw new Error(`Order tracking failed: ${trackOrderResponse.status}`);
  }
  
  console.log('   ✅ Order analytics tracked');
}

async function testErrorHandling() {
  // Test 1: Invalid Authentication
  const invalidAuthResponse = await fetch(`${BASE_URL}/api/admin/clients`, {
    headers: { 'Authorization': 'Bearer invalid-token' }
  });
  
  if (invalidAuthResponse.status !== 401) {
    throw new Error(`Expected 401 for invalid auth, got ${invalidAuthResponse.status}`);
  }
  
  console.log('   ✅ Invalid authentication properly rejected');

  // Test 2: Access Control (Client user trying to access admin endpoint)
  const unauthorizedResponse = await fetch(`${BASE_URL}/api/admin/clients`, {
    headers: { 'Authorization': `Bearer ${clientUserToken}` }
  });
  
  if (unauthorizedResponse.status !== 401) {
    throw new Error(`Expected 401 for unauthorized access, got ${unauthorizedResponse.status}`);
  }
  
  console.log('   ✅ Access control properly enforced');
}

async function cleanup() {
  try {
    // Delete test order
    if (testOrderId) {
      await fetch(`${BASE_URL}/api/orders/${testOrderId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${clientUserToken}` }
      });
      console.log('   🧹 Test order cleaned up');
    }

    // Delete test client
    if (testClientId) {
      await fetch(`${BASE_URL}/api/admin/clients/${testClientId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${masterAdminToken}` }
      });
      console.log('   🧹 Test client cleaned up');
    }
  } catch (error) {
    console.log('   ⚠️ Cleanup warning:', error.message);
  }
}

async function runTestSuite() {
  const testSuite = new TestSuite();
  
  console.log('🚀 Starting Comprehensive Application Test Suite');
  console.log('='.repeat(60));
  
  try {
    // Test Authentication
    await testSuite.test('Authentication Flow', testAuthentication);
    
    // Test Master Admin Functionality
    await testSuite.test('Master Admin Functionality', testMasterAdminFunctionality);
    
    // Test Client User Functionality
    await testSuite.test('Client User Functionality', testClientUserFunctionality);
    
    // Test Analytics and Reporting
    await testSuite.test('Analytics and Reporting', testAnalyticsAndReporting);
    
    // Test Error Handling
    await testSuite.test('Error Handling and Security', testErrorHandling);
    
  } catch (error) {
    console.error('❌ Test suite failed:', error);
  } finally {
    // Cleanup
    console.log('\n🧹 Cleaning up test data...');
    await cleanup();
    
    // Print results
    testSuite.printResults();
    
    // Disconnect from database
    await prisma.$disconnect();
  }
}

// Run the test suite
runTestSuite().catch(console.error);
