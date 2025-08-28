require('dotenv').config({ path: '.env.local' });
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixSujathaApiKey() {
  console.log('🔧 Fixing SUJATHA FRANCHISE API key...\n');

  try {
    // First, let's see what we have
    const currentLocation = await prisma.pickup_locations.findFirst({
      where: { 
        value: {
          equals: 'SUJATHA FRANCHISE',
          mode: 'insensitive'
        }
      }
    });

    if (!currentLocation) {
      console.log('❌ SUJATHA FRANCHISE pickup location not found!');
      return;
    }

    console.log('📋 Current pickup location:');
    console.log(`  - ID: ${currentLocation.id}`);
    console.log(`  - Value: ${currentLocation.value}`);
    console.log(`  - API Key: ${currentLocation.delhiveryApiKey}`);
    console.log(`  - API Key Length: ${currentLocation.delhiveryApiKey?.length || 0}`);

    if (currentLocation.delhiveryApiKey && currentLocation.delhiveryApiKey.includes('•')) {
      console.log('\n⚠️  API key contains bullet points - this needs to be replaced with a real Delhivery API key');
      console.log('\n💡 To fix this:');
      console.log('1. Get the real Delhivery API key for SUJATHA FRANCHISE');
      console.log('2. Update the pickup location in the admin panel');
      console.log('3. Or use the script below to update it directly');
      
      // Ask if user wants to update it
      console.log('\n🔧 Would you like to update the API key now? (y/n)');
      console.log('Note: You need to provide the real Delhivery API key');
      
      // For now, let's show how to update it
      console.log('\n📝 To update via script, modify this script and add:');
      console.log(`
        await prisma.pickup_locations.update({
          where: { id: '${currentLocation.id}' },
          data: { 
            delhiveryApiKey: 'YOUR_REAL_DELHIVERY_API_KEY_HERE' 
          }
        });
      `);
    } else if (!currentLocation.delhiveryApiKey) {
      console.log('\n❌ No API key found - needs to be configured');
    } else {
      console.log('\n✅ API key looks valid');
    }

    // Show other pickup locations for reference
    console.log('\n📋 Other pickup locations for reference:');
    const allLocations = await prisma.pickup_locations.findMany({
      select: { value: true, delhiveryApiKey: true }
    });

    allLocations.forEach(loc => {
      const status = loc.delhiveryApiKey ? 
        (loc.delhiveryApiKey.includes('•') ? '❌ Bullet points' : '✅ Valid') : 
        '❌ No API key';
      console.log(`  - ${loc.value}: ${status}`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixSujathaApiKey().catch(console.error);

