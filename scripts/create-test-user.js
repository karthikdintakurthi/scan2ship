const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createTestUser() {
  try {
    console.log('🔧 Creating test user...');

    // Step 1: Create a test client if it doesn't exist
    console.log('🏢 Creating test client...');
    
    let testClient = await prisma.clients.findFirst({
      where: {
        companyName: 'Test Company'
      }
    });

    if (!testClient) {
      testClient = await prisma.clients.create({
        data: {
          id: 'test-client-' + Date.now(),
          name: 'Test Company',
          companyName: 'Test Company',
          email: 'test@company.com',
          phone: '+91-9876543210',
          address: '123 Test Street',
          city: 'Mumbai',
          state: 'Maharashtra',
          country: 'India',
          pincode: '400001',
          subscriptionPlan: 'basic',
          subscriptionStatus: 'active',
          isActive: true,
          updatedAt: new Date()
        }
      });
      console.log('✅ Created test client:', testClient.id);
    } else {
      console.log('✅ Found existing test client:', testClient.id);
    }

    // Step 2: Create a test user
    console.log('👤 Creating test user...');
    
    // Hash the password
    const hashedPassword = await bcrypt.hash('test123', 12);
    
    const testUser = await prisma.users.create({
      data: {
        id: 'test-user-' + Date.now(),
        email: 'test@example.com',
        name: 'Test User',
        password: hashedPassword,
        role: 'user',
        isActive: true,
        clientId: testClient.id,
        updatedAt: new Date()
      }
    });

    console.log('✅ Created test user:', {
      id: testUser.id,
      email: testUser.email,
      name: testUser.name,
      role: testUser.role,
      clientId: testUser.clientId
    });

    console.log('🔑 Test user credentials:');
    console.log('   Email: test@example.com');
    console.log('   Password: test123');

  } catch (error) {
    console.error('❌ Error creating test user:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestUser();
