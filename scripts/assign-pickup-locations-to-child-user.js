const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

async function assignPickupLocationsToChildUser() {
  try {
    console.log('🔍 [ASSIGN_PICKUP_LOCATIONS] Starting pickup location assignment...');

    // Find the child user in Route Master Courier and Cargo
    const childUser = await prisma.users.findFirst({
      where: {
        role: 'child_user',
        clients: {
          companyName: 'Route Master Courier and Cargo'
        }
      },
      include: {
        clients: true
      }
    });

    if (!childUser) {
      console.log('❌ [ASSIGN_PICKUP_LOCATIONS] No child user found in Route Master Courier and Cargo');
      return;
    }

    console.log('✅ [ASSIGN_PICKUP_LOCATIONS] Found child user:', childUser.email);

    // Get all pickup locations for this client
    const pickupLocations = await prisma.pickup_locations.findMany({
      where: {
        clientId: childUser.clientId
      }
    });

    console.log(`📋 [ASSIGN_PICKUP_LOCATIONS] Found ${pickupLocations.length} pickup locations for client`);

    // Check existing assignments
    const existingAssignments = await prisma.user_pickup_locations.findMany({
      where: {
        userId: childUser.id
      }
    });

    console.log(`🔗 [ASSIGN_PICKUP_LOCATIONS] User already has ${existingAssignments.length} pickup location assignments`);

    if (existingAssignments.length === 0) {
      // Assign all pickup locations to the child user
      const assignments = pickupLocations.map((pl, index) => ({
        id: `upl-${Date.now()}-${index}`,
        userId: childUser.id,
        pickupLocationId: pl.id,
        createdAt: new Date(),
        updatedAt: new Date()
      }));

      await prisma.user_pickup_locations.createMany({
        data: assignments
      });

      console.log(`✅ [ASSIGN_PICKUP_LOCATIONS] Assigned ${assignments.length} pickup locations to child user`);
    } else {
      console.log('ℹ️ [ASSIGN_PICKUP_LOCATIONS] User already has pickup location assignments');
    }

    // Show final assignments
    const finalAssignments = await prisma.user_pickup_locations.findMany({
      where: {
        userId: childUser.id
      },
      include: {
        pickup_locations: true
      }
    });

    console.log('📊 [ASSIGN_PICKUP_LOCATIONS] Final assignments:');
    finalAssignments.forEach(assignment => {
      console.log(`  - ${assignment.pickup_locations.label} (${assignment.pickup_locations.value})`);
    });

  } catch (error) {
    console.error('❌ [ASSIGN_PICKUP_LOCATIONS] Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
assignPickupLocationsToChildUser();
