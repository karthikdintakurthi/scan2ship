const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createMasterAdmin() {
  try {
    console.log('🔐 Creating master admin user...');
    
    // First, create or find a master client
    let masterClient = await prisma.clients.findFirst({
      where: {
        email: 'master@scan2ship.in'
      }
    });

    if (!masterClient) {
      console.log('🏢 Creating master client...');
      masterClient = await prisma.clients.create({
        data: {
          id: `master-client-${Date.now()}`,
          name: 'Master System',
          companyName: 'Scan2Ship Master System',
          email: 'master@scan2ship.in',
          phone: '+91-0000000000',
          address: 'Master System Address',
          city: 'Master City',
          state: 'Master State',
          country: 'India',
          pincode: '000000',
          subscriptionPlan: 'enterprise',
          subscriptionStatus: 'active',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
      console.log('✅ Master client created successfully!');
    } else {
      console.log('✅ Master client already exists');
    }
    
    // Check if master admin already exists
    const existingAdmin = await prisma.users.findFirst({
      where: {
        email: 'karthik@scan2ship.in',
        role: 'master_admin'
      }
    });

    if (existingAdmin) {
      console.log('⚠️  Master admin already exists, updating password...');
      
      // Update password
      const hashedPassword = await bcrypt.hash('Darling@2706', 12);
      await prisma.users.update({
        where: { id: existingAdmin.id },
        data: {
          password: hashedPassword,
          updatedAt: new Date()
        }
      });
      
      console.log('✅ Master admin password updated successfully!');
      console.log('📧 Email: karthik@scan2ship.in');
      console.log('🔑 Password: Darling@2706');
      console.log('👤 Role: master_admin');
    } else {
      console.log('➕ Creating new master admin user...');
      
      // Create master admin user
      const hashedPassword = await bcrypt.hash('Darling@2706', 12);
      const masterAdmin = await prisma.users.create({
        data: {
          id: `master-admin-${Date.now()}`,
          email: 'karthik@scan2ship.in',
          name: 'Karthik Dintakurthi',
          password: hashedPassword,
          role: 'master_admin',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          clientId: masterClient.id
        }
      });
      
      console.log('✅ Master admin created successfully!');
      console.log('📧 Email: karthik@scan2ship.in');
      console.log('🔑 Password: Darling@2706');
      console.log('👤 Role: master_admin');
      console.log('🆔 User ID:', masterAdmin.id);
      console.log('🏢 Client ID:', masterClient.id);
    }

  } catch (error) {
    console.error('❌ Error creating master admin:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createMasterAdmin();
