#!/usr/bin/env node

/**
 * Check Cross-App Mappings in QA database
 */

const { PrismaClient } = require('@prisma/client');

async function checkQAMappings() {
  console.log('🔍 Checking Cross-App Mappings in QA database...\n');

  try {
    // Load QA environment variables
    require('dotenv').config({ path: '.env.qa' });
    
    const prisma = new PrismaClient();

    // Check if cross_app_mappings table exists
    console.log('📊 Checking cross_app_mappings table...');
    const mappings = await prisma.cross_app_mappings.findMany({
      include: {
        scan2shipClient: {
          select: {
            id: true,
            name: true,
            companyName: true,
            email: true,
            isActive: true
          }
        }
      }
    });

    console.log(`Found ${mappings.length} Cross-App Mappings:`);
    
    if (mappings.length === 0) {
      console.log('❌ No Cross-App Mappings found!');
      console.log('\n🔧 To fix this:');
      console.log('1. Go to https://qa.scan2ship.in/admin/cross-app-mappings');
      console.log('2. Create a new mapping between scan2ship client and catalog client');
      console.log('3. Add the catalog API key from stockmind');
    } else {
      mappings.forEach((mapping, index) => {
        console.log(`\n${index + 1}. Mapping ID: ${mapping.id}`);
        console.log(`   Scan2Ship Client: ${mapping.scan2shipClient.name} (${mapping.scan2shipClient.email})`);
        console.log(`   Catalog Client ID: ${mapping.catalogClientId}`);
        console.log(`   API Key: ${mapping.catalogApiKey ? '***' + mapping.catalogApiKey.slice(-4) : 'Not set'}`);
        console.log(`   Active: ${mapping.isActive}`);
        console.log(`   Created: ${mapping.createdAt}`);
      });
    }

    // Check clients table
    console.log('\n📊 Checking clients table...');
    const clients = await prisma.clients.findMany({
      select: {
        id: true,
        name: true,
        companyName: true,
        email: true,
        isActive: true,
        slug: true
      }
    });

    console.log(`Found ${clients.length} clients:`);
    clients.forEach((client, index) => {
      console.log(`\n${index + 1}. ${client.name} (${client.email})`);
      console.log(`   ID: ${client.id}`);
      console.log(`   Company: ${client.companyName}`);
      console.log(`   Slug: ${client.slug || 'Not set'}`);
      console.log(`   Active: ${client.isActive}`);
    });

    await prisma.$disconnect();
    console.log('\n✅ Database check completed');

  } catch (error) {
    console.error('❌ Error checking QA database:', error.message);
  }
}

// Run the check
checkQAMappings();
