const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function setupMasterAdmin() {
  try {
    console.log('🔧 Setting up Master Admin...');

    // Step 1: Clean up existing users and sessions
    console.log('🗑️  Cleaning up existing users and sessions...');
    
    // Delete all sessions first (due to foreign key constraints)
    await prisma.sessions.deleteMany({});
    console.log('✅ Deleted all sessions');

    // Delete all users
    await prisma.users.deleteMany({});
    console.log('✅ Deleted all users');

    // Step 2: Create Master Admin user
    console.log('👑 Creating Master Admin user...');
    
    // Hash the password
    const hashedPassword = await bcrypt.hash('Darling@2706', 12);
    
    // Create a system client for the master admin (if it doesn't exist)
    let systemClient = await prisma.clients.findFirst({
      where: {
        companyName: 'Scan2Ship System'
      }
    });

    if (!systemClient) {
      systemClient = await prisma.clients.create({
        data: {
          id: 'system-client-' + Date.now(),
          name: 'System Administrator',
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
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
      console.log('✅ Created system client for Master Admin');
    } else {
      console.log('✅ Found existing system client');
    }

    // Create the Master Admin user
    const masterAdmin = await prisma.users.create({
      data: {
        id: 'master-admin-' + Date.now(),
        email: 'karthik@scan2ship.in',
        name: 'Karthik - Master Admin',
        password: hashedPassword,
        role: 'master_admin', // New role for master admin
        isActive: true,
        clientId: systemClient.id,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });

    console.log('✅ Created Master Admin user:', {
      id: masterAdmin.id,
      email: masterAdmin.email,
      name: masterAdmin.name,
      role: masterAdmin.role,
      clientId: masterAdmin.clientId
    });

    // Step 3: Create system configuration for Master Admin
    console.log('⚙️  Creating system configuration...');
    
    const systemConfigs = [
      {
        id: 'config-' + Date.now() + '-1',
        key: 'MASTER_ADMIN_EMAIL',
        value: 'karthik@scan2ship.in',
        type: 'string',
        category: 'security',
        description: 'Master Admin Email Address',
        isEncrypted: false,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'config-' + Date.now() + '-2',
        key: 'SYSTEM_NAME',
        value: 'Scan2Ship - Accelerate Your Logistics',
        type: 'string',
        category: 'general',
        description: 'System Name',
        isEncrypted: false,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'config-' + Date.now() + '-3',
        key: 'MASTER_ADMIN_ENABLED',
        value: 'true',
        type: 'boolean',
        category: 'security',
        description: 'Master Admin Access Enabled',
        isEncrypted: false,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    for (const config of systemConfigs) {
      await prisma.system_config.upsert({
        where: { key: config.key },
        update: config,
        create: config
      });
    }
    console.log('✅ Created system configuration');

    console.log('🎉 Master Admin setup completed successfully!');
    console.log('🔑 Master Admin credentials:');
    console.log('   Email: karthik@scan2ship.in');
    console.log('   Password: Darling@2706');
    console.log('   Role: master_admin');

  } catch (error) {
    console.error('❌ Error setting up Master Admin:', error);
  } finally {
    await prisma.$disconnect();
  }
}

setupMasterAdmin();
