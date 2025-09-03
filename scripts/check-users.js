const { PrismaClient } = require('@prisma/client');
require('dotenv').config({ path: '.env.local' });

const prisma = new PrismaClient();

async function checkUsers() {
  console.log('🔍 [CHECK_USERS] Checking users in database...');
  
  try {
    // Get all users
    const users = await prisma.users.findMany({
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true,
        clientId: true
      }
    });
    
    console.log('📊 [CHECK_USERS] Found users:', users.length);
    
    users.forEach((user, index) => {
      console.log(`\n👤 [CHECK_USERS] User ${index + 1}:`);
      console.log(`   - ID: ${user.id}`);
      console.log(`   - Email: ${user.email}`);
      console.log(`   - Role: ${user.role}`);
      console.log(`   - Active: ${user.isActive}`);
      console.log(`   - Client ID: ${user.clientId}`);
    });
    
    // Check for admin/master_admin users specifically
    const adminUsers = users.filter(user => 
      user.role === 'admin' || user.role === 'master_admin'
    );
    
    console.log(`\n🔐 [CHECK_USERS] Admin users found: ${adminUsers.length}`);
    
    if (adminUsers.length > 0) {
      adminUsers.forEach((user, index) => {
        console.log(`\n👑 [CHECK_USERS] Admin User ${index + 1}:`);
        console.log(`   - Email: ${user.email}`);
        console.log(`   - Role: ${user.role}`);
        console.log(`   - Active: ${user.isActive}`);
      });
    } else {
      console.log('⚠️ [CHECK_USERS] No admin users found!');
    }
    
    // Check for the specific email we're trying to use
    const targetUser = users.find(user => 
      user.email === 'admin@scan2ship.com'
    );
    
    if (targetUser) {
      console.log(`\n🎯 [CHECK_USERS] Target user found:`);
      console.log(`   - Email: ${targetUser.email}`);
      console.log(`   - Role: ${targetUser.role}`);
      console.log(`   - Active: ${targetUser.isActive}`);
    } else {
      console.log(`\n❌ [CHECK_USERS] Target user 'admin@scan2ship.com' not found!`);
    }
    
  } catch (error) {
    console.error('❌ [CHECK_USERS] Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUsers();
