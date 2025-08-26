const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createClientUser() {
  try {
    // Get command line arguments
    const args = process.argv.slice(2);
    
    if (args.length < 4) {
      console.log('❌ Usage: node scripts/create-client-user.js <companyName> <contactName> <email> <password> [phone] [address] [city] [state] [pincode]');
      console.log('');
      console.log('📝 Example:');
      console.log('   node scripts/create-client-user.js "RVD Jewels" "John Doe" "john@rvdjewels.com" "password123" "9876543210" "123 Main St" "Mumbai" "Maharashtra" "400001"');
      console.log('');
      process.exit(1);
    }

    const [companyName, contactName, email, password, phone, address, city, state, pincode] = args;

    console.log('🏢 Creating client user...');
    console.log(`   Company: ${companyName}`);
    console.log(`   Contact: ${contactName}`);
    console.log(`   Email: ${email}`);

    // Step 1: Create the client
    const client = await prisma.client.create({
      data: {
        name: contactName,
        companyName: companyName,
        email: email,
        phone: phone || null,
        address: address || null,
        city: city || null,
        state: state || null,
        country: 'India',
        pincode: pincode || null,
        subscriptionPlan: 'basic',
        subscriptionStatus: 'active',
        isActive: true
      }
    });

    console.log('✅ Created client:', {
      id: client.id,
      companyName: client.companyName,
      name: client.name,
      email: client.email
    });

    // Step 2: Create the user
    const hashedPassword = await bcrypt.hash(password, 12);
    
    const user = await prisma.user.create({
      data: {
        email: email,
        name: contactName,
        password: hashedPassword,
        role: 'user', // Client user role
        isActive: true,
        clientId: client.id
      }
    });

    console.log('✅ Created user:', {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      clientId: user.clientId
    });

    // Step 3: Create default client configurations
    console.log('⚙️  Creating default client configurations...');
    
    const defaultConfigs = [
      // Note: DELHIVERY_API_KEY is now managed at pickup location level, not client level
      {
        key: 'DELHIVERY_API_SECRET',
        value: '',
        type: 'password',
        category: 'delhivery',
        description: 'Delhivery API Secret',
        isEncrypted: true
      },

    ];

    for (const config of defaultConfigs) {
      await prisma.clientConfig.create({
        data: {
          ...config,
          clientId: client.id
        }
      });
    }

    console.log('✅ Created default client configurations');

    // Step 4: Create default pickup locations
    console.log('📍 Creating default pickup locations...');
    
    const defaultPickupLocations = [
      {
        value: 'main_warehouse',
        label: 'Main Warehouse',
        delhiveryApiKey: null
      }
    ];

    for (const location of defaultPickupLocations) {
      await prisma.pickupLocation.create({
        data: {
          ...location,
          clientId: client.id
        }
      });
    }

    console.log('✅ Created default pickup locations');

    // Step 5: Create default courier services
    console.log('🚚 Creating default courier services...');
    
    const defaultCourierServices = [
      {
        value: 'delhivery',
        label: 'Delhivery',
        isActive: true
      },
      {
        value: 'bluedart',
        label: 'Blue Dart',
        isActive: true
      }
    ];

    for (const service of defaultCourierServices) {
      await prisma.courierService.create({
        data: {
          ...service,
          clientId: client.id
        }
      });
    }

    console.log('✅ Created default courier services');

    // Step 6: Create default order configuration
    console.log('📦 Creating default order configuration...');
    
    await prisma.clientOrderConfig.create({
      data: {
        clientId: client.id,
        // Default values
        defaultProductDescription: 'ARTIFICIAL JEWELLERY',
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

    console.log('✅ Created default order configuration');

    console.log('\n🎉 Client user setup completed successfully!');
    console.log('\n📋 Summary:');
    console.log(`   • Client: ${client.companyName} (${client.id})`);
    console.log(`   • User: ${user.name} (${user.email})`);
    console.log(`   • Password: ${password}`);
    console.log(`   • Role: ${user.role}`);
    console.log('   • Default configurations created');
    console.log('   • Default pickup locations created');
    console.log('   • Default courier services created');
    console.log('   • Default order configuration created');
    console.log('\n🔐 Login credentials:');
    console.log(`   Email: ${email}`);
    console.log(`   Password: ${password}`);

  } catch (error) {
    console.error('❌ Error creating client user:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
createClientUser()
  .then(() => {
    console.log('\n✅ Client user creation completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Client user creation failed:', error);
    process.exit(1);
  });
