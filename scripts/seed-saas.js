const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function seedSaaS() {
  try {
    console.log('🌱 Starting SaaS seed...');

    // Create a test client
    const client = await prisma.client.create({
      data: {
        name: 'Test Contact',
        companyName: 'Test Company',
        email: 'test@company.com',
        phone: '9876543210',
        address: '123 Test Street',
        city: 'Test City',
        state: 'Test State',
        country: 'India',
        pincode: '123456',
        subscriptionPlan: 'basic',
        subscriptionStatus: 'active',
        isActive: true
      }
    });

    console.log('✅ Created test client:', client.companyName);

    // Hash password for admin user
    const hashedPassword = await bcrypt.hash('admin123', 12);

    // Create admin user for the client
    const adminUser = await prisma.user.create({
      data: {
        email: 'admin@company.com',
        name: 'Admin User',
        password: hashedPassword,
        role: 'admin',
        isActive: true,
        clientId: client.id
      }
    });

    console.log('✅ Created admin user:', adminUser.email);

    // Create default pickup locations for the client
    const defaultPickupLocations = [
      { value: 'main-warehouse', label: 'Main Warehouse', delhiveryApiKey: null },
      { value: 'branch-office', label: 'Branch Office', delhiveryApiKey: null }
    ];

    for (const location of defaultPickupLocations) {
      await prisma.pickupLocation.create({
        data: {
          ...location,
          clientId: client.id
        }
      });
    }

    console.log('✅ Created default pickup locations');

    // Create default courier services for the client
    const defaultCourierServices = [
      { value: 'delhivery', label: 'Delhivery', isActive: true },
      { value: 'dtdc', label: 'DTDC', isActive: true },
      { value: 'india_post', label: 'India Post', isActive: true },
      { value: 'manual', label: 'Manual', isActive: true }
    ];

    for (const service of defaultCourierServices) {
      await prisma.courierService.create({
        data: {
          ...service,
          clientId: client.id
        }
      });
    }

    console.log('✅ Created default courier services');

    console.log('\n🎉 SaaS seed completed successfully!');
    console.log('\n📋 Test Credentials:');
    console.log('  Client ID:', client.id);
    console.log('  Admin Email: admin@company.com');
    console.log('  Admin Password: admin123');
    console.log('\n🔗 You can now login with these credentials');

  } catch (error) {
    console.error('❌ Error seeding SaaS data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seedSaaS();
