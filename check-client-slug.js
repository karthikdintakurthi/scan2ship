#!/usr/bin/env node

/**
 * Check client slug in QA database
 */

const { PrismaClient } = require('@prisma/client');

async function checkClientSlug() {
  console.log('🔍 Checking client slug in QA database...\n');

  try {
    // Load QA environment variables
    require('dotenv').config({ path: '.env.qa' });
    
    const prisma = new PrismaClient();

    // Check the specific client
    const client = await prisma.clients.findUnique({
      where: { id: 'client-1756319181164-s6ds2994c' },
      select: {
        id: true,
        name: true,
        slug: true,
        companyName: true,
        isActive: true
      }
    });

    if (client) {
      console.log('Client found:');
      console.log(JSON.stringify(client, null, 2));
      
      if (!client.slug) {
        console.log('\n❌ Client slug is missing!');
        console.log('🔧 Generating slug from company name...');
        
        const slug = client.companyName?.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') || 'default-client';
        
        await prisma.clients.update({
          where: { id: client.id },
          data: { slug: slug }
        });
        
        console.log(`✅ Updated client slug to: ${slug}`);
      } else {
        console.log(`✅ Client slug is set: ${client.slug}`);
      }
    } else {
      console.log('❌ Client not found');
    }

    // Check all clients
    console.log('\n📊 All clients:');
    const allClients = await prisma.clients.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        companyName: true,
        isActive: true
      }
    });

    allClients.forEach((client, index) => {
      console.log(`${index + 1}. ${client.name} (${client.companyName})`);
      console.log(`   ID: ${client.id}`);
      console.log(`   Slug: ${client.slug || 'MISSING'}`);
      console.log(`   Active: ${client.isActive}`);
      console.log('');
    });

    await prisma.$disconnect();
    console.log('✅ Database check completed');

  } catch (error) {
    console.error('❌ Error checking client slug:', error.message);
  }
}

// Run the check
checkClientSlug();
