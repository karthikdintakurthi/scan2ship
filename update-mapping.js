#!/usr/bin/env node

/**
 * Update cross-app mapping to point to the correct catalog client
 */

const { PrismaClient } = require('@prisma/client');

async function updateMapping() {
  console.log('🔧 Updating cross-app mapping...\n');

  try {
    // Load QA environment variables
    require('dotenv').config({ path: '.env.qa' });
    
    const prisma = new PrismaClient();

    // Create or update the mapping
    const updatedMapping = await prisma.cross_app_mappings.upsert({
      where: { 
        scan2shipClientId: 'client-1756319181164-s6ds2994c'
      },
      update: {
        catalogClientId: 'cmg1a4yaa0000y7ndiwcbp1iq', // New catalog client ID
        isActive: true
      },
      create: {
        scan2shipClientId: 'client-1756319181164-s6ds2994c',
        catalogClientId: 'cmg1a4yaa0000y7ndiwcbp1iq',
        catalogApiKey: 'test-api-key', // We'll update this later
        isActive: true
      }
    });

    console.log('✅ Updated cross-app mapping:');
    console.log(JSON.stringify(updatedMapping, null, 2));

    // Verify the mapping
    const mapping = await prisma.cross_app_mappings.findFirst({
      where: { scan2shipClientId: 'client-1756319181164-s6ds2994c' },
      include: {
        scan2shipClient: {
          select: { name: true, slug: true }
        }
      }
    });

    console.log('\n📊 Current mapping:');
    console.log(`Scan2Ship Client: ${mapping.scan2shipClient.name} (${mapping.scan2shipClient.slug})`);
    console.log(`Catalog Client ID: ${mapping.catalogClientId}`);
    console.log(`Active: ${mapping.isActive}`);

    await prisma.$disconnect();
    console.log('\n✅ Mapping update completed');

  } catch (error) {
    console.error('❌ Error updating mapping:', error);
  }
}

// Run the update
updateMapping();
