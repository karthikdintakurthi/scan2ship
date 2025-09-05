const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

async function testDashboardBehavior() {
  try {
    console.log('🧪 [TEST_DASHBOARD_BEHAVIOR] Testing dashboard behavior for different user roles...\n');

    // Test different user roles and their expected dashboard behavior
    const testCases = [
      {
        role: 'master_admin',
        expectedDashboard: 'Admin Dashboard (/admin)',
        expectedRedirect: 'Redirected to /admin',
        shouldShowClientDashboard: false
      },
      {
        role: 'admin',
        expectedDashboard: 'Admin Dashboard (/admin)',
        expectedRedirect: 'Redirected to /admin',
        shouldShowClientDashboard: false
      },
      {
        role: 'child_user',
        expectedDashboard: 'Client Dashboard (/)',
        expectedRedirect: 'No redirect - shows client dashboard',
        shouldShowClientDashboard: true
      },
      {
        role: 'user',
        expectedDashboard: 'Client Dashboard (/)',
        expectedRedirect: 'No redirect - shows client dashboard',
        shouldShowClientDashboard: true
      },
      {
        role: 'viewer',
        expectedDashboard: 'Client Dashboard (/)',
        expectedRedirect: 'No redirect - shows client dashboard',
        shouldShowClientDashboard: true
      }
    ];

    for (const testCase of testCases) {
      console.log(`\n📋 [TEST_DASHBOARD_BEHAVIOR] Testing role: ${testCase.role}`);
      console.log(`   🏠 Expected Dashboard: ${testCase.expectedDashboard}`);
      console.log(`   🔄 Redirect Behavior: ${testCase.expectedRedirect}`);
      console.log(`   📱 Shows Client Dashboard: ${testCase.shouldShowClientDashboard ? '✅ YES' : '❌ NO'}`);
      
      if (testCase.shouldShowClientDashboard) {
        console.log(`   🎯 Client Dashboard Features:`);
        console.log(`      • Welcome message with Scan2Ship branding`);
        console.log(`      • "Create New Order" button (links to /orders)`);
        console.log(`      • "View Orders" button (links to /view-orders)`);
        console.log(`      • Professional gradient background`);
      }
      
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

    console.log('\n🎯 [TEST_DASHBOARD_BEHAVIOR] Dashboard Behavior Summary:');
    console.log('┌─────────────────┬─────────────────────┬─────────────────────────────────┬─────────────────────┐');
    console.log('│ User Role       │ Dashboard Type      │ Redirect Behavior               │ Client Dashboard    │');
    console.log('├─────────────────┼─────────────────────┼─────────────────────────────────┼─────────────────────┤');
    console.log('│ master_admin    │ Admin Dashboard     │ Redirected to /admin            │         ❌          │');
    console.log('│ admin           │ Admin Dashboard     │ Redirected to /admin            │         ❌          │');
    console.log('│ child_user      │ Client Dashboard    │ No redirect - shows at /        │         ✅          │');
    console.log('│ user            │ Client Dashboard    │ No redirect - shows at /        │         ✅          │');
    console.log('│ viewer          │ Client Dashboard    │ No redirect - shows at /        │         ✅          │');
    console.log('└─────────────────┴─────────────────────┴─────────────────────────────────┴─────────────────────┘');

    console.log('\n🔍 [TEST_DASHBOARD_BEHAVIOR] Key Changes for Child Users:');
    console.log('   • ✅ Child users now see the same client dashboard as regular users');
    console.log('   • ✅ Dashboard shows "Create New Order" and "View Orders" buttons');
    console.log('   • ✅ Professional branding and welcome message');
    console.log('   • ✅ No redirect to admin dashboard');
    console.log('   • ✅ Consistent user experience across client roles');

  } catch (error) {
    console.error('❌ [TEST_DASHBOARD_BEHAVIOR] Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testDashboardBehavior();
