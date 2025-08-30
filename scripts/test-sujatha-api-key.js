require('dotenv').config({ path: '.env.local' });
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testSujathaApiKey() {
  console.log('🧪 Testing SUJATHA FRANCHISE API key...\n');

  try {
    // Get the pickup location configuration
    const location = await prisma.pickup_locations.findFirst({
      where: { 
        value: {
          equals: 'SUJATHA FRANCHISE',
          mode: 'insensitive'
        }
      }
    });

    if (!location) {
      console.log('❌ SUJATHA FRANCHISE pickup location not found!');
      return;
    }

    console.log('📋 Pickup Location Details:');
    console.log(`  - ID: ${location.id}`);
    console.log(`  - Value: ${location.value}`);
    console.log(`  - Client ID: ${location.clientId}`);
    console.log(`  - API Key: ${location.delhiveryApiKey}`);
    console.log(`  - API Key Length: ${location.delhiveryApiKey?.length || 0}`);

    // Validate API key format
    if (location.delhiveryApiKey) {
      if (location.delhiveryApiKey.length === 40) {
        console.log('✅ API key length is correct (40 characters)');
      } else {
        console.log(`❌ API key length is incorrect: ${location.delhiveryApiKey.length} characters`);
      }

      // Check for invalid characters
      const invalidChars = location.delhiveryApiKey.match(/[^a-zA-Z0-9]/);
      if (invalidChars) {
        console.log(`❌ API key contains invalid characters: ${invalidChars[0]}`);
      } else {
        console.log('✅ API key contains only valid characters');
      }

      // Check if it contains bullet points
      if (location.delhiveryApiKey.includes('•')) {
        console.log('❌ API key still contains bullet points');
      } else {
        console.log('✅ API key does not contain bullet points');
      }
    } else {
      console.log('❌ No API key found');
    }

    // Test the API key retrieval function
    console.log('\n🔧 Testing API key retrieval function...');
    
    // Import the pickup location config module
    const { getDelhiveryApiKey } = await import('../src/lib/pickup-location-config.ts');
    
    try {
      const retrievedApiKey = await getDelhiveryApiKey('SUJATHA FRANCHISE');
      console.log(`Retrieved API Key: ${retrievedApiKey}`);
      console.log(`Retrieved API Key Length: ${retrievedApiKey?.length || 0}`);
      
      if (retrievedApiKey && retrievedApiKey.length === 40) {
        console.log('✅ API key retrieval function working correctly');
      } else {
        console.log('❌ API key retrieval function returned invalid key');
      }
    } catch (error) {
      console.log('❌ Error in API key retrieval function:', error.message);
    }

    // Get associated client info
    const client = await prisma.clients.findUnique({
      where: { id: location.clientId },
      select: { companyName: true, name: true, email: true }
    });

    if (client) {
      console.log('\n📋 Associated Client:');
      console.log(`  - Company: ${client.companyName}`);
      console.log(`  - Name: ${client.name}`);
      console.log(`  - Email: ${client.email}`);
    }

    console.log('\n🎉 SUJATHA FRANCHISE API key test completed!');

  } catch (error) {
    console.error('❌ Error testing API key:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testSujathaApiKey().catch(console.error);

