const { PrismaClient } = require('@prisma/client');

const QA_DATABASE_URL = "postgresql://postgres:JxntVxjvTOUAVphZrxuXjhIuAIPrcSto@trolley.proxy.rlwy.net:22039/railway";

async function checkUserRole() {
  console.log('🔍 Checking User Role in QA...\n');

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

    // Check karthik@scan2ship.in user
    const user = await qaPrisma.users.findFirst({
      where: { email: 'karthik@scan2ship.in' },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        clientId: true
      }
    });

    if (user) {
      console.log('User found:');
      console.log(`   ID: ${user.id}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Name: ${user.name}`);
      console.log(`   Role: "${user.role}"`);
      console.log(`   Active: ${user.isActive}`);
      console.log(`   Client ID: ${user.clientId}`);

      // Check role mapping
      console.log('\nRole Analysis:');
      console.log(`   Raw role from DB: "${user.role}"`);
      console.log(`   Type: ${typeof user.role}`);
      console.log(`   Length: ${user.role.length}`);
      console.log(`   Char codes: ${user.role.split('').map(c => c.charCodeAt(0)).join(', ')}`);

      // Check if it matches expected values
      const expectedRoles = ['user', 'admin', 'super_admin', 'master_admin', 'SUPER_ADMIN', 'MASTER_ADMIN'];
      console.log('\nRole Matching:');
      expectedRoles.forEach(expectedRole => {
        const matches = user.role === expectedRole;
        console.log(`   "${user.role}" === "${expectedRole}": ${matches}`);
      });

      // Check if it's a case issue
      console.log('\nCase Analysis:');
      console.log(`   Lowercase: "${user.role.toLowerCase()}"`);
      console.log(`   Uppercase: "${user.role.toUpperCase()}"`);
      console.log(`   Matches "super_admin": ${user.role.toLowerCase() === 'super_admin'}`);
      console.log(`   Matches "master_admin": ${user.role.toLowerCase() === 'master_admin'}`);

    } else {
      console.log('❌ User not found');
    }

  } catch (error) {
    console.error('❌ Check failed:', error);
  } finally {
    await qaPrisma.$disconnect();
  }
}

checkUserRole();
