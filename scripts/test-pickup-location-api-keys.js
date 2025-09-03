const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testPickupLocationApiKeys() {
  try {
    console.log('🧪 Testing Pickup Location API Key Retrieval...\n');

    // Test 1: Check current pickup locations and their API keys
    console.log('📋 Test 1: Current Pickup Locations and API Keys');
    console.log('=' .repeat(60));
    
    const allPickupLocations = await prisma.pickup_locations.findMany({
      include: {
        clients: {
          select: {
            companyName: true,
            id: true
          }
        }
      },
      orderBy: [
        { clients: { companyName: 'asc' } },
        { label: 'asc' }
      ]
    });

    if (allPickupLocations.length === 0) {
      console.log('❌ No pickup locations found in database');
      return;
    }

    console.log(`Found ${allPickupLocations.length} pickup locations:\n`);
    
    allPickupLocations.forEach((location, index) => {
      console.log(`${index + 1}. Client: ${location.clients.companyName}`);
      console.log(`   Pickup Location: ${location.label} (${location.value})`);
      console.log(`   API Key: ${location.delhiveryApiKey ? location.delhiveryApiKey.substring(0, 20) + '...' : 'NOT CONFIGURED'}`);
      console.log(`   Client ID: ${location.clients.id}`);
      console.log('');
    });

    // Test 2: Test the getDelhiveryApiKey function logic
    console.log('📋 Test 2: Testing API Key Retrieval Logic');
    console.log('=' .repeat(60));
    
    // Simulate the current logic (without client filtering)
    for (const location of allPickupLocations) {
      console.log(`\n🔍 Testing pickup location: ${location.label} (${location.value})`);
      console.log(`   Client: ${location.clients.companyName}`);
      
      // Simulate the current findFirst query (without client filtering)
      const foundLocation = await prisma.pickup_locations.findFirst({
        where: { 
          value: {
            equals: location.value,
            mode: 'insensitive'
          }
        },
        select: { 
          delhiveryApiKey: true,
          clients: {
            select: {
              companyName: true,
              id: true
            }
          }
        }
      });
      
      if (foundLocation) {
        console.log(`   ✅ Found location with API key: ${foundLocation.delhiveryApiKey ? foundLocation.delhiveryApiKey.substring(0, 20) + '...' : 'NOT CONFIGURED'}`);
        console.log(`   📍 Actual client: ${foundLocation.clients.companyName} (ID: ${foundLocation.clients.id})`);
        
        // Check if this matches the expected client
        if (foundLocation.clients.id === location.clients.id) {
          console.log(`   ✅ API key matches expected client`);
        } else {
          console.log(`   ❌ MISMATCH! API key is from different client: ${foundLocation.clients.companyName}`);
          console.log(`   ⚠️  This indicates the current logic is flawed!`);
        }
      } else {
        console.log(`   ❌ No location found`);
      }
    }

    // Test 3: Test with proper client filtering
    console.log('\n📋 Test 3: Testing with Proper Client Filtering');
    console.log('=' .repeat(60));
    
    for (const location of allPickupLocations) {
      console.log(`\n🔍 Testing pickup location: ${location.label} (${location.value})`);
      console.log(`   Client: ${location.clients.companyName} (ID: ${location.clients.id})`);
      
      // Simulate the CORRECT query with client filtering
      const correctLocation = await prisma.pickup_locations.findFirst({
        where: { 
          AND: [
            {
              value: {
                equals: location.value,
                mode: 'insensitive'
              }
            },
            {
              clientId: location.clients.id
            }
          ]
        },
        select: { 
          delhiveryApiKey: true,
          clients: {
            select: {
              companyName: true,
              id: true
            }
          }
        }
      });
      
      if (correctLocation) {
        console.log(`   ✅ Found correct location with API key: ${correctLocation.delhiveryApiKey ? correctLocation.delhiveryApiKey.substring(0, 20) + '...' : 'NOT CONFIGURED'}`);
        console.log(`   📍 Client matches: ${correctLocation.clients.companyName} (ID: ${correctLocation.clients.id})`);
      } else {
        console.log(`   ❌ No location found with proper client filtering`);
      }
    }

    // Test 4: Check for potential conflicts
    console.log('\n📋 Test 4: Checking for Potential Conflicts');
    console.log('=' .repeat(60));
    
    const duplicateValues = await prisma.pickup_locations.groupBy({
      by: ['value'],
      _count: {
        value: true
      },
      having: {
        value: {
          _count: {
            gt: 1
          }
        }
      }
    });

    if (duplicateValues.length > 0) {
      console.log('⚠️  Found pickup locations with duplicate values (potential conflicts):');
      duplicateValues.forEach(dup => {
        console.log(`   Value: "${dup.value}" appears ${dup._count.value} times`);
      });
      
      // Show the conflicting locations
      for (const dup of duplicateValues) {
        const conflicts = await prisma.pickup_locations.findMany({
          where: { value: dup.value },
          include: {
            clients: {
              select: {
                companyName: true,
                id: true
              }
            }
          }
        });
        
        console.log(`\n   Conflicts for "${dup.value}":`);
        conflicts.forEach(conflict => {
          console.log(`     - Client: ${conflict.clients.companyName} (ID: ${conflict.clients.id})`);
          console.log(`       API Key: ${conflict.delhiveryApiKey ? conflict.delhiveryApiKey.substring(0, 20) + '...' : 'NOT CONFIGURED'}`);
        });
      }
    } else {
      console.log('✅ No duplicate pickup location values found');
    }

    console.log('\n📋 Test Summary');
    console.log('=' .repeat(60));
    console.log('The current getDelhiveryApiKey function has a critical flaw:');
    console.log('❌ It does not filter by clientId when searching for pickup locations');
    console.log('❌ This can lead to returning API keys from the wrong client');
    console.log('❌ The fix requires adding clientId filtering to the database query');
    console.log('\nThe fix should:');
    console.log('✅ Filter pickup locations by both value AND clientId');
    console.log('✅ Ensure API keys are always from the correct client');
    console.log('✅ Prevent cross-client API key contamination');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testPickupLocationApiKeys()
  .then(() => {
    console.log('\n✅ Test completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  });
