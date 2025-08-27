require('dotenv').config({ path: '.env.local' });
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testWhatsAppUIConfiguration() {
  console.log('🧪 [WHATSAPP_UI_TEST] Starting WhatsApp UI Configuration Test...\n');

  try {
    // Test 1: Check system configuration in database
    console.log('📋 Test 1: Checking System Configuration in Database...');
    const systemConfig = await prisma.system_config.findMany({
      where: { category: 'whatsapp' }
    });
    
    console.log('System WhatsApp Config:', systemConfig.map(c => ({
      key: c.key,
      value: c.key.includes('API_KEY') ? c.value.substring(0, 10) + '***' : c.value,
      category: c.category
    })));

    if (systemConfig.length === 0) {
      throw new Error('No WhatsApp configuration found in system_config table');
    }

    const apiKeyConfig = systemConfig.find(c => c.key === 'FAST2SMS_WHATSAPP_API_KEY');
    const messageIdConfig = systemConfig.find(c => c.key === 'FAST2SMS_WHATSAPP_MESSAGE_ID');

    if (!apiKeyConfig || !apiKeyConfig.value || apiKeyConfig.value.includes('your_') || apiKeyConfig.value.includes('test_api_key')) {
      throw new Error('Invalid or placeholder API key found in database');
    }

    console.log('✅ System configuration in database is valid\n');

    // Test 2: Check environment variables
    console.log('📋 Test 2: Checking Environment Variables...');
    const envApiKey = process.env.FAST2SMS_WHATSAPP_API_KEY;
    const envMessageId = process.env.FAST2SMS_WHATSAPP_MESSAGE_ID;

    console.log('Environment API Key:', envApiKey ? envApiKey.substring(0, 10) + '***' : 'NOT SET');
    console.log('Environment Message ID:', envMessageId);

    if (!envApiKey || envApiKey.includes('your_')) {
      throw new Error('Invalid or placeholder API key in environment variables');
    }

    console.log('✅ Environment variables are valid\n');

    // Test 3: Check what the UI component would see
    console.log('📋 Test 3: Checking UI Component Configuration...');
    
    // Simulate what the WhatsAppConfig component sees
    const uiApiKey = process.env.NEXT_PUBLIC_FAST2SMS_WHATSAPP_API_KEY;
    const uiMessageId = process.env.NEXT_PUBLIC_FAST2SMS_WHATSAPP_MESSAGE_ID;
    
    console.log('UI Component API Key (NEXT_PUBLIC_):', uiApiKey ? uiApiKey.substring(0, 10) + '***' : 'NOT SET');
    console.log('UI Component Message ID (NEXT_PUBLIC_):', uiMessageId);

    if (!uiApiKey) {
      console.log('❌ UI Component cannot see API key - NEXT_PUBLIC_FAST2SMS_WHATSAPP_API_KEY not set');
      console.log('💡 This is why the UI shows "Not Configured"');
    } else {
      console.log('✅ UI Component can see API key');
    }

    if (!uiMessageId) {
      console.log('❌ UI Component cannot see Message ID - NEXT_PUBLIC_FAST2SMS_WHATSAPP_MESSAGE_ID not set');
    } else {
      console.log('✅ UI Component can see Message ID');
    }

    // Test 4: Check WhatsApp service status
    console.log('📋 Test 4: Checking WhatsApp Service Status...');
    
    // Import the WhatsApp service
    const whatsappService = require('../src/lib/whatsapp-service.ts').default;
    const status = whatsappService.getStatus();
    
    console.log('WhatsApp Service Status:', status);
    
    if (status.configured) {
      console.log('✅ WhatsApp service is properly configured');
    } else {
      console.log('❌ WhatsApp service is not configured:', status.missingFields);
    }

    // Test 5: Check if we need to expose environment variables to UI
    console.log('📋 Test 5: Checking Environment Variable Exposure...');
    
    const needsPublicVars = !uiApiKey || !uiMessageId;
    
    if (needsPublicVars) {
      console.log('❌ UI needs NEXT_PUBLIC_ environment variables to show "Configured" status');
      console.log('💡 Current issue: WhatsAppConfig component reads from NEXT_PUBLIC_ env vars');
      console.log('💡 But our config is only in server-side env vars and database');
    } else {
      console.log('✅ UI has access to all required environment variables');
    }

    console.log('\n🎉 [WHATSAPP_UI_TEST] All tests completed!');

    // Summary
    console.log('\n📊 SUMMARY:');
    console.log('✅ Database configuration: VALID');
    console.log('✅ Environment variables: VALID');
    console.log('✅ WhatsApp service: ' + (status.configured ? 'CONFIGURED' : 'NOT CONFIGURED'));
    console.log('❌ UI component: ' + (needsPublicVars ? 'MISSING PUBLIC ENV VARS' : 'CONFIGURED'));

    if (needsPublicVars) {
      console.log('\n🔧 FIX REQUIRED:');
      console.log('The WhatsAppConfig component needs to be updated to:');
      console.log('1. Fetch configuration from database via API endpoint');
      console.log('2. OR expose environment variables as NEXT_PUBLIC_');
      console.log('3. OR modify the component to use server-side configuration');
    }

  } catch (error) {
    console.error('\n❌ [WHATSAPP_UI_TEST] Test failed:', error.message);
    console.error('Stack trace:', error.stack);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
if (require.main === module) {
  testWhatsAppUIConfiguration()
    .then(() => {
      console.log('\n✅ WhatsApp UI test completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ WhatsApp UI test failed:', error.message);
      process.exit(1);
    });
}

module.exports = { testWhatsAppUIConfiguration };
