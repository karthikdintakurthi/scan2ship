require('dotenv').config({ path: '.env.local' });
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function updateSujathaApiKey() {
  console.log('🔧 Updating SUJATHA FRANCHISE API key...\n');

  // ⚠️ IMPORTANT: Replace this with the real Delhivery API key for SUJATHA FRANCHISE
  const REAL_API_KEY = 'YOUR_REAL_DELHIVERY_API_KEY_HERE'; // 40 characters for Delhivery
  
  if (REAL_API_KEY === 'YOUR_REAL_DELHIVERY_API_KEY_HERE') {
    console.log('❌ Please update the REAL_API_KEY variable in this script with the actual Delhivery API key');
    console.log('💡 Delhivery API keys are typically 40 characters long');
    console.log('📝 Example: 2bce24815f3e4da2513ab4aafb7ecb251469c4a9');
    return;
  }

  try {
    // Validate API key format
    if (REAL_API_KEY.length !== 40) {
      console.log(`❌ Invalid API key length: ${REAL_API_KEY.length} characters`);
      console.log('💡 Delhivery API keys should be exactly 40 characters');
      return;
    }

    // Check for invalid characters
    const invalidChars = REAL_API_KEY.match(/[^a-zA-Z0-9]/);
    if (invalidChars) {
      console.log(`❌ API key contains invalid characters: ${invalidChars[0]}`);
      console.log('💡 API keys should only contain letters and numbers');
      return;
    }

    // Update the pickup location
    const updatedLocation = await prisma.pickup_locations.update({
      where: { 
        value: {
          equals: 'SUJATHA FRANCHISE',
          mode: 'insensitive'
        }
      },
      data: { 
        delhiveryApiKey: REAL_API_KEY 
      }
    });

    console.log('✅ Successfully updated SUJATHA FRANCHISE API key!');
    console.log(`📋 Updated pickup location:`);
    console.log(`  - ID: ${updatedLocation.id}`);
    console.log(`  - Value: ${updatedLocation.value}`);
    console.log(`  - API Key: ${updatedLocation.delhiveryApiKey.substring(0, 10)}...`);
    console.log(`  - API Key Length: ${updatedLocation.delhiveryApiKey.length}`);

    // Verify the update
    const verifyLocation = await prisma.pickup_locations.findFirst({
      where: { 
        value: {
          equals: 'SUJATHA FRANCHISE',
          mode: 'insensitive'
        }
      }
    });

    if (verifyLocation && !verifyLocation.delhiveryApiKey.includes('•')) {
      console.log('\n✅ Verification successful - API key no longer contains bullet points');
    } else {
      console.log('\n❌ Verification failed - API key still has issues');
    }

  } catch (error) {
    console.error('❌ Error updating API key:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateSujathaApiKey().catch(console.error);

