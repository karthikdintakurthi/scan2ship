#!/usr/bin/env node

/**
 * Test order deletion with existing mapped client
 */

// Using built-in fetch (Node.js 18+)

async function testExistingMappedClient() {
  console.log('🧪 Testing order deletion with existing mapped client...\n');

  try {
    // Step 1: Login as master admin
    console.log('📡 Step 1: Logging in as master admin...');
    const loginResponse = await fetch('https://qa.scan2ship.in/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'karthik@scan2ship.in', password: 'admin123' })
    });

    if (!loginResponse.ok) {
      console.log('❌ Login failed:', loginResponse.status);
      return;
    }

    const loginData = await loginResponse.json();
    const token = loginData.session?.token;
    console.log('✅ Master login successful');

    // Step 2: Create a test order with products for the mapped client
    // We'll use the Yoganand Ch client (client-1756319181164-s6ds2994c)
    console.log('\n📡 Step 2: Creating test order for mapped client...');
    const orderData = {
      name: 'Mapped Client Test',
      mobile: '9876543210',
      address: 'Test Address',
      city: 'Test City',
      state: 'Test State',
      country: 'India',
      pincode: '123456',
      courier_service: 'test',
      pickup_location: 'test',
      package_value: 100,
      weight: 1,
      total_items: 1,
      is_cod: false,
      clientId: 'client-1756319181164-s6ds2994c', // Use the mapped client ID
      products: [
        {
          product: {
            sku: 'VFJ-78687',
            name: 'Test Product'
          },
          quantity: 1
        }
      ]
    };

    const createResponse = await fetch('https://qa.scan2ship.in/api/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(orderData)
    });

    if (!createResponse.ok) {
      console.log('❌ Order creation failed:', createResponse.status);
      const errorData = await createResponse.json();
      console.log('Error:', errorData);
      return;
    }

    const createData = await createResponse.json();
    const orderId = createData.order.id;
    console.log('✅ Order created successfully for mapped client:', orderId);

    // Step 3: Check the order details
    console.log('\n📡 Step 3: Checking order details...');
    const getOrderResponse = await fetch(`https://qa.scan2ship.in/api/orders/${orderId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      }
    });

    if (getOrderResponse.ok) {
      const orderDetails = await getOrderResponse.json();
      console.log('✅ Order details:');
      console.log('Order ID:', orderDetails.id);
      console.log('Client ID:', orderDetails.clientId);
      console.log('Products:', orderDetails.products);
    }

    // Step 4: Delete the order and check for inventory restoration
    console.log('\n📡 Step 4: Deleting order with inventory restoration...');
    const deleteResponse = await fetch('https://qa.scan2ship.in/api/orders', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ orderIds: [orderId] })
    });

    if (!deleteResponse.ok) {
      console.log('❌ Order deletion failed:', deleteResponse.status);
      const errorData = await deleteResponse.json();
      console.log('Error:', errorData);
      return;
    }

    const deleteData = await deleteResponse.json();
    console.log('✅ Order deleted successfully');
    console.log('Delete response:', JSON.stringify(deleteData, null, 2));

    if (deleteData.inventoryRestorations && deleteData.inventoryRestorations.length > 0) {
      console.log('🎉 SUCCESS: Inventory restoration was triggered!');
      deleteData.inventoryRestorations.forEach((restoration, index) => {
        console.log(`  ${index + 1}. Order ${restoration.orderId}: ${restoration.success ? 'SUCCESS' : 'FAILED'}`);
        if (restoration.success) {
          console.log(`     Restored ${restoration.restoredItems} items`);
        } else {
          console.log(`     Error: ${restoration.error}`);
        }
      });
    } else {
      console.log('❌ No inventory restoration results found');
      console.log('This means the inventory restoration logic is still not working');
    }

    console.log('\n🎯 Test Summary:');
    console.log('1. ✅ Master admin login successful');
    console.log('2. ✅ Order created for mapped client');
    console.log('3. ✅ Order deleted');
    console.log('4. 🔍 Inventory restoration results checked');

  } catch (error) {
    console.error('❌ Error during test:', error);
  }
}

// Run the test
testExistingMappedClient();
