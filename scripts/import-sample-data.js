const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Sample data adapted for the new schema
const sampleOrders = [
  {
    name: "John Doe",
    mobile: "9876543210",
    phone: "9876543210",
    address: "123 Main Street, Apartment 4B",
    city: "Mumbai",
    state: "Maharashtra",
    country: "India",
    pincode: "400001",
    courier_service: "Delhivery",
    pickup_location: "Mumbai Central",
    package_value: 1500.00,
    weight: 500.0,
    total_items: 2,
    tracking_id: "DLV123456789",
    reference_number: "REF001",
    is_cod: false,
    cod_amount: null,
    reseller_name: "Sample Reseller",
    reseller_mobile: "9876543211",
    product_description: "Electronics and accessories",
    seller_name: "Sample Seller",
    seller_address: "456 Seller Street, Mumbai",
    seller_gst: "GST123456789",
    invoice_number: "INV001",
    commodity_value: 1500.00,
    category_of_goods: "Electronics"
  },
  {
    name: "Jane Smith",
    mobile: "8765432109",
    phone: "8765432109",
    address: "456 Oak Avenue, Floor 2",
    city: "Delhi",
    state: "Delhi",
    country: "India",
    pincode: "110001",
    courier_service: "Delhivery",
    pickup_location: "Delhi Central",
    package_value: 2500.00,
    weight: 750.0,
    total_items: 3,
    tracking_id: "DLV987654321",
    reference_number: "REF002",
    is_cod: true,
    cod_amount: 2500.00,
    reseller_name: "Another Reseller",
    reseller_mobile: "8765432108",
    product_description: "Fashion items and accessories",
    seller_name: "Fashion Seller",
    seller_address: "789 Fashion Street, Delhi",
    seller_gst: "GST987654321",
    invoice_number: "INV002",
    commodity_value: 2500.00,
    category_of_goods: "Fashion"
  },
  {
    name: "Bob Johnson",
    mobile: "7654321098",
    phone: "7654321098",
    address: "789 Pine Road, House 15",
    city: "Bangalore",
    state: "Karnataka",
    country: "India",
    pincode: "560001",
    courier_service: "Delhivery",
    pickup_location: "Bangalore Central",
    package_value: 800.00,
    weight: 300.0,
    total_items: 1,
    tracking_id: "DLV456789123",
    reference_number: "REF003",
    is_cod: false,
    cod_amount: null,
    reseller_name: "Tech Reseller",
    reseller_mobile: "7654321097",
    product_description: "Mobile phone accessories",
    seller_name: "Tech Seller",
    seller_address: "321 Tech Street, Bangalore",
    seller_gst: "GST456789123",
    invoice_number: "INV003",
    commodity_value: 800.00,
    category_of_goods: "Electronics"
  }
];

async function importSampleData() {
  try {
    console.log('Starting to import sample data...');
    
    // Clear existing data
    await prisma.order.deleteMany({});
    console.log('Cleared existing orders');
    
    // Import sample orders
    for (const orderData of sampleOrders) {
      const order = await prisma.order.create({
        data: orderData
      });
      console.log(`Created order for ${order.name} with ID: ${order.id}`);
    }
    
    console.log('Sample data import completed successfully!');
    
    // Display summary
    const totalOrders = await prisma.order.count();
    console.log(`Total orders in database: ${totalOrders}`);
    
  } catch (error) {
    console.error('Error importing sample data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

importSampleData();
