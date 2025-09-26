#!/usr/bin/env node

/**
 * Debug order deletion to see why restore call is not being made
 */

// Using built-in fetch (Node.js 18+)

async function debugOrderDeletion() {
  console.log('🔍 Debugging order deletion and inventory restoration...\n');

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
    console.log('User:', loginData.user?.email, 'Role:', loginData.user?.role);
    console.log('Client:', loginData.user?.client?.name, 'ID:', loginData.user?.client?.id);
    console.log('Full login data:', JSON.stringify(loginData, null, 2));

    // Step 2: Create a test order with products
    console.log('\n📡 Step 2: Creating test order with products...');
    const orderData = {
      name: 'Debug Customer',
      mobile: '9876543210',
      address: 'Debug Address',
      city: 'Debug City',
      state: 'Debug State',
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
    console.log('Order products:', createData.order.products);

    // Step 3: Get the order details to see what's stored
    console.log('\n📡 Step 3: Getting order details...');
    const getOrderResponse = await fetch(`https://qa.scan2ship.in/api/orders/${orderId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      }
    });

    if (getOrderResponse.ok) {
      const orderDetails = await getOrderResponse.json();
      console.log('✅ Order details retrieved:');
      console.log('Order ID:', orderDetails.id);
      console.log('Products field:', orderDetails.products);
      console.log('Products type:', typeof orderDetails.products);
      
      if (orderDetails.products) {
        try {
          const parsedProducts = JSON.parse(orderDetails.products);
          console.log('Parsed products:', parsedProducts);
          console.log('Is array:', Array.isArray(parsedProducts));
          console.log('Length:', parsedProducts.length);
        } catch (parseError) {
          console.log('❌ Error parsing products:', parseError);
        }
      } else {
        console.log('⚠️ No products field found in order');
      }
    } else {
      console.log('❌ Failed to get order details:', getOrderResponse.status);
    }

    // Step 4: Check catalog auth
    console.log('\n📡 Step 4: Checking catalog auth...');
    const catalogAuthResponse = await fetch('https://qa.scan2ship.in/api/catalog', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        action: 'test_connection',
        data: {}
      })
    });

    if (catalogAuthResponse.ok) {
      const catalogAuthData = await catalogAuthResponse.json();
      console.log('✅ Catalog auth check successful:', catalogAuthData);
    } else {
      const catalogAuthError = await catalogAuthResponse.json();
      console.log('❌ Catalog auth check failed:', catalogAuthError);
    }

    // Step 5: Delete the order and see what happens
    console.log('\n📡 Step 5: Deleting order...');
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

    console.log('\n🎯 Debug Summary:');
    console.log('1. ✅ Order created and retrieved');
    console.log('2. ✅ Products data checked');
    console.log('3. ✅ Catalog auth checked');
    console.log('4. ✅ Order deleted');
    console.log('5. 🔍 Check delete response for inventory restoration results');

  } catch (error) {
    console.error('❌ Error during debug:', error);
  }
}

// Run the debug
debugOrderDeletion();
