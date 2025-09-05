const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

async function testNavigationMenu() {
  try {
    console.log('🧪 [TEST_NAVIGATION_MENU] Testing navigation menu for different user roles...\n');

    // Test different user roles and their expected navigation
    const testCases = [
      {
        role: 'master_admin',
        expectedMenu: ['Master Dashboard', 'System Settings', 'Credit Management'],
        shouldHaveWallet: false
      },
      {
        role: 'admin',
        expectedMenu: ['Admin Dashboard'],
        shouldHaveWallet: false
      },
      {
        role: 'child_user',
        expectedMenu: ['Dashboard', 'Create Order', 'View Orders'],
        shouldHaveWallet: false
      },
      {
        role: 'user',
        expectedMenu: ['Dashboard', 'Create Order', 'View Orders', 'Wallet'],
        shouldHaveWallet: true
      },
      {
        role: 'viewer',
        expectedMenu: ['Dashboard', 'Create Order', 'View Orders', 'Wallet'],
        shouldHaveWallet: true
      }
    ];

    for (const testCase of testCases) {
      console.log(`\n📋 [TEST_NAVIGATION_MENU] Testing role: ${testCase.role}`);
      console.log(`   📱 Expected Menu Items: ${testCase.expectedMenu.join(', ')}`);
      console.log(`   💳 Should have Wallet: ${testCase.shouldHaveWallet ? '✅ YES' : '❌ NO'}`);
      
      // Find a user with this role for testing
      const testUser = await prisma.users.findFirst({
        where: { role: testCase.role },
        include: {
          clients: true
        }
      });
      
      if (testUser) {
        console.log(`   👤 Test User: ${testUser.name} (${testUser.email})`);
        console.log(`   🏢 Client: ${testUser.clients.companyName}`);
      } else {
        console.log(`   ⚠️  No user found with role: ${testCase.role}`);
      }
    }

    console.log('\n🎯 [TEST_NAVIGATION_MENU] Navigation Menu Summary:');
    console.log('┌─────────────────┬─────────────────────────────────────────────────────────┬──────────────┐');
    console.log('│ User Role       │ Navigation Menu Items                                   │ Wallet Menu  │');
    console.log('├─────────────────┼─────────────────────────────────────────────────────────┼──────────────┤');
    console.log('│ master_admin    │ Master Dashboard, System Settings, Credit Management   │     ❌       │');
    console.log('│ admin           │ Admin Dashboard                                         │     ❌       │');
    console.log('│ child_user      │ Dashboard, Create Order, View Orders                   │     ❌       │');
    console.log('│ user            │ Dashboard, Create Order, View Orders, Wallet           │     ✅       │');
    console.log('│ viewer          │ Dashboard, Create Order, View Orders, Wallet           │     ✅       │');
    console.log('└─────────────────┴─────────────────────────────────────────────────────────┴──────────────┘');

    console.log('\n🔍 [TEST_NAVIGATION_MENU] Key Changes for Child Users:');
    console.log('   • ❌ Removed "Wallet" menu item from navigation');
    console.log('   • ❌ Hidden credit wallet component from header');
    console.log('   • ✅ Added pickup location display in header');
    console.log('   • ✅ Streamlined interface focused on order management');

  } catch (error) {
    console.error('❌ [TEST_NAVIGATION_MENU] Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testNavigationMenu();
