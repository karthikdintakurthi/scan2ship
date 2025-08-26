const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');
require('dotenv').config({ path: '.env.local' });

const prisma = new PrismaClient();

// Encryption key for decrypting existing data
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'vanitha-logistics-encryption-key-2024';

// Helper function to decrypt existing encrypted data
function decrypt(encryptedText) {
  try {
    const decipher = crypto.createDecipher('aes-256-cbc', ENCRYPTION_KEY);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    console.error('❌ Error decrypting value:', error);
    return encryptedText; // Return as-is if decryption fails
  }
}

async function disableEncryption() {
  try {
    console.log('🔧 Starting encryption disable process...');

    // 1. Update system configurations
    console.log('📝 Updating system configurations...');
    const systemConfigs = await prisma.systemConfig.findMany({
      where: { isEncrypted: true }
    });

    for (const config of systemConfigs) {
      try {
        let decryptedValue = config.value;
        
        // Try to decrypt if it looks like encrypted data (96 characters hex)
        if (config.value && config.value.length === 96 && /^[0-9a-fA-F]+$/.test(config.value)) {
          decryptedValue = decrypt(config.value);
          console.log(`🔓 Decrypted system config: ${config.key}`);
        }

        await prisma.systemConfig.update({
          where: { id: config.id },
          data: {
            value: decryptedValue,
            isEncrypted: false
          }
        });
        
        console.log(`✅ Updated system config: ${config.key}`);
      } catch (error) {
        console.error(`❌ Error updating system config ${config.key}:`, error);
      }
    }

    // 2. Update client configurations
    console.log('📝 Updating client configurations...');
    const clientConfigs = await prisma.clientConfig.findMany({
      where: { isEncrypted: true }
    });

    for (const config of clientConfigs) {
      try {
        let decryptedValue = config.value;
        
        // Try to decrypt if it looks like encrypted data (96 characters hex)
        if (config.value && config.value.length === 96 && /^[0-9a-fA-F]+$/.test(config.value)) {
          decryptedValue = decrypt(config.value);
          console.log(`🔓 Decrypted client config: ${config.key} for client ${config.clientId}`);
        }

        await prisma.clientConfig.update({
          where: { id: config.id },
          data: {
            value: decryptedValue,
            isEncrypted: false
          }
        });
        
        console.log(`✅ Updated client config: ${config.key} for client ${config.clientId}`);
      } catch (error) {
        console.error(`❌ Error updating client config ${config.key}:`, error);
      }
    }

    // 3. Update pickup locations (Delhivery API keys)
    console.log('📝 Updating pickup locations...');
    const pickupLocations = await prisma.pickupLocation.findMany({
      where: {
        delhiveryApiKey: {
          not: null
        }
      }
    });

    for (const location of pickupLocations) {
      try {
        let decryptedValue = location.delhiveryApiKey;
        
        // Try to decrypt if it looks like encrypted data (96 characters hex)
        if (location.delhiveryApiKey && location.delhiveryApiKey.length === 96 && /^[0-9a-fA-F]+$/.test(location.delhiveryApiKey)) {
          decryptedValue = decrypt(location.delhiveryApiKey);
          console.log(`🔓 Decrypted Delhivery API key for pickup location: ${location.label}`);
        }

        await prisma.pickupLocation.update({
          where: { id: location.id },
          data: {
            delhiveryApiKey: decryptedValue
          }
        });
        
        console.log(`✅ Updated pickup location: ${location.label}`);
      } catch (error) {
        console.error(`❌ Error updating pickup location ${location.label}:`, error);
      }
    }

    console.log('✅ Encryption disable process completed successfully!');
    console.log('📊 Summary:');
    console.log(`  - System configs updated: ${systemConfigs.length}`);
    console.log(`  - Client configs updated: ${clientConfigs.length}`);
    console.log(`  - Pickup locations updated: ${pickupLocations.length}`);

  } catch (error) {
    console.error('❌ Error during encryption disable process:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
disableEncryption();
