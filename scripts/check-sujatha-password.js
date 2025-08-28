require('dotenv').config({ path: '.env.local' });
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function checkSujathaPassword() {
  try {
    const user = await prisma.users.findFirst({
      where: { email: 'sujatha@scan2ship.in' },
      select: { password: true, name: true, email: true }
    });

    if (!user) {
      console.log('❌ Sujatha user not found');
      return;
    }

    console.log('📋 Sujatha user details:');
    console.log(`  - Name: ${user.name}`);
    console.log(`  - Email: ${user.email}`);
    console.log(`  - Password hash present: ${!!user.password}`);

    // Test common passwords
    const testPasswords = ['password123', 'sujatha123', '123456', 'password', 'sujatha'];
    
    for (const testPassword of testPasswords) {
      const isValid = await bcrypt.compare(testPassword, user.password || '');
      if (isValid) {
        console.log(`✅ Password found: ${testPassword}`);
        return;
      }
    }

    console.log('❌ None of the test passwords worked');
    console.log('💡 You may need to reset the password or check the database');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkSujathaPassword().catch(console.error);
