const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

// Initialize Prisma client
const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

async function clearAllData() {
  try {
    console.log('🗑️ Starting database cleanup...');
    
    // Test connection first
    console.log('🔌 Testing database connection...');
    await prisma.$connect();
    console.log('✅ Database connected successfully');
    
    // Clear all data in the correct order to avoid foreign key constraint issues
    console.log('🧹 Clearing sessions...');
    const sessionsResult = await prisma.sessions.deleteMany({});
    console.log(`   Deleted ${sessionsResult.count} sessions`);
    
    console.log('🧹 Clearing analytics events...');
    const analyticsResult = await prisma.analytics_events.deleteMany({});
    console.log(`   Deleted ${analyticsResult.count} analytics events`);
    
    console.log('🧹 Clearing order analytics...');
    const orderAnalyticsResult = await prisma.order_analytics.deleteMany({});
    console.log(`   Deleted ${orderAnalyticsResult.count} order analytics`);
    
    console.log('🧹 Clearing orders...');
    const ordersResult = await prisma.Order.deleteMany({});
    console.log(`   Deleted ${ordersResult.count} orders`);
    
    console.log('🧹 Clearing client order configs...');
    const clientOrderConfigsResult = await prisma.client_order_configs.deleteMany({});
    console.log(`   Deleted ${clientOrderConfigsResult.count} client order configs`);
    
    console.log('🧹 Clearing client configs...');
    const clientConfigsResult = await prisma.client_config.deleteMany({});
    console.log(`   Deleted ${clientConfigsResult.count} client configs`);
    
    console.log('🧹 Clearing courier services...');
    const courierServicesResult = await prisma.courier_services.deleteMany({});
    console.log(`   Deleted ${courierServicesResult.count} courier services`);
    
    console.log('🧹 Clearing pickup locations...');
    const pickupLocationsResult = await prisma.pickup_locations.deleteMany({});
    console.log(`   Deleted ${pickupLocationsResult.count} pickup locations`);
    
    console.log('🧹 Clearing users...');
    const usersResult = await prisma.users.deleteMany({});
    console.log(`   Deleted ${usersResult.count} users`);
    
    console.log('🧹 Clearing clients...');
    const clientsResult = await prisma.clients.deleteMany({});
    console.log(`   Deleted ${clientsResult.count} clients`);
    
    console.log('🧹 Clearing system config...');
    const systemConfigResult = await prisma.system_config.deleteMany({});
    console.log(`   Deleted ${systemConfigResult.count} system configs`);
    
    console.log('✅ All data cleared successfully!');
    
    // Create fresh master admin user
    console.log('👑 Creating fresh master admin user...');
    
    // First create a dummy client for the master admin (required due to foreign key constraint)
    const dummyClient = await prisma.clients.create({
      data: {
        id: `master-client-${Date.now()}`,
        name: 'System Master',
        companyName: 'Scan2Ship System',
        email: 'system@scan2ship.in',
        phone: null,
        address: null,
        city: null,
        state: null,
        country: 'India',
        pincode: null,
        subscriptionPlan: 'enterprise',
        subscriptionStatus: 'active',
        isActive: true,
        updatedAt: new Date()
      }
    });
    
    console.log('✅ Dummy client created for master admin:', dummyClient.companyName);
    
    const hashedPassword = await bcrypt.hash('Darling@2706', 12);
    
    const masterAdmin = await prisma.users.create({
      data: {
        id: `master-admin-${Date.now()}`,
        email: 'karthik@scan2ship.in',
        name: 'Karthik Dintakurthi',
        password: hashedPassword,
        role: 'master_admin',
        isActive: true,
        clientId: dummyClient.id, // Use the dummy client ID
        updatedAt: new Date()
      }
    });
    
    console.log('✅ Master admin user created successfully!');
    console.log('📧 Email:', masterAdmin.email);
    console.log('🔑 Password: Darling@2706');
    console.log('🆔 User ID:', masterAdmin.id);
    console.log('👑 Role:', masterAdmin.role);
    
    // Create basic system configuration
    console.log('⚙️ Creating basic system configuration...');
    
    await prisma.system_config.create({
      data: {
        id: `system-config-${Date.now()}`,
        key: 'SYSTEM_NAME',
        value: 'Scan2Ship',
        type: 'string',
        category: 'system',
        description: 'System name',
        isEncrypted: false,
        updatedAt: new Date()
      }
    });
    
    await prisma.system_config.create({
      data: {
        id: `system-config-${Date.now()}-2`,
        key: 'SYSTEM_VERSION',
        value: '1.0.0',
        type: 'string',
        category: 'system',
        description: 'System version',
        isEncrypted: false,
        updatedAt: new Date()
      }
    });
    
    console.log('✅ Basic system configuration created!');
    
    console.log('\n🎉 Database reset complete!');
    console.log('📊 Current database state:');
    console.log('   - 1 master admin user');
    console.log('   - 1 dummy client (for master admin)');
    console.log('   - 0 regular users');
    console.log('   - 0 orders');
    console.log('   - Basic system config');
    
  } catch (error) {
    console.error('❌ Error during database cleanup:', error);
    console.error('Error details:', error.message);
    console.error('Stack trace:', error.stack);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the cleanup
clearAllData()
  .then(() => {
    console.log('✅ Database cleanup completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Database cleanup failed:', error);
    process.exit(1);
  });
