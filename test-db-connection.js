// Simple test to verify database connection and current state
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testDatabase() {
  try {
    console.log('🔍 Testing database connection...');
    
    // Test basic connection
    await prisma.$connect();
    console.log('✅ Database connected successfully');
    
    // Check if client_order_configs table exists and has the right columns
    const tableInfo = await prisma.$queryRaw`
      SELECT column_name, data_type, is_nullable, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'client_order_configs' 
      AND column_name IN ('enableOrderIdPrefix', 'enableResellerFallback')
      ORDER BY column_name;
    `;
    
    console.log('🔍 Table structure for enableOrderIdPrefix and enableResellerFallback:');
    console.log(tableInfo);
    
    // Check current data
    const configs = await prisma.client_order_configs.findMany({
      select: {
        id: true,
        clientId: true,
        enableOrderIdPrefix: true,
        enableResellerFallback: true
      }
    });
    
    console.log('🔍 Current client_order_configs data:');
    console.log(configs);
    
  } catch (error) {
    console.error('❌ Database test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testDatabase();
