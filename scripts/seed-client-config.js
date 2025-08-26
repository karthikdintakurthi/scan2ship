const { PrismaClient } = require('@prisma/client');
require('dotenv').config({ path: '.env.local' });

const prisma = new PrismaClient();

// Default client configurations
const defaultClientConfigs = [
  // Order Configuration
  {
    key: 'AUTO_ASSIGN_TRACKING',
    value: 'true',
    type: 'boolean',
    category: 'order',
    description: 'Automatically assign tracking numbers to orders',
    isEncrypted: false
  },
  {
    key: 'REQUIRE_TRACKING',
    value: 'false',
    type: 'boolean',
    category: 'order',
    description: 'Require tracking number for all orders',
    isEncrypted: false
  },
  {
    key: 'DEFAULT_COURIER',
    value: 'delhivery',
    type: 'string',
    category: 'order',
    description: 'Default courier service for orders',
    isEncrypted: false
  },

  // Courier Configuration
  {
    key: 'DELHIVERY_ENABLED',
    value: 'true',
    type: 'boolean',
    category: 'courier',
    description: 'Enable Delhivery courier service',
    isEncrypted: false
  },
  // Note: DELHIVERY_API_KEY is now managed at pickup location level, not client level
];

async function seedClientConfigs() {
  try {
    console.log('🌱 Seeding client configurations...');

    // Get all clients
    const clients = await prisma.client.findMany();
    
    if (clients.length === 0) {
      console.log('⚠️ No clients found. Please create clients first.');
      return;
    }

    console.log(`📊 Found ${clients.length} clients`);

    // Seed configurations for each client
    for (const client of clients) {
      console.log(`🔧 Seeding configurations for client: ${client.companyName}`);

      for (const config of defaultClientConfigs) {
        await prisma.clientConfig.upsert({
          where: {
            clientId_key: {
              clientId: client.id,
              key: config.key
            }
          },
          update: {
            value: config.value,
            type: config.type,
            category: config.category,
            description: config.description,
            isEncrypted: config.isEncrypted,
            updatedAt: new Date()
          },
          create: {
            clientId: client.id,
            key: config.key,
            value: config.value,
            type: config.type,
            category: config.category,
            description: config.description,
            isEncrypted: config.isEncrypted
          }
        });
      }

      // Create default pickup location if none exists
      const existingPickupLocations = await prisma.pickupLocation.findMany({
        where: { clientId: client.id }
      });

      if (existingPickupLocations.length === 0) {
        await prisma.pickupLocation.create({
          data: {
            clientId: client.id,
            value: 'RVD JEWELS',
            label: 'RVD JEWELS',
            delhiveryApiKey: '' // API key should be configured manually in the admin interface
          }
        });
        console.log(`📍 Created default pickup location for ${client.companyName}`);
      }

      // Create default courier services if none exist
      const existingCourierServices = await prisma.courierService.findMany({
        where: { clientId: client.id }
      });

      if (existingCourierServices.length === 0) {
        const defaultServices = [
          { value: 'delhivery', label: 'Delhivery' },
          { value: 'bluedart', label: 'Blue Dart' },
          { value: 'fedex', label: 'FedEx' }
        ];

        for (const service of defaultServices) {
          await prisma.courierService.create({
            data: {
              clientId: client.id,
              value: service.value,
              label: service.label,
              isActive: true
            }
          });
        }
        console.log(`🚚 Created default courier services for ${client.companyName}`);
      }
    }

    console.log('✅ Client configurations seeded successfully!');
    console.log(`📊 Total clients processed: ${clients.length}`);
    console.log(`🔧 Configurations per client: ${defaultClientConfigs.length}`);

  } catch (error) {
    console.error('❌ Error seeding client configurations:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seedClientConfigs();
