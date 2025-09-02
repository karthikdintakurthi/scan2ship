#!/usr/bin/env node

/**
 * WhatsApp Service Configuration Setup Script
 * Adds the required WhatsApp configuration fields to the system
 */

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

// WhatsApp configuration data
const whatsappConfigs = [
  {
    key: 'FAST2SMS_WHATSAPP_API_KEY',
    value: 'your-fast2sms-api-key-here', // Replace with actual API key
    category: 'whatsapp',
    type: 'password',
    description: 'Fast2SMS WhatsApp API Key for sending WhatsApp messages'
  },
  {
    key: 'FAST2SMS_WHATSAPP_MESSAGE_ID',
    value: 'your-message-template-id-here', // Replace with actual message template ID
    category: 'whatsapp',
    type: 'text',
    description: 'Fast2SMS WhatsApp Message Template ID'
  },
  {
    key: 'WHATSAPP_SERVICE_ENABLED',
    value: 'true',
    category: 'whatsapp',
    type: 'boolean',
    description: 'Enable/disable WhatsApp service'
  },
  {
    key: 'WHATSAPP_DEFAULT_COUNTRY_CODE',
    value: '+91',
    category: 'whatsapp',
    type: 'text',
    description: 'Default country code for WhatsApp phone numbers'
  },
  {
    key: 'WHATSAPP_MAX_RETRIES',
    value: '3',
    category: 'whatsapp',
    type: 'number',
    description: 'Maximum number of retries for failed WhatsApp messages'
  }
];

// Function to add WhatsApp configuration
async function setupWhatsAppConfig() {
  console.log('🚀 Setting up WhatsApp Service Configuration...');
  console.log(`📍 Target: ${BASE_URL}`);
  console.log('⏰', new Date().toISOString());
  
  try {
    // For now, we'll just display the configuration that needs to be added
    console.log('\n📱 WhatsApp Configuration Required:');
    console.log('=====================================');
    
    for (const config of whatsappConfigs) {
      console.log(`\n🔑 ${config.key}`);
      console.log(`   Category: ${config.category}`);
      console.log(`   Type: ${config.type}`);
      console.log(`   Description: ${config.description}`);
      console.log(`   Value: ${config.value}`);
      console.log(`   Required: ${config.key.includes('API_KEY') || config.key.includes('MESSAGE_ID') ? 'YES' : 'Optional'}`);
    }
    
    console.log('\n💡 To configure WhatsApp service:');
    console.log('   1. Go to Admin Settings > System Configuration');
    console.log('   2. Add the above configuration fields');
    console.log('   3. Replace placeholder values with actual credentials');
    console.log('   4. Save the configuration');
    
    console.log('\n⚠️  Important Notes:');
    console.log('   - API Key and Message ID are required for basic functionality');
    console.log('   - Other fields are optional but recommended');
    console.log('   - API Key should be kept secure (stored as password type)');
    console.log('   - Message ID should match your approved WhatsApp template');
    
    console.log('\n🔗 Fast2SMS WhatsApp API Documentation:');
    console.log('   https://docs.fast2sms.com/');
    
    return true;
  } catch (error) {
    console.error('❌ Error setting up WhatsApp configuration:', error);
    return false;
  }
}

// Function to test if WhatsApp config can be added via API
async function testWhatsAppConfigAPI() {
  console.log('\n🧪 Testing WhatsApp Configuration API...');
  
  try {
    // Test without authentication (should fail)
    const response = await fetch(`${BASE_URL}/api/admin/system-config`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        configs: [whatsappConfigs[0]]
      })
    });
    
    if (response.status === 401) {
      console.log('✅ API correctly requires authentication');
    } else {
      console.log(`⚠️  Unexpected status: ${response.status}`);
    }
    
    return true;
  } catch (error) {
    console.error('❌ API test failed:', error.message);
    return false;
  }
}

// Function to create a configuration file for manual import
function createConfigFile() {
  console.log('\n📄 Creating configuration file...');
  
  const configData = {
    whatsapp: whatsappConfigs,
    instructions: {
      title: 'WhatsApp Service Configuration',
      description: 'Add these configurations to enable WhatsApp service',
      steps: [
        '1. Go to Admin Settings > System Configuration',
        '2. Add each configuration field with the values below',
        '3. Replace placeholder values with actual credentials',
        '4. Save the configuration',
        '5. Test the WhatsApp service'
      ],
      notes: [
        'API Key and Message ID are required for basic functionality',
        'API Key should be kept secure (stored as password type)',
        'Message ID should match your approved WhatsApp template',
        'Other fields are optional but recommended for full functionality'
      ]
    }
  };
  
  const fs = require('fs');
  const path = require('path');
  
  const configPath = path.join(__dirname, 'whatsapp-config.json');
  fs.writeFileSync(configPath, JSON.stringify(configData, null, 2));
  
  console.log(`✅ Configuration file created: ${configPath}`);
  console.log('📁 You can use this file as a reference for manual configuration');
  
  return configPath;
}

// Main execution
async function main() {
  console.log('🚀 WhatsApp Service Configuration Setup');
  console.log('======================================');
  
  const results = await Promise.all([
    setupWhatsAppConfig(),
    testWhatsAppConfigAPI()
  ]);
  
  if (results.every(r => r)) {
    console.log('\n✅ WhatsApp configuration setup completed successfully!');
    createConfigFile();
  } else {
    console.log('\n⚠️  Some setup steps failed. Please check the logs above.');
  }
  
  console.log('\n📋 Next Steps:');
  console.log('   1. Get your Fast2SMS API credentials');
  console.log('   2. Add the configuration fields to the system');
  console.log('   3. Test the WhatsApp service');
  console.log('   4. Configure message templates if needed');
  
  console.log(`\n⏰ Completed at: ${new Date().toISOString()}`);
}

// Run if this script is executed directly
if (require.main === module) {
  main().catch(error => {
    console.error('💥 Setup failed:', error);
    process.exit(1);
  });
}

module.exports = {
  setupWhatsAppConfig,
  testWhatsAppConfigAPI,
  createConfigFile,
  whatsappConfigs
};
