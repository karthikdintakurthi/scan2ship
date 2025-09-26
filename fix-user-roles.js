const { PrismaClient } = require('@prisma/client');

const QA_DATABASE_URL = "postgresql://postgres:JxntVxjvTOUAVphZrxuXjhIuAIPrcSto@trolley.proxy.rlwy.net:22039/railway";

async function fixUserRoles() {
  console.log('🔧 Fixing User Roles in QA...\n');

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

    // Check current roles
    console.log('1. Checking current roles...');
    const users = await qaPrisma.users.findMany({
      select: {
        id: true,
        email: true,
        role: true
      }
    });

    console.log(`Found ${users.length} users with roles:`);
    users.forEach((user, index) => {
      console.log(`   ${index + 1}. ${user.email}: "${user.role}"`);
    });

    // Fix karthik@scan2ship.in role
    console.log('\n2. Fixing karthik@scan2ship.in role...');
    const karthikUser = await qaPrisma.users.findFirst({
      where: { email: 'karthik@scan2ship.in' }
    });

    if (karthikUser) {
      await qaPrisma.users.update({
        where: { id: karthikUser.id },
        data: { role: 'super_admin' }
      });
      console.log('✅ Updated karthik@scan2ship.in role to: super_admin');
    }

    // Check if there are other users with uppercase roles
    console.log('\n3. Checking for other uppercase roles...');
    const uppercaseUsers = await qaPrisma.users.findMany({
      where: {
        role: {
          in: ['SUPER_ADMIN', 'MASTER_ADMIN', 'ADMIN', 'USER']
        }
      },
      select: {
        id: true,
        email: true,
        role: true
      }
    });

    if (uppercaseUsers.length > 0) {
      console.log(`Found ${uppercaseUsers.length} users with uppercase roles:`);
      uppercaseUsers.forEach(user => {
        console.log(`   - ${user.email}: "${user.role}"`);
      });

      // Convert all uppercase roles to lowercase
      console.log('\n4. Converting all uppercase roles to lowercase...');
      for (const user of uppercaseUsers) {
        const newRole = user.role.toLowerCase();
        await qaPrisma.users.update({
          where: { id: user.id },
          data: { role: newRole }
        });
        console.log(`   ✅ ${user.email}: "${user.role}" → "${newRole}"`);
      }
    } else {
      console.log('✅ No other uppercase roles found');
    }

    // Verify the fix
    console.log('\n5. Verifying fix...');
    const karthikUserAfter = await qaPrisma.users.findFirst({
      where: { email: 'karthik@scan2ship.in' },
      select: {
        id: true,
        email: true,
        role: true
      }
    });

    if (karthikUserAfter) {
      console.log(`✅ karthik@scan2ship.in role is now: "${karthikUserAfter.role}"`);
      console.log(`✅ Matches expected "super_admin": ${karthikUserAfter.role === 'super_admin'}`);
    }

    console.log('\n🎉 User roles fixed! The authentication should now work correctly.');

  } catch (error) {
    console.error('❌ Fix failed:', error);
  } finally {
    await qaPrisma.$disconnect();
  }
}

fixUserRoles();
