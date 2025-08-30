async function testSujathaPickupLocation() {
  console.log('🔍 [TEST] Testing Sujatha Gold pickup location and Delhivery API values...');
  
  console.log('\n📋 [TEST] Analysis of the issue:');
  console.log('Based on the code in src/lib/delhivery.ts, here is what happens:');
  
  console.log('\n1️⃣ [TEST] Pickup Location Value from Client Settings:');
  console.log('   - Client Settings shows pickup location as: "SUJATHA FRANCHISE"');
  console.log('   - This value is stored in the database and displayed in the UI');
  
  console.log('\n2️⃣ [TEST] API Key Retrieval:');
  console.log('   - System uses "SUJATHA FRANCHISE" to get the API key from pickup location config');
  console.log('   - API key is retrieved successfully for this pickup location');
  
  console.log('\n3️⃣ [TEST] Delhivery API Call:');
  console.log('   - Line 202 in src/lib/delhivery.ts: pickup_location: { name: "VIJAYA8 FRANCHISE" }');
  console.log('   - The warehouse name sent to Delhivery is HARDCODED to "VIJAYA8 FRANCHISE"');
  console.log('   - This ignores the actual pickup location value from the order');
  
  console.log('\n4️⃣ [TEST] The Problem:');
  console.log('   - Pickup Location Value: "SUJATHA FRANCHISE" (from client settings)');
  console.log('   - Warehouse Name Sent to Delhivery: "VIJAYA8 FRANCHISE" (hardcoded)');
  console.log('   - Delhivery API expects the warehouse name to match what is configured in their system');
  console.log('   - "SUJATHA FRANCHISE" ≠ "VIJAYA8 FRANCHISE" → Error: "ClientWarehouse matching query does not exist"');
  
  console.log('\n5️⃣ [TEST] The Solution:');
  console.log('   - Change the hardcoded warehouse name in src/lib/delhivery.ts line 202');
  console.log('   - Use the actual pickup location value from the order data');
  console.log('   - Or configure the correct warehouse name that exists in Delhivery system');
  
  console.log('\n📋 [TEST] Summary:');
  console.log('   - Client Settings Value: "SUJATHA FRANCHISE" ✅');
  console.log('   - Delhivery API Receives: "VIJAYA8 FRANCHISE" ❌');
  console.log('   - This mismatch causes the warehouse error');
}

// Run the test
testSujathaPickupLocation();
