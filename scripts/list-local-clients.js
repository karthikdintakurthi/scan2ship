const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

async function listLocalClients() {
  try {
    console.log(`🔍 Listing all clients in local database...`);
    
    const clients = await prisma.clients.findMany({
      select: {
        id: true,
        name: true,
        companyName: true,
        email: true,
        isActive: true,
        _count: {
          select: {
            courier_services: true,
            api_keys: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    console.log(`\n📋 Found ${clients.length} clients:`);
    
    clients.forEach((client, index) => {
      console.log(`\n${index + 1}. ${client.companyName || client.name}`);
      console.log(`   ID: ${client.id}`);
      console.log(`   Email: ${client.email}`);
      console.log(`   Active: ${client.isActive}`);
      console.log(`   Courier Services: ${client._count.courier_services}`);
      console.log(`   API Keys: ${client._count.api_keys}`);
    });
    
  } catch (error) {
    console.error('❌ Error listing clients:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
listLocalClients();
