console.log('🔍 Testing Prisma Import...\n');

try {
  console.log('1. Importing PrismaClient...');
  const { PrismaClient } = require('@prisma/client');
  console.log('✅ PrismaClient imported successfully');
  console.log('PrismaClient type:', typeof PrismaClient);
  console.log('PrismaClient constructor:', PrismaClient.name);

  console.log('\n2. Creating Prisma instance...');
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: "postgresql://postgres:JxntVxjvTOUAVphZrxuXjhIuAIPrcSto@trolley.proxy.rlwy.net:22039/railway"
      }
    }
  });
  console.log('✅ Prisma instance created');
  console.log('Prisma instance type:', typeof prisma);
  console.log('Has user property:', 'user' in prisma);
  console.log('User type:', typeof prisma.user);

  if (prisma.user) {
    console.log('✅ prisma.user exists');
    console.log('Has findMany method:', typeof prisma.user.findMany === 'function');
  } else {
    console.log('❌ prisma.user is undefined');
  }

  console.log('\n3. Available Prisma models:');
  const models = Object.keys(prisma).filter(key => 
    typeof prisma[key] === 'object' && 
    prisma[key] !== null && 
    typeof prisma[key].findMany === 'function'
  );
  console.log('Models:', models);

} catch (error) {
  console.error('❌ Import failed:', error.message);
  console.error('Full error:', error);
}
