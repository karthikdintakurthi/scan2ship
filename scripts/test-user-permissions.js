#!/usr/bin/env node

/**
 * Test script to verify user permissions for order deletion
 * This tests that client users (UserRole.USER) can now delete orders
 */

const BASE_URL = 'http://localhost:3000';

// Test user credentials (you'll need to update these)
const TEST_USER_EMAIL = 'client@example.com'; // Update with actual client user email
const TEST_USER_PASSWORD = 'password123'; // Update with actual password

async function testUserPermissions() {
  console.log('🧪 Testing User Permissions for Order Deletion');
  console.log('==============================================\n');

  try {
    // Step 1: Login as client user
    console.log('1️⃣ Logging in as client user...');
    const loginResponse = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: TEST_USER_EMAIL,
        password: TEST_USER_PASSWORD
      })
    });

    if (!loginResponse.ok) {
      const errorData = await loginResponse.json();
      console.error('❌ Login failed:', errorData);
      return;
    }

    const loginData = await loginResponse.json();
    const authToken = loginData.token;
    
    console.log('✅ Login successful');
    console.log(`   User ID: ${loginData.user.id}`);
    console.log(`   Role: ${loginData.user.role}`);
    console.log(`   Client: ${loginData.user.client.companyName}`);

    // Step 2: Test if user can access orders (READ permission)
    console.log('\n2️⃣ Testing READ permission (orders list)...');
    const ordersResponse = await fetch(`${BASE_URL}/api/orders`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    if (ordersResponse.ok) {
      const ordersData = await ordersResponse.json();
      console.log('✅ READ permission working - Orders accessible');
      console.log(`   Orders count: ${ordersData.orders?.length || 0}`);
      
      if (ordersData.orders && ordersData.orders.length > 0) {
        const testOrderId = ordersData.orders[0].id;
        console.log(`   Test order ID: ${testOrderId}`);
        
        // Step 3: Test DELETE permission on individual order
        console.log('\n3️⃣ Testing DELETE permission (individual order)...');
        const deleteResponse = await fetch(`${BASE_URL}/api/orders/${testOrderId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${authToken}`
          }
        });

        if (deleteResponse.ok) {
          console.log('✅ DELETE permission working - Order can be deleted');
        } else {
          const errorData = await deleteResponse.json();
          console.error('❌ DELETE permission failed:', errorData);
        }
      } else {
        console.log('⚠️ No orders available for DELETE test');
      }
    } else {
      const errorData = await ordersResponse.json();
      console.error('❌ READ permission failed:', errorData);
    }

    // Step 4: Test bulk delete permission
    console.log('\n4️⃣ Testing bulk DELETE permission...');
    const bulkDeleteResponse = await fetch(`${BASE_URL}/api/orders`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        orderIds: [999999] // Use a non-existent order ID to test permission without actually deleting
      })
    });

    if (bulkDeleteResponse.ok) {
      console.log('✅ Bulk DELETE permission working');
    } else {
      const errorData = await bulkDeleteResponse.json();
      if (errorData.error && errorData.error.includes('not found')) {
        console.log('✅ Bulk DELETE permission working (expected 404 for non-existent order)');
      } else {
        console.error('❌ Bulk DELETE permission failed:', errorData);
      }
    }

    console.log('\n🎉 Permission test completed!');

  } catch (error) {
    console.error('❌ Test failed with error:', error);
  }
}

// Run the test
if (require.main === module) {
  testUserPermissions();
}

module.exports = { testUserPermissions };
