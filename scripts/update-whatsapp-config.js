const { PrismaClient } = require('@prisma/client');
require('dotenv').config({ path: '.env.local' });

const prisma = new PrismaClient();

async function updateWhatsAppConfig() {
  try {
    console.log('🔧 Updating WhatsApp configuration...');

    // Get the WhatsApp API key from environment or prompt user
    const apiKey = process.env.FAST2SMS_WHATSAPP_API_KEY || '';
    
    if (!apiKey) {
      console.log('⚠️  No WhatsApp API key found in environment variables.');
      console.log('💡 Please set FAST2SMS_WHATSAPP_API_KEY in your .env.local file or configure it through the admin dashboard.');
      console.log('📝 Example: FAST2SMS_WHATSAPP_API_KEY=your_api_key_here');
      return;
    }

    // Update the WhatsApp API key
    const updatedConfig = await prisma.systemConfig.update({
      where: {
        key: 'FAST2SMS_WHATSAPP_API_KEY'
      },
      data: {
        value: apiKey,
        updatedAt: new Date()
      }
    });

    console.log('✅ WhatsApp API key updated successfully!');
    console.log('📱 API Key:', apiKey.substring(0, 8) + '***');
    console.log('🆔 Message ID: 4697');

    // Verify the configuration
    const whatsappConfigs = await prisma.systemConfig.findMany({
      where: { category: 'whatsapp' }
    });

    console.log('\n📊 Current WhatsApp Configuration:');
    whatsappConfigs.forEach(config => {
      if (config.key === 'FAST2SMS_WHATSAPP_API_KEY') {
        console.log(`  ${config.key}: ${config.value ? config.value.substring(0, 8) + '***' : 'Not set'}`);
      } else {
        console.log(`  ${config.key}: ${config.value}`);
      }
    });

  } catch (error) {
    console.error('❌ Error updating WhatsApp configuration:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
updateWhatsAppConfig();
