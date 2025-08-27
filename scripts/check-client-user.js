const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function checkClientUser() {
  try {
    console.log('🔍 Checking client user details...');
    
    // Find the client user
    const user = await prisma.users.findFirst({
      where: { email: 'sujatha@scan2ship.in' },
      include: { clients: true }
    });

    if (!user) {
      console.log('❌ User not found');
      return;
    }

    console.log('✅ User found:', {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      isActive: user.isActive,
      clientId: user.clientId,
      clientName: user.clients.companyName,
      hasPassword: !!user.password
    });

    // Test if we can hash a new password
    const testPassword = 'password123';
    const hashedPassword = await bcrypt.hash(testPassword, 12);
    
    console.log('\n🔐 Password test:');
    console.log(`   Test password: ${testPassword}`);
    console.log(`   Hashed length: ${hashedPassword.length}`);
    
    // Update the user's password
    console.log('\n🔄 Updating user password...');
    
    await prisma.users.update({
      where: { id: user.id },
      data: { password: hashedPassword }
    });
    
    console.log('✅ Password updated successfully!');
    console.log('\n🔐 New login credentials:');
    console.log(`   Email: ${user.email}`);
    console.log(`   Password: ${testPassword}`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkClientUser();
