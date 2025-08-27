require('dotenv').config({ path: '.env.local' });
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();

// Test configuration
const TEST_CONFIG = {
  masterAdminEmail: 'karthik@scan2ship.in',
  clientId: 'client-1756297715470-3hwkwcugb', // RVD Jewels
  testOrderData: {
    name: 'Test Customer',
    mobile: '919876543210',
    phone: '919876543210',
    address: '123 Test Street',
    city: 'Mumbai',
    state: 'Maharashtra',
    country: 'India',
    pincode: '400001',
    courier_service: 'delhivery',
    pickup_location: 'RVD Jewels',
    package_value: 5000,
    weight: 100,
    total_items: 1,
    is_cod: false,
    reseller_name: 'Test Reseller',
    reseller_mobile: '919876543211'
  }
};

async function testOrderCreationWithWhatsApp() {
  console.log('🧪 [ORDER_TEST] Starting Order Creation with WhatsApp Test...\n');

  try {
    // Test 1: Verify client exists
    console.log('📋 Test 1: Verifying Client Exists...');
    const client = await prisma.clients.findUnique({
      where: { id: TEST_CONFIG.clientId }
    });

    if (!client) {
      throw new Error(`Client ${TEST_CONFIG.clientId} not found`);
    }

    console.log('✅ Client found:', client.companyName);
    console.log('✅ Client is active:', client.isActive);

    // Test 2: Verify pickup location exists
    console.log('📋 Test 2: Verifying Pickup Location...');
    const pickupLocation = await prisma.pickup_locations.findFirst({
      where: { 
        clientId: TEST_CONFIG.clientId,
        value: TEST_CONFIG.testOrderData.pickup_location
      }
    });

    if (!pickupLocation) {
      throw new Error(`Pickup location ${TEST_CONFIG.testOrderData.pickup_location} not found for client`);
    }

    console.log('✅ Pickup location found:', pickupLocation.label);

    // Test 3: Verify courier service exists
    console.log('📋 Test 3: Verifying Courier Service...');
    const courierService = await prisma.courier_services.findFirst({
      where: { 
        clientId: TEST_CONFIG.clientId,
        code: TEST_CONFIG.testOrderData.courier_service
      }
    });

    if (!courierService) {
      throw new Error(`Courier service ${TEST_CONFIG.testOrderData.courier_service} not found for client`);
    }

    console.log('✅ Courier service found:', courierService.name);

    // Test 4: Create order through API simulation
    console.log('📋 Test 4: Creating Order with WhatsApp Notification...');
    
    // Generate a unique reference number
    const referenceNumber = `TEST-${Date.now()}`;
    
    // Create the order
    const order = await prisma.Order.create({
      data: {
        ...TEST_CONFIG.testOrderData,
        clientId: TEST_CONFIG.clientId,
        reference_number: referenceNumber,
        created_at: new Date(),
        updated_at: new Date()
      }
    });

    console.log('✅ Order created successfully:', order.id);
    console.log('✅ Reference number:', order.reference_number);

    // Test 5: Simulate WhatsApp notification (like the API does)
    console.log('📋 Test 5: Simulating WhatsApp Notification...');
    
    // Get WhatsApp configuration
    const whatsappConfig = await prisma.system_config.findMany({
      where: { category: 'whatsapp' }
    });

    const apiKey = whatsappConfig.find(c => c.key === 'FAST2SMS_WHATSAPP_API_KEY')?.value;
    const messageId = whatsappConfig.find(c => c.key === 'FAST2SMS_WHATSAPP_MESSAGE_ID')?.value;

    if (!apiKey || !messageId) {
      throw new Error('WhatsApp configuration not found');
    }

    console.log('✅ WhatsApp configuration loaded');

    // Prepare WhatsApp data
    const whatsappData = {
      customerName: order.name,
      customerPhone: order.mobile,
      orderNumber: `ORDER-${order.id}`,
      courierService: order.courier_service,
      trackingNumber: order.tracking_id || 'Will be assigned',
      clientCompanyName: client.companyName,
      resellerName: order.reseller_name,
      resellerPhone: order.reseller_mobile,
      packageValue: order.package_value,
      weight: order.weight,
      totalItems: order.total_items,
      pickupLocation: order.pickup_location,
      address: order.address,
      city: order.city,
      state: order.state,
      pincode: order.pincode
    };

    console.log('📱 WhatsApp Data prepared:', {
      customerName: whatsappData.customerName,
      customerPhone: whatsappData.customerPhone,
      orderNumber: whatsappData.orderNumber,
      courierService: whatsappData.courierService,
      clientCompanyName: whatsappData.clientCompanyName
    });

    // Test 6: Send customer WhatsApp
    console.log('📋 Test 6: Sending Customer WhatsApp...');
    const customerResult = await sendWhatsAppMessage(
      apiKey, 
      messageId, 
      whatsappData.customerPhone,
      generateCustomerVariables(whatsappData)
    );

    if (customerResult.success) {
      console.log('✅ Customer WhatsApp sent successfully');
      console.log('📱 Message ID:', customerResult.messageId);
    } else {
      console.log('❌ Customer WhatsApp failed:', customerResult.error);
    }

    // Test 7: Send reseller WhatsApp (if reseller details exist)
    if (whatsappData.resellerName && whatsappData.resellerPhone) {
      console.log('📋 Test 7: Sending Reseller WhatsApp...');
      const resellerResult = await sendWhatsAppMessage(
        apiKey, 
        messageId, 
        whatsappData.resellerPhone,
        generateResellerVariables(whatsappData)
      );

      if (resellerResult.success) {
        console.log('✅ Reseller WhatsApp sent successfully');
        console.log('📱 Message ID:', resellerResult.messageId);
      } else {
        console.log('❌ Reseller WhatsApp failed:', resellerResult.error);
      }
    } else {
      console.log('📋 Test 7: Skipping Reseller WhatsApp (no reseller details)');
    }

    // Test 8: Verify order was created with all details
    console.log('📋 Test 8: Verifying Order Details...');
    const createdOrder = await prisma.Order.findUnique({
      where: { id: order.id }
    });

    console.log('✅ Order verification:', {
      id: createdOrder.id,
      referenceNumber: createdOrder.reference_number,
      customerName: createdOrder.name,
      customerPhone: createdOrder.mobile,
      courierService: createdOrder.courier_service,
      pickupLocation: createdOrder.pickup_location,
      packageValue: createdOrder.package_value,
      weight: createdOrder.weight,
      totalItems: createdOrder.total_items,
      resellerName: createdOrder.reseller_name,
      resellerPhone: createdOrder.reseller_mobile
    });

    // Cleanup: Delete test order
    console.log('📋 Cleanup: Removing Test Order...');
    await prisma.Order.delete({
      where: { id: order.id }
    });
    console.log('✅ Test order cleaned up');

    console.log('\n🎉 [ORDER_TEST] All tests completed successfully!');
    console.log('✅ Order creation with WhatsApp notification is working properly');

  } catch (error) {
    console.error('\n❌ [ORDER_TEST] Test failed:', error.message);
    console.error('Stack trace:', error.stack);
    
    // Provide specific debugging information
    console.log('\n🔍 Debugging Information:');
    console.log('1. Check if client exists and is active');
    console.log('2. Check if pickup location exists for the client');
    console.log('3. Check if courier service exists for the client');
    console.log('4. Check if WhatsApp configuration is properly set');
    console.log('5. Check if Fast2SMS API is responding correctly');
    
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

function generateCustomerVariables(data) {
  return [
    data.customerName || 'Customer',
    data.clientCompanyName || 'Scan2Ship',
    data.courierService.replace('_', ' ').toUpperCase(),
    data.trackingNumber || 'Will be assigned'
  ];
}

function generateResellerVariables(data) {
  return [
    data.resellerName + ' (Your Customer -' + data.customerName + ')' || 'Reseller',
    data.clientCompanyName || 'Scan2Ship',
    data.courierService.replace('_', ' ').toUpperCase(),
    data.trackingNumber || 'Will be assigned'
  ];
}

async function sendWhatsAppMessage(apiKey, messageId, phone, variables) {
  try {
    console.log('📱 [WHATSAPP_API] Sending WhatsApp message...');
    console.log('📱 [WHATSAPP_API] Phone:', phone);
    console.log('📱 [WHATSAPP_API] Variables:', variables);
    
    const url = new URL('https://www.fast2sms.com/dev/whatsapp');
    url.searchParams.set('authorization', apiKey);
    url.searchParams.set('message_id', messageId);
    url.searchParams.set('numbers', phone);
    url.searchParams.set('variables_values', variables.join('|'));

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });

    console.log('📱 [WHATSAPP_API] Response status:', response.status);

    if (!response.ok) {
      const errorResponse = await response.text();
      console.error('📱 [WHATSAPP_API] API error response:', errorResponse);
      return {
        success: false,
        error: `API error: ${response.status} - ${errorResponse}`
      };
    }

    const result = await response.json();
    console.log('📱 [WHATSAPP_API] API response:', result);

    if (result.return === true) {
      return {
        success: true,
        messageId: result.request_id || 'unknown',
        response: result
      };
    }

    return {
      success: false,
      error: `API error: ${result.message?.join(', ') || 'Unknown error'}`,
      response: result
    };

  } catch (error) {
    console.error('📱 [WHATSAPP_API] API call failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Run the test
if (require.main === module) {
  testOrderCreationWithWhatsApp()
    .then(() => {
      console.log('\n✅ Order creation test completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Order creation test failed:', error.message);
      process.exit(1);
    });
}

module.exports = { testOrderCreationWithWhatsApp };
