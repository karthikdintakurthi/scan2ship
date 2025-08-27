const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function testLogin() {
  try {
    console.log('🧪 Testing login functionality...');
    
    // Check if master admin exists
    const masterAdmin = await prisma.users.findFirst({
      where: {
        email: 'karthik@scan2ship.in'
      },
      include: {
        clients: true
      }
    });

    if (!masterAdmin) {
      console.log('❌ Master admin not found!');
      return;
    }

    console.log('✅ Master admin found:');
    console.log('  - ID:', masterAdmin.id);
    console.log('  - Email:', masterAdmin.email);
    console.log('  - Role:', masterAdmin.role);
    console.log('  - Is Active:', masterAdmin.isActive);
    console.log('  - Client ID:', masterAdmin.clientId);
    
    if (masterAdmin.clients) {
      console.log('  - Client Name:', masterAdmin.clients.companyName);
      console.log('  - Client Is Active:', masterAdmin.clients.isActive);
    } else {
      console.log('  - ❌ No client associated!');
    }

    // Test password verification
    const testPassword = 'Darling@2706';
    const isValidPassword = await bcrypt.compare(testPassword, masterAdmin.password || '');
    
    console.log('\n🔑 Password verification:');
    console.log('  - Test Password:', testPassword);
    console.log('  - Password Hash:', masterAdmin.password ? 'Present' : 'Missing');
    console.log('  - Password Valid:', isValidPassword);

    // Check if there are any issues with the user setup
    if (!masterAdmin.isActive) {
      console.log('\n❌ User is not active!');
    }
    
    if (!masterAdmin.clients) {
      console.log('\n❌ User has no associated client!');
    } else if (!masterAdmin.clients.isActive) {
      console.log('\n❌ Associated client is not active!');
    }

    if (isValidPassword && masterAdmin.isActive && masterAdmin.clients && masterAdmin.clients.isActive) {
      console.log('\n✅ Login should work! All conditions are met.');
    } else {
      console.log('\n❌ Login will fail! Check the issues above.');
    }

  } catch (error) {
    console.error('❌ Error testing login:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testLogin();
