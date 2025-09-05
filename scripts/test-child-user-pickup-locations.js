const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

async function testChildUserPickupLocations() {
  try {
    console.log('🧪 [TEST_CHILD_USER_PICKUP_LOCATIONS] Testing child user pickup locations...\n');

    // Find the child user
    const childUser = await prisma.users.findFirst({
      where: {
        email: 'user@surclesolar.net',
        role: 'child_user'
      },
      include: {
        clients: true
      }
    });

    if (!childUser) {
      console.log('❌ [TEST_CHILD_USER_PICKUP_LOCATIONS] Child user not found');
      return;
    }

    console.log('✅ [TEST_CHILD_USER_PICKUP_LOCATIONS] Found child user:');
    console.log(`   Name: ${childUser.name}`);
    console.log(`   Email: ${childUser.email}`);
    console.log(`   Role: ${childUser.role}`);
    console.log(`   Client: ${childUser.clients.companyName}\n`);

    // Get assigned pickup locations
    const assignedPickupLocations = await prisma.user_pickup_locations.findMany({
      where: {
        userId: childUser.id
      },
      include: {
        pickup_locations: true
      }
    });

    console.log(`📋 [TEST_CHILD_USER_PICKUP_LOCATIONS] Assigned pickup locations (${assignedPickupLocations.length}):`);
    assignedPickupLocations.forEach((assignment, index) => {
      console.log(`   ${index + 1}. ${assignment.pickup_locations.label} (${assignment.pickup_locations.value})`);
    });

    // Test the API query that the frontend will use
    console.log('\n🔍 [TEST_CHILD_USER_PICKUP_LOCATIONS] Testing API query...');
    
    const apiQueryResult = await prisma.pickup_locations.findMany({
      where: {
        clientId: childUser.clientId,
        user_pickup_locations: {
          some: {
            userId: childUser.id
          }
        }
      },
      orderBy: { label: 'asc' }
    });

    console.log(`✅ [TEST_CHILD_USER_PICKUP_LOCATIONS] API query result (${apiQueryResult.length} locations):`);
    apiQueryResult.forEach((location, index) => {
      console.log(`   ${index + 1}. ${location.label} (${location.value})`);
    });

    // Test what the header will display
    console.log('\n🎯 [TEST_CHILD_USER_PICKUP_LOCATIONS] Header display will show:');
    if (apiQueryResult.length > 0) {
      const locationLabels = apiQueryResult.map(pl => pl.label).join(', ');
      console.log(`   📍 ${locationLabels}`);
    } else {
      console.log('   No pickup locations to display');
    }

  } catch (error) {
    console.error('❌ [TEST_CHILD_USER_PICKUP_LOCATIONS] Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testChildUserPickupLocations();
