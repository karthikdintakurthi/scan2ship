const { PrismaClient } = require('@prisma/client');
require('dotenv').config({ path: '.env.local' });

const prisma = new PrismaClient();

async function verifyOrderIdPrefix() {
  console.log('🔍 [VERIFY] ===== ORDER ID PREFIX VERIFICATION ====');
  console.log('🔍 [VERIFY] This script will help you verify the Order ID Prefix functionality');
  console.log('🔍 [VERIFY] Run this after testing the UI to see what actually happened');
  
  try {
    const clientId = 'client-1756297715470-3hwkwcugb';
    
    console.log('\n📋 [VERIFY] Step 1: Checking current database state...');
    const client = await prisma.clients.findUnique({
      where: { id: clientId },
      include: {
        client_order_configs: true
      }
    });
    
    if (!client) {
      throw new Error(`Client ${clientId} not found`);
    }
    
    const orderConfig = client.client_order_configs;
    if (!orderConfig) {
      throw new Error('No order configuration found');
    }
    
    console.log('📊 [VERIFY] Current database state:');
    console.log('   - Client:', client.companyName);
    console.log('   - Order config ID:', orderConfig.id);
    console.log('   - enableOrderIdPrefix:', orderConfig.enableOrderIdPrefix);
    console.log('   - Type:', typeof orderConfig.enableOrderIdPrefix);
    
    // Test the checkbox logic
    console.log('\n📋 [VERIFY] Step 2: Testing checkbox logic...');
    const checkboxLogic = orderConfig.enableOrderIdPrefix !== false;
    console.log('🔍 [VERIFY] Checkbox logic: config.clientOrderConfig?.enableOrderIdPrefix !== false');
    console.log('🔍 [VERIFY] Result:', checkboxLogic);
    console.log('🔍 [VERIFY] This means checkbox should be:', checkboxLogic ? 'CHECKED' : 'UNCHECKED');
    
    // Show what the UI should display
    console.log('\n📋 [VERIFY] Step 3: UI State Analysis...');
    console.log('🔍 [VERIFY] Based on the current database value:');
    
    if (orderConfig.enableOrderIdPrefix === true) {
      console.log('   ✅ Database value: true');
      console.log('   ✅ Checkbox logic: true !== false → true');
      console.log('   ✅ UI should show: CHECKED checkbox');
      console.log('   ✅ Reference numbers will be: ABC123-9876543210 format');
    } else if (orderConfig.enableOrderIdPrefix === false) {
      console.log('   ✅ Database value: false');
      console.log('   ✅ Checkbox logic: false !== false → false');
      console.log('   ✅ UI should show: UNCHECKED checkbox');
      console.log('   ✅ Reference numbers will be: 9876543210 format (mobile only)');
    } else {
      console.log('   ⚠️ Database value:', orderConfig.enableOrderIdPrefix);
      console.log('   ⚠️ Checkbox logic:', orderConfig.enableOrderIdPrefix, '!== false →', checkboxLogic);
      console.log('   ⚠️ UI should show:', checkboxLogic ? 'CHECKED' : 'UNCHECKED', 'checkbox');
      console.log('   ⚠️ This is unexpected - value should be true or false');
    }
    
    // Instructions for testing
    console.log('\n📋 [VERIFY] Step 4: Testing Instructions...');
    console.log('🔍 [VERIFY] To test the functionality:');
    console.log('   1. Go to admin settings for this client');
    console.log('   2. Find the "Order ID Settings" section');
    console.log('   3. Look at the "Enable Order ID Prefix" checkbox');
    console.log('   4. The checkbox should be:', checkboxLogic ? 'CHECKED' : 'UNCHECKED');
    console.log('   5. Try unchecking it and saving');
    console.log('   6. Refresh the page');
    console.log('   7. The checkbox should remain unchecked');
    console.log('   8. Run this script again to verify the database value');
    
    // Show the expected behavior
    console.log('\n📋 [VERIFY] Step 5: Expected Behavior...');
    console.log('🔍 [VERIFY] When you uncheck the checkbox:');
    console.log('   - Frontend state updates immediately');
    console.log('   - Save button becomes enabled');
    console.log('   - Clicking save sends PUT /api/order-config');
    console.log('   - Database updates with enableOrderIdPrefix: false');
    console.log('   - Page refresh loads the new value');
    console.log('   - Checkbox shows as unchecked');
    
    // Troubleshooting
    console.log('\n📋 [VERIFY] Step 6: Troubleshooting...');
    console.log('🔍 [VERIFY] If the checkbox is not working:');
    console.log('   1. Check browser console for JavaScript errors');
    console.log('   2. Check Network tab for failed API calls');
    console.log('   3. Try hard refresh (Ctrl+F5 or Cmd+Shift+R)');
    console.log('   4. Clear browser cache');
    console.log('   5. Check if you have the correct permissions (admin/master_admin)');
    
    console.log('\n✅ [VERIFY] ===== VERIFICATION COMPLETED ====');
    
  } catch (error) {
    console.error('❌ [VERIFY] Verification failed with error:', error);
    console.error('❌ [VERIFY] Error stack:', error.stack);
  } finally {
    await prisma.$disconnect();
    console.log('\n🔌 [VERIFY] Database connection closed');
  }
}

// Run the verification
verifyOrderIdPrefix();
