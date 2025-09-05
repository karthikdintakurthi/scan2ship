const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

async function listChildUsers() {
  try {
    console.log('👥 [MANAGE_CHILD_USERS] Listing all child users...\n');

    const childUsers = await prisma.users.findMany({
      where: {
        role: 'child_user'
      },
      include: {
        clients: {
          select: {
            companyName: true
          }
        },
        user_pickup_locations: {
          include: {
            pickup_locations: {
              select: {
                label: true,
                value: true
              }
            }
          }
        }
      }
    });

    if (childUsers.length === 0) {
      console.log('❌ No child users found');
      return [];
    }

    console.log(`Found ${childUsers.length} child user(s):\n`);

    childUsers.forEach((user, index) => {
      console.log(`${index + 1}. ${user.name} (${user.email})`);
      console.log(`   Client: ${user.clients.companyName}`);
      console.log(`   Assigned Pickup Locations: ${user.user_pickup_locations.length}`);
      
      if (user.user_pickup_locations.length > 0) {
        user.user_pickup_locations.forEach(assignment => {
          console.log(`     - ${assignment.pickup_locations.label}`);
        });
      } else {
        console.log('     - No pickup locations assigned');
      }
      console.log('');
    });

    return childUsers;
  } catch (error) {
    console.error('❌ [MANAGE_CHILD_USERS] Error listing child users:', error);
    return [];
  }
}

async function assignPickupLocationsToUser(userId, pickupLocationIds) {
  try {
    console.log(`🔗 [MANAGE_CHILD_USERS] Assigning pickup locations to user ${userId}...`);

    // Remove existing assignments
    await prisma.user_pickup_locations.deleteMany({
      where: {
        userId: userId
      }
    });

    // Create new assignments
    if (pickupLocationIds.length > 0) {
      const assignments = pickupLocationIds.map((pickupLocationId, index) => ({
        id: `upl-${Date.now()}-${index}`,
        userId: userId,
        pickupLocationId: pickupLocationId,
        createdAt: new Date(),
        updatedAt: new Date()
      }));

      await prisma.user_pickup_locations.createMany({
        data: assignments
      });

      console.log(`✅ [MANAGE_CHILD_USERS] Assigned ${assignments.length} pickup locations`);
    } else {
      console.log('ℹ️ [MANAGE_CHILD_USERS] No pickup locations assigned (user will have no access)');
    }

  } catch (error) {
    console.error('❌ [MANAGE_CHILD_USERS] Error assigning pickup locations:', error);
  }
}

async function getAvailablePickupLocations(clientId) {
  try {
    const pickupLocations = await prisma.pickup_locations.findMany({
      where: {
        clientId: clientId
      },
      orderBy: {
        label: 'asc'
      }
    });

    return pickupLocations;
  } catch (error) {
    console.error('❌ [MANAGE_CHILD_USERS] Error fetching pickup locations:', error);
    return [];
  }
}

async function main() {
  try {
    console.log('🚀 [MANAGE_CHILD_USERS] Child User Pickup Location Manager\n');

    // List all child users
    const childUsers = await listChildUsers();

    if (childUsers.length === 0) {
      console.log('No child users to manage.');
      return;
    }

    // For demonstration, let's assign pickup locations to the first child user
    const firstChildUser = childUsers[0];
    console.log(`\n🔧 [MANAGE_CHILD_USERS] Managing pickup locations for: ${firstChildUser.name}`);
    
    // Get available pickup locations for this user's client
    const availablePickupLocations = await getAvailablePickupLocations(firstChildUser.clientId);
    
    console.log(`\nAvailable pickup locations for ${firstChildUser.clients.companyName}:`);
    availablePickupLocations.forEach((pl, index) => {
      console.log(`${index + 1}. ${pl.label} (${pl.value})`);
    });

    // Assign all pickup locations to the child user (you can modify this logic)
    const allPickupLocationIds = availablePickupLocations.map(pl => pl.id);
    await assignPickupLocationsToUser(firstChildUser.id, allPickupLocationIds);

    console.log('\n✅ [MANAGE_CHILD_USERS] Management complete!');

  } catch (error) {
    console.error('❌ [MANAGE_CHILD_USERS] Error in main:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
main();
