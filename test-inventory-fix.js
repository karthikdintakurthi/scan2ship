#!/usr/bin/env node

/**
 * Test script to verify inventory reduction fix
 */

// Using built-in fetch (Node.js 18+)

async function testInventoryReduction() {
  console.log('🧪 Testing inventory reduction fix...\n');

  try {
    // Test the catalog app bulk inventory reduction endpoint directly
    const catalogUrl = 'https://www.stockmind.in';
    const testData = {
      orders: [{
        orderId: `test_${Date.now()}`,
        items: [{
          sku: 'TEST-SKU-001',
          quantity: 1
        }]
      }],
      reduceMode: 'strict',
      batchId: `test_batch_${Date.now()}`
    };

    console.log('📡 Testing catalog app bulk inventory reduction endpoint...');
    console.log('URL:', `${catalogUrl}/api/public/inventory/reduce/bulk?client=test-client`);
    console.log('Data:', JSON.stringify(testData, null, 2));

    const response = await fetch(`${catalogUrl}/api/public/inventory/reduce/bulk?client=test-client`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData)
    });

    console.log('\n📊 Response Status:', response.status);
    console.log('📊 Response Headers:', Object.fromEntries(response.headers.entries()));

    const result = await response.json();
    console.log('📊 Response Body:', JSON.stringify(result, null, 2));

    if (response.ok) {
      console.log('\n✅ Catalog app bulk inventory endpoint is working!');
    } else {
      console.log('\n❌ Catalog app bulk inventory endpoint failed');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testInventoryReduction();
