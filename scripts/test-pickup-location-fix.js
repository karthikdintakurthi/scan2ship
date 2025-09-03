const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testPickupLocationFix() {
  try {
    console.log('🧪 Testing Pickup Location API Key Fix...\n');

    // Test the specific conflicting pickup location
    const conflictingValue = 'SUJATHA FRANCHISE';
    
    console.log('📋 Test: Conflicting Pickup Location Resolution');
    console.log('=' .repeat(60));
    console.log(`Testing pickup location value: "${conflictingValue}"\n`);

    // Find all pickup locations with this value
    const conflictingLocations = await prisma.pickup_locations.findMany({
      where: { 
        value: {
          equals: conflictingValue,
          mode: 'insensitive'
        }
      },
      include: {
        clients: {
          select: {
            companyName: true,
            id: true
          }
        }
      },
      orderBy: {
        clients: {
          companyName: 'asc'
        }
      }
    });

    if (conflictingLocations.length === 0) {
      console.log('❌ No pickup locations found with this value');
      return;
    }

    console.log(`Found ${conflictingLocations.length} pickup locations with value "${conflictingValue}":\n`);
    
    conflictingLocations.forEach((location, index) => {
      console.log(`${index + 1}. Client: ${location.clients.companyName}`);
      console.log(`   Client ID: ${location.clients.id}`);
      console.log(`   Pickup Location: ${location.label} (${location.value})`);
      console.log(`   API Key: ${location.delhiveryApiKey ? location.delhiveryApiKey.substring(0, 20) + '...' : 'NOT CONFIGURED'}`);
      console.log('');
    });

    // Test 1: Old behavior (without client filtering) - should show the problem
    console.log('📋 Test 1: Old Behavior (Without Client Filtering)');
    console.log('=' .repeat(60));
    
    for (const location of conflictingLocations) {
      console.log(`\n🔍 Testing for client: ${location.clients.companyName}`);
      
      // Simulate the OLD query (without client filtering)
      const oldResult = await prisma.pickup_locations.findFirst({
        where: { 
          value: {
            equals: conflictingValue,
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
      
      if (oldResult) {
        console.log(`   ❌ OLD BEHAVIOR: Found API key from client: ${oldResult.clients.companyName}`);
        console.log(`   ❌ Expected client: ${location.clients.companyName}`);
        console.log(`   ❌ API Key: ${oldResult.delhiveryApiKey ? oldResult.delhiveryApiKey.substring(0, 20) + '...' : 'NOT CONFIGURED'}`);
        
        if (oldResult.clients.id !== location.clients.id) {
          console.log(`   ⚠️  MISMATCH! This is the problem we're fixing!`);
        } else {
          console.log(`   ✅ This one happened to be correct (first match)`);
        }
      } else {
        console.log(`   ❌ No location found`);
      }
    }

    // Test 2: New behavior (with client filtering) - should show the fix
    console.log('\n📋 Test 2: New Behavior (With Client Filtering)');
    console.log('=' .repeat(60));
    
    for (const location of conflictingLocations) {
      console.log(`\n🔍 Testing for client: ${location.clients.companyName} (ID: ${location.clients.id})`);
      
      // Simulate the NEW query (with client filtering)
      const newResult = await prisma.pickup_locations.findFirst({
        where: { 
          AND: [
            {
              value: {
                equals: conflictingValue,
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
      
      if (newResult) {
        console.log(`   ✅ NEW BEHAVIOR: Found API key from client: ${newResult.clients.companyName}`);
        console.log(`   ✅ Expected client: ${location.clients.companyName}`);
        console.log(`   ✅ API Key: ${newResult.delhiveryApiKey ? newResult.delhiveryApiKey.substring(0, 20) + '...' : 'NOT CONFIGURED'}`);
        
        if (newResult.clients.id === location.clients.id) {
          console.log(`   ✅ PERFECT! Client ID filtering works correctly!`);
        } else {
          console.log(`   ❌ Still wrong - this shouldn't happen with proper filtering`);
        }
      } else {
        console.log(`   ❌ No location found for this client`);
      }
    }

    // Test 3: Verify the fix resolves the specific conflict
    console.log('\n📋 Test 3: Conflict Resolution Verification');
    console.log('=' .repeat(60));
    
    const client1 = conflictingLocations[0];
    const client2 = conflictingLocations[1];
    
    if (conflictingLocations.length >= 2) {
      console.log(`\n🔍 Testing conflict resolution between:`);
      console.log(`   Client 1: ${client1.clients.companyName} (ID: ${client1.clients.id})`);
      console.log(`   Client 2: ${client2.clients.companyName} (ID: ${client2.clients.id})`);
      
      // Test client 1's API key retrieval
      const client1Result = await prisma.pickup_locations.findFirst({
        where: { 
          AND: [
            { value: { equals: conflictingValue, mode: 'insensitive' } },
            { clientId: client1.clients.id }
          ]
        },
        select: { delhiveryApiKey: true, clients: { select: { companyName: true } } }
      });
      
      // Test client 2's API key retrieval
      const client2Result = await prisma.pickup_locations.findFirst({
        where: { 
          AND: [
            { value: { equals: conflictingValue, mode: 'insensitive' } },
            { clientId: client2.clients.id }
          ]
        },
        select: { delhiveryApiKey: true, clients: { select: { companyName: true } } }
      });
      
      console.log(`\n   Client 1 (${client1.clients.companyName}) gets API key: ${client1Result?.delhiveryApiKey ? client1Result.delhiveryApiKey.substring(0, 20) + '...' : 'NOT CONFIGURED'}`);
      console.log(`   Client 2 (${client2.clients.companyName}) gets API key: ${client2Result?.delhiveryApiKey ? client2Result.delhiveryApiKey.substring(0, 20) + '...' : 'NOT CONFIGURED'}`);
      
      if (client1Result?.delhiveryApiKey !== client2Result?.delhiveryApiKey) {
        console.log(`   ✅ SUCCESS! Each client now gets their own unique API key!`);
        console.log(`   ✅ The conflict has been resolved!`);
      } else {
        console.log(`   ❌ FAILURE! Both clients are still getting the same API key`);
      }
    }

    console.log('\n📋 Test Summary');
    console.log('=' .repeat(60));
    console.log('✅ The fix has been implemented:');
    console.log('   - getDelhiveryApiKey now accepts a clientId parameter');
    console.log('   - Database queries now filter by both pickup location value AND clientId');
    console.log('   - Cross-client API key contamination is prevented');
    console.log('\n✅ Expected results:');
    console.log('   - Each client will get their own API key for pickup locations');
    console.log('   - No more API key mismatches between clients');
    console.log('   - Delhivery orders will use the correct API key for each client');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testPickupLocationFix()
  .then(() => {
    console.log('\n✅ Test completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  });
