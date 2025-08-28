const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database with sample orders...')

  const sampleOrders = [
    {
      mobile: '+91-9876543210',
      courier_service: 'Delhivery',
      pincode: '400001',
      name: 'Rajesh Kumar',
      address: '123 Marine Drive, Mumbai',
      city: 'Mumbai',
      state: 'Maharashtra',
      country: 'India',
      pickup_location: 'VIJAYA8 FRANCHISE',
      is_cod: true,
      cod_amount: 2500.00,
      package_value: 2500.00,
      reference_number: 'REF001',
      total_items: 2,
      weight: 1.5,
      tracking_id: 'DL123456789',
      reseller_name: 'Mumbai Store',
      reseller_mobile: '+91-9876543211'
    },
    {
      mobile: '+91-8765432109',
      courier_service: 'Blue Dart',
      pincode: '110001',
      name: 'Priya Sharma',
      address: '456 Connaught Place, New Delhi',
      city: 'New Delhi',
      state: 'Delhi',
      country: 'India',
      pickup_location: 'VIJAYA8 FRANCHISE',
      is_cod: false,
      cod_amount: null,
      package_value: 1800.50,
      reference_number: null,
      total_items: 1,
      weight: 0.8,
      tracking_id: 'BD987654321',
      reseller_name: null,
      reseller_mobile: null
    },
    {
      mobile: '+91-7654321098',
      courier_service: 'DTDC',
      pincode: '560001',
      name: 'Arjun Reddy',
      address: '789 Brigade Road, Bangalore',
      city: 'Bangalore',
      state: 'Karnataka',
      country: 'India',
      pickup_location: 'VIJAYA8 FRANCHISE',
      is_cod: true,
      cod_amount: 3200.75,
      package_value: 3200.75,
      reference_number: 'REF002',
      total_items: 3,
      weight: 2.2,
      tracking_id: null,
      reseller_name: 'Bangalore Electronics',
      reseller_mobile: '+91-7654321099'
    },
    {
      mobile: '+91-6543210987',
      courier_service: 'FedEx',
      pincode: '600001',
      name: 'Lakshmi Iyer',
      address: '321 T. Nagar, Chennai',
      city: 'Chennai',
      state: 'Tamil Nadu',
      country: 'India',
      pickup_location: 'VIJAYA8 FRANCHISE',
      is_cod: false,
      cod_amount: null,
      package_value: 4500.00,
      reference_number: 'REF003',
      total_items: 1,
      weight: 0.5,
      tracking_id: 'FX456789123',
      reseller_name: null,
      reseller_mobile: null
    },
    {
      mobile: '+91-5432109876',
      courier_service: 'Delhivery New',
      pincode: '700001',
      name: 'Sourav Ganguly',
      address: '654 Park Street, Kolkata',
      city: 'Kolkata',
      state: 'West Bengal',
      country: 'India',
      pickup_location: 'VIJAYA8 FRANCHISE',
      is_cod: true,
      cod_amount: 1200.25,
      package_value: 1200.25,
      reference_number: null,
      total_items: 4,
      weight: 3.1,
      tracking_id: 'DL789123456',
      reseller_name: 'Kolkata Mart',
      reseller_mobile: '+91-5432109877'
    },
    {
      mobile: '+91-4321098765',
      courier_service: 'DHL',
      pincode: '380001',
      name: 'Ravi Patel',
      address: '987 CG Road, Ahmedabad',
      city: 'Ahmedabad',
      state: 'Gujarat',
      country: 'India',
      pickup_location: 'VIJAYA8 FRANCHISE',
      is_cod: false,
      cod_amount: null,
      package_value: 6750.50,
      reference_number: 'REF004',
      total_items: 2,
      weight: 1.8,
      tracking_id: 'DH321654987',
      reseller_name: null,
      reseller_mobile: null
    },
    {
      mobile: '+91-3210987654',
      courier_service: 'Amazon Logistics',
      pincode: '500001',
      name: 'Deepika Reddy',
      address: '147 Banjara Hills, Hyderabad',
      city: 'Hyderabad',
      state: 'Telangana',
      country: 'India',
      pickup_location: 'VIJAYA8 FRANCHISE',
      is_cod: true,
      package_value: 890.75,
      reference_number: 'REF005',
      total_items: 1,
      weight: 0.3,
      tracking_id: null,
      reseller_name: 'Hyderabad Tech',
      reseller_mobile: '+91-3210987655'
    },
    {
      mobile: '+91-2109876543',
      courier_service: 'Blue Dart',
      pincode: '411001',
      name: 'Vikram Singh',
      address: '258 MG Road, Pune',
      city: 'Pune',
      state: 'Maharashtra',
      country: 'India',
      pickup_location: 'VIJAYA8 FRANCHISE',
      is_cod: false,
      package_value: 5200.00,
      reference_number: null,
      total_items: 3,
      weight: 2.7,
      tracking_id: 'BD654321098',
      reseller_name: null,
      reseller_mobile: null
    }
  ]

  // First, create a default client
  const defaultClient = await prisma.clients.create({
    data: {
      id: 'default-client-001',
      name: 'Default Client',
      companyName: 'Default Company',
      email: 'default@scan2ship.com',
      phone: '+91-9876543210',
      address: '123 Default Street, Default City',
      city: 'Default City',
      state: 'Default State',
      country: 'India',
      pincode: '123456',
      updatedAt: new Date()
    }
  })
  console.log(`✅ Created default client: ${defaultClient.name}`)

  for (const order of sampleOrders) {
    await prisma.order.create({
      data: {
        ...order,
        clientId: defaultClient.id
      }
    })
    console.log(`✅ Created order for ${order.name}`)
  }

  console.log(`🎉 Successfully seeded ${sampleOrders.length} orders!`)
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
