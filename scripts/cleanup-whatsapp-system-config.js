#!/usr/bin/env node

/**
 * Cleanup WhatsApp System Configuration Script
 * Removes any existing WhatsApp configurations from the system level
 * since they should now be client-specific
 */

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

async function cleanupWhatsAppSystemConfig() {
  console.log('🧹 Cleaning up WhatsApp system configurations...');
  console.log(`📍 Target: ${BASE_URL}`);
  console.log('⏰', new Date().toISOString());
  
  try {
    // This script would need to be run with proper authentication
    // For now, it just provides instructions
    
    console.log('\n📋 WhatsApp Configuration Cleanup Instructions:');
    console.log('===============================================');
    
    console.log('\n🔍 Step 1: Check Current System Configurations');
    console.log('   - Go to Admin Settings > System Configuration');
    console.log('   - Look for any configurations with category "whatsapp"');
    console.log('   - Note down the configuration IDs that need to be removed');
    
    console.log('\n🗑️  Step 2: Remove WhatsApp Configurations');
    console.log('   - Use the DELETE method on /api/admin/system-config');
    console.log('   - Remove these WhatsApp-related configurations:');
    console.log('     • FAST2SMS_WHATSAPP_API_KEY');
    console.log('     • FAST2SMS_WHATSAPP_MESSAGE_ID');
    console.log('     • WHATSAPP_SERVICE_ENABLED');
    console.log('     • WHATSAPP_DEFAULT_COUNTRY_CODE');
    console.log('     • WHATSAPP_MAX_RETRIES');
    
    console.log('\n✅ Step 3: Verify Cleanup');
    console.log('   - Refresh the System Configuration page');
    console.log('   - Confirm no WhatsApp configurations are displayed');
    console.log('   - Check that the blue info note appears');
    
    console.log('\n💡 Alternative: Database Cleanup');
    console.log('   If you have database access, you can run:');
    console.log('   ```sql');
    console.log('   DELETE FROM system_config WHERE category = \'whatsapp\';');
    console.log('   ```');
    
    console.log('\n⚠️  Important Notes:');
    console.log('   - WhatsApp configurations are now client-specific');
    console.log('   - Each client manages their own WhatsApp settings');
    console.log('   - System-level WhatsApp configs are no longer needed');
    console.log('   - Client settings can be found at: /admin/settings/clients/[clientId]');
    
    console.log('\n🔗 Related Files:');
    console.log('   - Client WhatsApp Config: src/components/WhatsAppConfig.tsx');
    console.log('   - Client Settings: src/app/admin/settings/clients/[id]/page.tsx');
    console.log('   - System Settings: src/app/admin/settings/page.tsx');
    
    return true;
  } catch (error) {
    console.error('❌ Error during cleanup instructions:', error);
    return false;
  }
}

// Function to check if there are WhatsApp configs in system
async function checkWhatsAppSystemConfigs() {
  console.log('\n🔍 Checking for WhatsApp system configurations...');
  
  try {
    // This would require authentication in a real scenario
    console.log('   Note: This check requires authentication');
    console.log('   - Check Admin Settings > System Configuration');
    console.log('   - Look for "whatsapp" category configurations');
    console.log('   - If found, they should be removed');
    
    return true;
  } catch (error) {
    console.error('❌ Error checking configurations:', error);
    return false;
  }
}

// Main execution
async function main() {
  console.log('🧹 WhatsApp System Configuration Cleanup');
  console.log('========================================');
  
  const results = await Promise.all([
    cleanupWhatsAppSystemConfig(),
    checkWhatsAppSystemConfigs()
  ]);
  
  if (results.every(r => r)) {
    console.log('\n✅ Cleanup instructions completed successfully!');
  } else {
    console.log('\n⚠️  Some cleanup steps failed. Please check the logs above.');
  }
  
  console.log('\n📋 Next Steps:');
  console.log('   1. Remove any existing WhatsApp system configurations');
  console.log('   2. Verify System Settings page no longer shows WhatsApp configs');
  console.log('   3. Configure WhatsApp for individual clients as needed');
  console.log('   4. Test client-specific WhatsApp functionality');
  
  console.log(`\n⏰ Completed at: ${new Date().toISOString()}`);
}

// Run if this script is executed directly
if (require.main === module) {
  main().catch(error => {
    console.error('💥 Cleanup failed:', error);
    process.exit(1);
  });
}

module.exports = {
  cleanupWhatsAppSystemConfig,
  checkWhatsAppSystemConfigs
};
