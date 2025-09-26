#!/usr/bin/env node

/**
 * Create cross-app mapping for master client
 */

const { PrismaClient } = require('@prisma/client');

async function createMasterMapping() {
  console.log('🔧 Creating cross-app mapping for master client...\n');

  try {
    // Load QA environment variables
    require('dotenv').config({ path: '.env.qa' });
    
    const prisma = new PrismaClient();

    const masterClientId = 'master-client-1756272680179';
    const catalogClientId = 'cmg1a4yaa0000y7ndiwcbp1iq'; // Use existing catalog client
    const catalogApiKey = '8c6edcedae92b0baf4de84be6e5a9c4500e859655fc0892bc6434dd0ddcf3a2a';

    // Check if mapping already exists
    const existingMapping = await prisma.cross_app_mappings.findUnique({
      where: { scan2shipClientId: masterClientId }
    });

    if (existingMapping) {
      console.log('⚠️ Mapping already exists for master client:');
      console.log(JSON.stringify(existingMapping, null, 2));
      
      // Update the existing mapping
      const updatedMapping = await prisma.cross_app_mappings.update({
        where: { scan2shipClientId: masterClientId },
        data: {
          catalogClientId: catalogClientId,
          catalogApiKey: catalogApiKey,
          isActive: true
        }
      });
      
      console.log('✅ Updated existing mapping:', updatedMapping);
    } else {
      // Create new mapping
      const newMapping = await prisma.cross_app_mappings.create({
        data: {
          scan2shipClientId: masterClientId,
          catalogClientId: catalogClientId,
          catalogApiKey: catalogApiKey,
          isActive: true
        }
      });
      
      console.log('✅ Created new mapping for master client:', newMapping);
    }

    // Verify the mapping
    const mapping = await prisma.cross_app_mappings.findUnique({
      where: { scan2shipClientId: masterClientId },
      include: {
        scan2shipClient: {
          select: { name: true, slug: true }
        }
      }
    });

    if (mapping) {
      console.log('\n📊 Master client mapping verified:');
      console.log(`Scan2Ship Client: ${mapping.scan2shipClient.name} (${mapping.scan2shipClient.slug})`);
      console.log(`Catalog Client ID: ${mapping.catalogClientId}`);
      console.log(`API Key: ${mapping.catalogApiKey.substring(0, 8)}...`);
      console.log(`Active: ${mapping.isActive}`);
    } else {
      console.log('❌ Failed to verify mapping');
    }

    await prisma.$disconnect();
    console.log('\n✅ Mapping creation completed');

  } catch (error) {
    console.error('❌ Error creating mapping:', error);
  }
}

// Run the creation
createMasterMapping();
