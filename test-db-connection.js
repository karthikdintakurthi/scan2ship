const { PrismaClient } = require('@prisma/client');

async function testDatabaseConnection() {
  const prisma = new PrismaClient();
  
  try {
    console.log('Testing database connection...');
    
    // Test basic connection
    await prisma.$connect();
    console.log('✅ Database connected successfully');
    
    // Test cross_app_mappings table
    const mappings = await prisma.cross_app_mappings.findMany();
    console.log('✅ Cross-app mappings found:', mappings.length);
    
    if (mappings.length > 0) {
      mappings.forEach((mapping, index) => {
        console.log(`${index + 1}. ID: ${mapping.id}`);
        console.log(`   Scan2Ship Client ID: ${mapping.scan2shipClientId}`);
        console.log(`   Catalog Client ID: ${mapping.catalogClientId}`);
        console.log(`   Is Active: ${mapping.isActive}`);
        console.log('');
      });
    }
    
    // Test specific client lookup
    const testClientId = 'master-client-1756272680179';
    const specificMapping = await prisma.cross_app_mappings.findFirst({
      where: {
        scan2shipClientId: testClientId,
        isActive: true
      }
    });
    
    console.log(`✅ Mapping for client ${testClientId}:`, specificMapping ? 'FOUND' : 'NOT FOUND');
    
  } catch (error) {
    console.error('❌ Database error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

testDatabaseConnection();
