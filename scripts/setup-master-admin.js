const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function setupMasterAdmin() {
  try {
    console.log('🔧 Setting up Master Admin...');

    // Step 1: Clean up existing users and sessions
    console.log('🗑️  Cleaning up existing users and sessions...');
    
    // Delete all sessions first (due to foreign key constraints)
    await prisma.session.deleteMany({});
    console.log('✅ Deleted all sessions');

    // Delete all users
    await prisma.user.deleteMany({});
    console.log('✅ Deleted all users');

    // Step 2: Create Master Admin user
    console.log('👑 Creating Master Admin user...');
    
    // Hash the password
    const hashedPassword = await bcrypt.hash('Darling@2706', 12);
    
    // Create a system client for the master admin (if it doesn't exist)
    let systemClient = await prisma.client.findFirst({
      where: {
        companyName: 'Scan2Ship System'
      }
    });

    if (!systemClient) {
      systemClient = await prisma.client.create({
        data: {
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
          isActive: true
        }
      });
      console.log('✅ Created system client for Master Admin');
    } else {
      console.log('✅ Found existing system client');
    }

    // Create the Master Admin user
    const masterAdmin = await prisma.user.create({
      data: {
        email: 'karthik@scan2ship.in',
        name: 'Karthik - Master Admin',
        password: hashedPassword,
        role: 'master_admin', // New role for master admin
        isActive: true,
        clientId: systemClient.id
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
        key: 'MASTER_ADMIN_EMAIL',
        value: 'karthik@scan2ship.in',
        type: 'string',
        category: 'security',
        description: 'Master Admin Email Address',
        isEncrypted: false
      },
      {
        key: 'SYSTEM_NAME',
        value: 'Scan2Ship - Accelerate Your Logistics',
        type: 'string',
        category: 'general',
        description: 'System Name',
        isEncrypted: false
      },
      {
        key: 'MASTER_ADMIN_ENABLED',
        value: 'true',
        type: 'boolean',
        category: 'security',
        description: 'Master Admin Access Enabled',
        isEncrypted: false
      }
    ];

    for (const config of systemConfigs) {
      await prisma.systemConfig.upsert({
        where: { key: config.key },
        update: config,
        create: config
      });
    }

    console.log('✅ Created system configurations');

    // Step 4: Create client configurations for Master Admin
    console.log('🔧 Creating client configurations for Master Admin...');
    
    const clientConfigs = [
      {
        key: 'MASTER_ADMIN_ACCESS',
        value: 'true',
        type: 'boolean',
        category: 'security',
        description: 'Master Admin Access Level',
        isEncrypted: false
      },
      {
        key: 'CAN_MANAGE_CLIENTS',
        value: 'true',
        type: 'boolean',
        category: 'security',
        description: 'Can Manage All Clients',
        isEncrypted: false
      },
      {
        key: 'CAN_VIEW_ALL_ORDERS',
        value: 'true',
        type: 'boolean',
        category: 'security',
        description: 'Can View All Client Orders',
        isEncrypted: false
      },
      {
        key: 'CAN_MANAGE_SYSTEM',
        value: 'true',
        type: 'boolean',
        category: 'security',
        description: 'Can Manage System Settings',
        isEncrypted: false
      }
    ];

    for (const config of clientConfigs) {
      await prisma.clientConfig.upsert({
        where: {
          clientId_key: {
            clientId: systemClient.id,
            key: config.key
          }
        },
        update: config,
        create: {
          ...config,
          clientId: systemClient.id
        }
      });
    }

    console.log('✅ Created client configurations for Master Admin');

    console.log('\n🎉 Master Admin setup completed successfully!');
    console.log('\n📋 Summary:');
    console.log('   • Deleted all existing users and sessions');
    console.log('   • Created Master Admin: karthik@scan2ship.in');
    console.log('   • Password: Darling@2706');
    console.log('   • Role: master_admin');
    console.log('   • System client created for Master Admin');
    console.log('   • System and client configurations created');
    console.log('\n🔐 Login credentials:');
    console.log('   Email: karthik@scan2ship.in');
    console.log('   Password: Darling@2706');

  } catch (error) {
    console.error('❌ Error setting up Master Admin:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the setup
setupMasterAdmin()
  .then(() => {
    console.log('\n✅ Setup completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Setup failed:', error);
    process.exit(1);
  });
