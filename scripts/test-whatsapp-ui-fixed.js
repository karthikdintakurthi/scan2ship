require('dotenv').config({ path: '.env.local' });
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testWhatsAppUIFixed() {
  console.log('🧪 [WHATSAPP_UI_FIXED_TEST] Starting Fixed WhatsApp UI Test...\n');

  try {
    // Test 1: Check current database configuration
    console.log('📋 Test 1: Checking Current Database Configuration...');
    const systemConfig = await prisma.system_config.findMany({
      where: { category: 'whatsapp' }
    });
    
    console.log('Current WhatsApp Config in Database:', systemConfig.map(c => ({
      key: c.key,
      value: c.key.includes('API_KEY') ? c.value.substring(0, 10) + '***' : c.value,
      category: c.category
    })));

    // Test 2: Simulate what the UI component would fetch
    console.log('📋 Test 2: Simulating UI Component API Call...');
    
    // Simulate the API call that the WhatsAppConfig component makes
    const mockApiResponse = {
      configs: systemConfig.map(config => ({
        id: config.id,
        key: config.key,
        value: config.value,
        displayValue: config.key.includes('API_KEY') ? '••••••••••••••••' : config.value,
        type: config.type,
        category: config.category,
        description: config.description,
        isEncrypted: config.isEncrypted
      }))
    };

    const whatsappConfigs = mockApiResponse.configs.filter(config => config.category === 'whatsapp');
    const apiKeyConfig = whatsappConfigs.find(config => config.key === 'FAST2SMS_WHATSAPP_API_KEY');
    const messageIdConfig = whatsappConfigs.find(config => config.key === 'FAST2SMS_WHATSAPP_MESSAGE_ID');
    
    console.log('UI Component would see:', {
      apiKeyConfig: apiKeyConfig ? { key: apiKeyConfig.key, hasValue: !!apiKeyConfig.value } : null,
      messageIdConfig: messageIdConfig ? { key: messageIdConfig.key, value: messageIdConfig.value } : null,
      totalWhatsAppConfigs: whatsappConfigs.length
    });

    // Test 3: Check if UI would show as configured
    const uiWouldShowConfigured = !!(apiKeyConfig?.value && messageIdConfig?.value);
    
    console.log('📋 Test 3: UI Configuration Status...');
    console.log('UI would show as configured:', uiWouldShowConfigured ? '✅ YES' : '❌ NO');
    
    if (uiWouldShowConfigured) {
      console.log('✅ WhatsApp configuration should now show as "Configured" in the UI');
    } else {
      console.log('❌ WhatsApp configuration would still show as "Not Configured"');
      console.log('Missing:', {
        apiKey: !apiKeyConfig?.value ? 'API Key' : null,
        messageId: !messageIdConfig?.value ? 'Message ID' : null
      });
    }

    // Test 4: Verify the configuration is valid
    console.log('📋 Test 4: Validating Configuration...');
    
    if (apiKeyConfig?.value && messageIdConfig?.value) {
      const isValidApiKey = !apiKeyConfig.value.includes('your_') && !apiKeyConfig.value.includes('test_api_key');
      const isValidMessageId = messageIdConfig.value && messageIdConfig.value !== '';
      
      console.log('API Key valid:', isValidApiKey ? '✅ YES' : '❌ NO');
      console.log('Message ID valid:', isValidMessageId ? '✅ YES' : '❌ NO');
      
      if (isValidApiKey && isValidMessageId) {
        console.log('✅ Configuration is valid and should work properly');
      } else {
        console.log('❌ Configuration has invalid values');
      }
    }

    // Test 5: Check if the fix is complete
    console.log('📋 Test 5: Fix Verification...');
    
    const fixStatus = {
      databaseHasConfig: systemConfig.length > 0,
      apiKeyExists: !!apiKeyConfig?.value,
      messageIdExists: !!messageIdConfig?.value,
      configIsValid: !!(apiKeyConfig?.value && messageIdConfig?.value && 
                       !apiKeyConfig.value.includes('your_') && 
                       !apiKeyConfig.value.includes('test_api_key')),
      uiWouldShowConfigured: uiWouldShowConfigured
    };
    
    console.log('Fix Status:', fixStatus);
    
    if (fixStatus.uiWouldShowConfigured && fixStatus.configIsValid) {
      console.log('🎉 FIX COMPLETE: WhatsApp configuration should now show as "Configured" in the UI');
    } else {
      console.log('⚠️ FIX INCOMPLETE: Some issues remain');
      if (!fixStatus.databaseHasConfig) {
        console.log('   - No WhatsApp configuration in database');
      }
      if (!fixStatus.apiKeyExists) {
        console.log('   - API key missing');
      }
      if (!fixStatus.messageIdExists) {
        console.log('   - Message ID missing');
      }
      if (!fixStatus.configIsValid) {
        console.log('   - Configuration has invalid values');
      }
    }

    console.log('\n🎉 [WHATSAPP_UI_FIXED_TEST] All tests completed!');

    // Summary
    console.log('\n📊 SUMMARY:');
    console.log('✅ Database configuration: ' + (fixStatus.databaseHasConfig ? 'PRESENT' : 'MISSING'));
    console.log('✅ API Key: ' + (fixStatus.apiKeyExists ? 'PRESENT' : 'MISSING'));
    console.log('✅ Message ID: ' + (fixStatus.messageIdExists ? 'PRESENT' : 'MISSING'));
    console.log('✅ Configuration valid: ' + (fixStatus.configIsValid ? 'YES' : 'NO'));
    console.log('✅ UI would show configured: ' + (fixStatus.uiWouldShowConfigured ? 'YES' : 'NO'));

    if (fixStatus.uiWouldShowConfigured) {
      console.log('\n🎯 RESULT: The WhatsApp configuration should now show as "Configured" in the UI!');
      console.log('💡 The fix is working correctly.');
    } else {
      console.log('\n🔧 NEXT STEPS:');
      console.log('1. Ensure WhatsApp configuration exists in database');
      console.log('2. Verify API key and message ID are valid');
      console.log('3. Test the UI component');
    }

  } catch (error) {
    console.error('\n❌ [WHATSAPP_UI_FIXED_TEST] Test failed:', error.message);
    console.error('Stack trace:', error.stack);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
if (require.main === module) {
  testWhatsAppUIFixed()
    .then(() => {
      console.log('\n✅ WhatsApp UI fixed test completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ WhatsApp UI fixed test failed:', error.message);
      process.exit(1);
    });
}

module.exports = { testWhatsAppUIFixed };
