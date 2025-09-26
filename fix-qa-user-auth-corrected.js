const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const QA_DATABASE_URL = "postgresql://postgres:JxntVxjvTOUAVphZrxuXjhIuAIPrcSto@trolley.proxy.rlwy.net:22039/railway";

async function fixQAUserAuth() {
  console.log('🔧 Fixing QA User Authentication...\n');

  const qaPrisma = new PrismaClient({
    datasources: {
      db: {
        url: QA_DATABASE_URL
      }
    }
  });

  try {
    await qaPrisma.$connect();
    console.log('✅ Connected to QA database');

    // Check existing users
    console.log('1. Checking existing users in QA...');
    const existingUsers = await qaPrisma.users.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        clientId: true
      }
    });

    console.log(`Found ${existingUsers.length} users:`);
    existingUsers.forEach((user, index) => {
      console.log(`   ${index + 1}. ${user.email}`);
      console.log(`      - Name: ${user.name || 'N/A'}`);
      console.log(`      - Role: ${user.role}`);
      console.log(`      - Active: ${user.isActive}`);
      console.log(`      - Client ID: ${user.clientId || 'N/A'}`);
      console.log('');
    });

    // Check if karthik@scan2ship.in exists
    console.log('2. Checking for karthik@scan2ship.in...');
    const karthikUser = await qaPrisma.users.findFirst({
      where: { email: 'karthik@scan2ship.in' }
    });

    if (karthikUser) {
      console.log('✅ User found, updating password...');
      const hashedPassword = await bcrypt.hash('admin123', 10);
      
      await qaPrisma.users.update({
        where: { id: karthikUser.id },
        data: { 
          password: hashedPassword,
          isActive: true,
          role: 'SUPER_ADMIN'
        }
      });
      
      console.log('✅ Password updated to: admin123');
    } else {
      console.log('❌ User not found, creating new super admin...');
      
      // Get the client from the cross-app mapping
      const mapping = await qaPrisma.cross_app_mappings.findFirst({
        where: { isActive: true }
      });

      if (!mapping) {
        console.log('❌ No cross-app mapping found');
        return;
      }

      const hashedPassword = await bcrypt.hash('admin123', 10);
      
      const newUser = await qaPrisma.users.create({
        data: {
          email: 'karthik@scan2ship.in',
          password: hashedPassword,
          name: 'Karthik Dintakurthi',
          role: 'SUPER_ADMIN',
          isActive: true,
          clientId: mapping.scan2shipClientId
        }
      });

      console.log('✅ Super admin created:');
      console.log(`   ID: ${newUser.id}`);
      console.log(`   Email: ${newUser.email}`);
      console.log(`   Role: ${newUser.role}`);
      console.log(`   Client ID: ${newUser.clientId}`);
    }

    // Test login
    console.log('\n3. Testing login...');
    const testUser = await qaPrisma.users.findFirst({
      where: { email: 'karthik@scan2ship.in' }
    });

    if (testUser) {
      const isValidPassword = await bcrypt.compare('admin123', testUser.password);
      console.log(`Login test: ${isValidPassword ? '✅ Success' : '❌ Failed'}`);
      
      if (isValidPassword) {
        console.log('\n🎉 QA User Authentication fixed!');
        console.log('You can now log in with:');
        console.log('Email: karthik@scan2ship.in');
        console.log('Password: admin123');
        console.log('\nThe 401 error should now be resolved.');
      }
    }

  } catch (error) {
    console.error('❌ Fix failed:', error);
  } finally {
    await qaPrisma.$disconnect();
  }
}

fixQAUserAuth();
