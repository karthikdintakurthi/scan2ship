const { PrismaClient } = require('@prisma/client');
require('dotenv').config({ path: '.env.local' });

const prisma = new PrismaClient();

async function seedClientOrderConfigs() {
  try {
    console.log('🌱 Seeding client order configurations...');

    // Get all clients
    const clients = await prisma.client.findMany();
    console.log(`Found ${clients.length} clients`);

    for (const client of clients) {
      console.log(`Processing client: ${client.companyName}`);

      // Check if order config already exists
      const existingConfig = await prisma.clientOrderConfig.findUnique({
        where: { clientId: client.id }
      });

      if (existingConfig) {
        console.log(`Order config already exists for ${client.companyName}, skipping...`);
        continue;
      }

      // Create default order configuration
      const orderConfig = await prisma.clientOrderConfig.create({
        data: {
          clientId: client.id,
          // Default values
          defaultProductDescription: 'ARTIFICAL JEWELLERY',
          defaultPackageValue: 5000,
          defaultWeight: 100,
          defaultTotalItems: 1,
          
          // COD settings
          codEnabledByDefault: false,
          defaultCodAmount: null,
          
          // Validation rules
          minPackageValue: 100,
          maxPackageValue: 100000,
          minWeight: 1,
          maxWeight: 50000,
          minTotalItems: 1,
          maxTotalItems: 100,
          
          // Field requirements
          requireProductDescription: true,
          requirePackageValue: true,
          requireWeight: true,
          requireTotalItems: true
        }
      });

      console.log(`✅ Created order config for ${client.companyName}:`, {
        id: orderConfig.id,
        defaultProductDescription: orderConfig.defaultProductDescription,
        defaultPackageValue: orderConfig.defaultPackageValue,
        defaultWeight: orderConfig.defaultWeight,
        defaultTotalItems: orderConfig.defaultTotalItems
      });
    }

    console.log('✅ Client order configurations seeded successfully!');

  } catch (error) {
    console.error('❌ Error seeding client order configurations:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seedClientOrderConfigs();
