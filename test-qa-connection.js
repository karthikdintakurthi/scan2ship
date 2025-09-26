const { PrismaClient } = require('@prisma/client');

const QA_DATABASE_URL = "postgresql://postgres:JxntVxjvTOUAVphZrxuXjhIuAIPrcSto@trolley.proxy.rlwy.net:22039/railway";

async function testQAConnection() {
  console.log('🔍 Testing QA Database Connection...\n');

  const qaPrisma = new PrismaClient({
    datasources: {
      db: {
        url: QA_DATABASE_URL
      }
    }
  });

  try {
    console.log('1. Testing connection...');
    await qaPrisma.$connect();
    console.log('✅ Connected to QA database');

    console.log('\n2. Testing basic query...');
    const result = await qaPrisma.$queryRaw`SELECT 1 as test`;
    console.log('✅ Basic query successful:', result);

    console.log('\n3. Checking if users table exists...');
    const tables = await qaPrisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'users'
    `;
    console.log('Users table exists:', tables.length > 0);

    if (tables.length > 0) {
      console.log('\n4. Checking users...');
      const users = await qaPrisma.user.findMany({
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isActive: true
        }
      });
      console.log(`Found ${users.length} users:`);
      users.forEach((user, index) => {
        console.log(`   ${index + 1}. ${user.email} (${user.role})`);
      });
    }

    console.log('\n5. Checking rate_limits table...');
    const rateLimitsTable = await qaPrisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'rate_limits'
    `;
    console.log('Rate limits table exists:', rateLimitsTable.length > 0);

    if (rateLimitsTable.length > 0) {
      console.log('\n6. Checking rate_limits columns...');
      const columns = await qaPrisma.$queryRaw`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'rate_limits'
        ORDER BY ordinal_position
      `;
      console.log('Rate limits columns:');
      columns.forEach(col => {
        console.log(`   - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
      });
    }

  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    console.error('Full error:', error);
  } finally {
    await qaPrisma.$disconnect();
  }
}

testQAConnection();
