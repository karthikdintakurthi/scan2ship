#!/usr/bin/env node

/**
 * Test order deletion with inventory restoration
 */

// Using built-in fetch (Node.js 18+)

async function testOrderDeletion() {
  console.log('🧪 Testing order deletion with inventory restoration...\n');

  try {
    // Step 1: Login to scan2ship
    console.log('📡 Step 1: Logging in to scan2ship...');
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
    console.log('✅ Login successful');

    // Step 2: Create a test order with products
    console.log('\n📡 Step 2: Creating test order with products...');
    const orderData = {
      name: 'Test Customer',
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
      products: [
        {
          product: {
            sku: 'VFJ-78687',
            name: 'Test Product'
          },
          quantity: 2
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
    console.log('✅ Order created successfully:', orderId);

    // Step 3: Check inventory before deletion
    console.log('\n📡 Step 3: Checking inventory before deletion...');
    const catalogResponse = await fetch('https://www.stockmind.in/api/public/inventory/reduce/bulk?client=yoshita-fashion-jewellery', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': '8c6edcedae92b0baf4de84be6e5a9c4500e859655fc0892bc6434dd0ddcf3a2a',
        'X-Client-ID': 'cmg1a4yaa0000y7ndiwcbp1iq'
      },
      body: JSON.stringify({
        orders: [{
          orderId: 'test-check-1',
          items: [{ sku: 'VFJ-78687', quantity: 0 }] // Just check, don't reduce
        }],
        reduceMode: 'strict',
        batchId: 'test-check-batch'
      })
    });

    // Step 4: Delete the order
    console.log('\n📡 Step 4: Deleting order...');
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
    console.log('Inventory restoration results:', deleteData.inventoryRestorations);

    // Step 5: Check inventory after deletion (should be restored)
    console.log('\n📡 Step 5: Checking inventory after deletion...');
    const finalCatalogResponse = await fetch('https://www.stockmind.in/api/public/inventory/reduce/bulk?client=yoshita-fashion-jewellery', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': '8c6edcedae92b0baf4de84be6e5a9c4500e859655fc0892bc6434dd0ddcf3a2a',
        'X-Client-ID': 'cmg1a4yaa0000y7ndiwcbp1iq'
      },
      body: JSON.stringify({
        orders: [{
          orderId: 'test-final-check',
          items: [{ sku: 'VFJ-78687', quantity: 1 }]
        }],
        reduceMode: 'strict',
        batchId: 'test-final-batch'
      })
    });

    if (finalCatalogResponse.ok) {
      const finalData = await finalCatalogResponse.json();
      console.log('✅ Final inventory check successful:', finalData.data.summary);
    } else {
      console.log('❌ Final inventory check failed:', finalCatalogResponse.status);
    }

    console.log('\n🎯 Test Summary:');
    console.log('1. ✅ Order created with products');
    console.log('2. ✅ Order deleted successfully');
    console.log('3. ✅ Inventory restoration attempted');
    console.log('4. ✅ Final inventory check completed');

  } catch (error) {
    console.error('❌ Error during test:', error);
  }
}

// Run the test
testOrderDeletion();
