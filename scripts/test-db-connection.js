const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testDatabaseConnection() {
  try {
    console.log('🔍 Testing database connection...');

    // Test 1: Basic connection
    console.log('📊 Testing basic Prisma connection...');
    await prisma.$connect();
    console.log('✅ Database connection successful');

    // Test 2: Find Master Admin
    console.log('\n👑 Looking for Master Admin user...');
    const masterAdmin = await prisma.users.findFirst({
      where: {
        email: 'karthik@scan2ship.in',
        role: 'master_admin'
      },
      include: {
        clients: true
      }
    });

    if (masterAdmin) {
      console.log('✅ Found Master Admin:', {
        id: masterAdmin.id,
        email: masterAdmin.email,
        name: masterAdmin.name,
        role: masterAdmin.role,
        isActive: masterAdmin.isActive,
        clientId: masterAdmin.clientId,
        clientName: masterAdmin.clients.companyName
      });
    } else {
      console.log('❌ Master Admin not found');
    }

    // Test 3: Count all users
    console.log('\n👥 Counting all users...');
    const userCount = await prisma.users.count();
    console.log(`✅ Total users in database: ${userCount}`);

    // Test 4: Count all clients
    console.log('\n🏢 Counting all clients...');
    const clientCount = await prisma.clients.count();
    console.log(`✅ Total clients in database: ${clientCount}`);

    // Test 5: List all users with their roles
    console.log('\n📋 Listing all users and their roles...');
    const allUsers = await prisma.users.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        clients: {
          select: {
            companyName: true
          }
        }
      }
    });

    allUsers.forEach(user => {
      console.log(`   - ${user.email} (${user.name}) - Role: ${user.role} - Client: ${user.clients.companyName} - Active: ${user.isActive}`);
    });

    // Test 6: Test system config
    console.log('\n⚙️  Testing system config...');
    const systemConfigs = await prisma.system_config.findMany();
    console.log(`✅ Found ${systemConfigs.length} system configurations`);

    console.log('\n🎉 Database connection test completed successfully!');

  } catch (error) {
    console.error('❌ Database connection test failed:', error);
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      code: error.code,
      meta: error.meta
    });
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testDatabaseConnection()
  .then(() => {
    console.log('\n✅ Test completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  });
