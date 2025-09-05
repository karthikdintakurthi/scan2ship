const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

async function testHeaderVisibility() {
  try {
    console.log('🧪 [TEST_HEADER_VISIBILITY] Testing header visibility for different user roles...\n');

    // Test different user roles
    const testRoles = ['master_admin', 'child_user', 'user', 'viewer'];
    
    for (const role of testRoles) {
      console.log(`\n📋 [TEST_HEADER_VISIBILITY] Testing role: ${role}`);
      
      // Determine what should be visible
      let shouldShowWallet = false;
      let shouldShowPickupLocations = false;
      
      switch (role) {
        case 'master_admin':
          shouldShowWallet = false;
          shouldShowPickupLocations = false;
          break;
        case 'child_user':
          shouldShowWallet = false;
          shouldShowPickupLocations = true;
          break;
        case 'user':
        case 'viewer':
          shouldShowWallet = true;
          shouldShowPickupLocations = false;
          break;
      }
      
      console.log(`   💳 Credit Wallet: ${shouldShowWallet ? '✅ SHOWN' : '❌ HIDDEN'}`);
      console.log(`   📍 Pickup Locations: ${shouldShowPickupLocations ? '✅ SHOWN' : '❌ HIDDEN'}`);
      
      // Find a user with this role for testing
      const testUser = await prisma.users.findFirst({
        where: { role: role },
        include: {
          clients: true,
          user_pickup_locations: {
            include: {
              pickup_locations: true
            }
          }
        }
      });
      
      if (testUser) {
        console.log(`   👤 Test User: ${testUser.name} (${testUser.email})`);
        console.log(`   🏢 Client: ${testUser.clients.companyName}`);
        
        if (role === 'child_user') {
          console.log(`   📍 Assigned Pickup Locations: ${testUser.user_pickup_locations.length}`);
          testUser.user_pickup_locations.forEach((assignment, index) => {
            console.log(`      ${index + 1}. ${assignment.pickup_locations.label}`);
          });
        }
      } else {
        console.log(`   ⚠️  No user found with role: ${role}`);
      }
    }

    console.log('\n🎯 [TEST_HEADER_VISIBILITY] Header Display Summary:');
    console.log('┌─────────────────┬──────────────┬──────────────────┐');
    console.log('│ User Role       │ Credit Wallet│ Pickup Locations │');
    console.log('├─────────────────┼──────────────┼──────────────────┤');
    console.log('│ master_admin    │     ❌       │        ❌        │');
    console.log('│ child_user      │     ❌       │        ✅        │');
    console.log('│ user            │     ✅       │        ❌        │');
    console.log('│ viewer          │     ✅       │        ❌        │');
    console.log('└─────────────────┴──────────────┴──────────────────┘');

  } catch (error) {
    console.error('❌ [TEST_HEADER_VISIBILITY] Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testHeaderVisibility();
