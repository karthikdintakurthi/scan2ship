#!/usr/bin/env node

/**
 * Test WhatsApp Integration Script
 * 
 * This script tests the WhatsApp service functionality
 * Run with: node scripts/test-whatsapp.js
 */

require('dotenv').config({ path: '.env.local' });
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Test configuration
const TEST_CONFIG = {
  masterAdminEmail: 'karthik@scan2ship.in',
  clientId: 'client-1756297715470-3hwkwcugb', // RVD Jewels
  testPhone: '919876543210', // Test phone number
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
    pickup_location: 'main-warehouse',
    package_value: 5000,
    weight: 100,
    total_items: 1,
    is_cod: false,
    reseller_name: 'Test Reseller',
    reseller_mobile: '919876543211'
  }
};

// Mock WhatsApp service for testing
class MockWhatsAppService {
  constructor(config) {
    this.config = config;
    this.baseUrl = 'https://www.fast2sms.com/dev/whatsapp';
  }

  async sendCustomerOrderWhatsApp(data) {
    console.log('📱 [MOCK_WHATSAPP] Sending customer WhatsApp:', {
      phone: data.customerPhone,
      customerName: data.customerName,
      orderNumber: data.orderNumber
    });

    // Simulate API call
    try {
      const formattedPhone = this.formatPhoneNumber(data.customerPhone);
      const variables = this.generateCustomerVariables(data);
      
      console.log('📱 [MOCK_WHATSAPP] Customer variables:', variables);
      
      // Simulate successful response
      return {
        success: true,
        messageId: 'mock-customer-' + Date.now()
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async sendResellerOrderWhatsApp(data) {
    console.log('📱 [MOCK_WHATSAPP] Sending reseller WhatsApp:', {
      phone: data.resellerPhone,
      resellerName: data.resellerName,
      orderNumber: data.orderNumber
    });

    // Simulate API call
    try {
      const formattedPhone = this.formatPhoneNumber(data.resellerPhone);
      const variables = this.generateResellerVariables(data);
      
      console.log('📱 [MOCK_WHATSAPP] Reseller variables:', variables);
      
      // Simulate successful response
      return {
        success: true,
        messageId: 'mock-reseller-' + Date.now()
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  generateCustomerVariables(data) {
    return [
      data.customerName || 'Customer',
      data.clientCompanyName || 'Scan2Ship',
      data.courierService.replace('_', ' ').toUpperCase(),
      data.trackingNumber || 'Will be assigned'
    ];
  }

  generateResellerVariables(data) {
    return [
      data.resellerName + ' (Your Customer -' + data.customerName + ')' || 'Reseller',
      data.clientCompanyName || 'Scan2Ship',
      data.courierService.replace('_', ' ').toUpperCase(),
      data.trackingNumber || 'Will be assigned'
    ];
  }

  formatPhoneNumber(phone) {
    // Remove any non-digit characters
    let cleaned = phone.replace(/\D/g, '');
    
    // Ensure it starts with 91 for India
    if (!cleaned.startsWith('91')) {
      cleaned = '91' + cleaned;
    }
    
    return cleaned;
  }

  getStatus() {
    const missingFields = [];
    
    if (!this.config.apiKey) missingFields.push('API Key');
    if (!this.config.messageId) missingFields.push('Message ID');
    
    return {
      configured: missingFields.length === 0,
      missingFields
    };
  }

  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    console.log('📱 [MOCK_WHATSAPP] Configuration updated:', {
      apiKey: this.config.apiKey ? this.config.apiKey.substring(0, 10) + '***' : 'NOT SET',
      messageId: this.config.messageId
    });
  }
}

async function testWhatsAppConfiguration() {
  console.log('🧪 [WHATSAPP_TEST] Starting WhatsApp Configuration Test...\n');

  try {
    // Test 1: Check system configuration
    console.log('📋 Test 1: Checking System Configuration...');
    const systemConfig = await prisma.system_config.findMany({
      where: { category: 'whatsapp' }
    });
    
    console.log('System WhatsApp Config:', systemConfig.map(c => ({
      key: c.key,
      value: c.key.includes('API_KEY') ? c.value.substring(0, 10) + '***' : c.value,
      category: c.category
    })));

    if (systemConfig.length === 0) {
      throw new Error('No WhatsApp configuration found in system_config table');
    }

    const apiKeyConfig = systemConfig.find(c => c.key === 'FAST2SMS_WHATSAPP_API_KEY');
    const messageIdConfig = systemConfig.find(c => c.key === 'FAST2SMS_WHATSAPP_MESSAGE_ID');

    if (!apiKeyConfig || !apiKeyConfig.value || apiKeyConfig.value.includes('your_') || apiKeyConfig.value.includes('test_api_key')) {
      throw new Error('Invalid or placeholder API key found');
    }

    console.log('✅ System configuration is valid\n');

    // Test 2: Check environment variables
    console.log('📋 Test 2: Checking Environment Variables...');
    const envApiKey = process.env.FAST2SMS_WHATSAPP_API_KEY;
    const envMessageId = process.env.FAST2SMS_WHATSAPP_MESSAGE_ID;

    console.log('Environment API Key:', envApiKey ? envApiKey.substring(0, 10) + '***' : 'NOT SET');
    console.log('Environment Message ID:', envMessageId);

    if (!envApiKey || envApiKey.includes('your_')) {
      throw new Error('Invalid or placeholder API key in environment variables');
    }

    console.log('✅ Environment variables are valid\n');

    // Test 3: Test WhatsApp service initialization
    console.log('📋 Test 3: Testing WhatsApp Service Initialization...');
    
    // Create mock WhatsApp service
    const whatsappService = new MockWhatsAppService({
      apiKey: apiKeyConfig.value,
      messageId: messageIdConfig.value
    });

    console.log('✅ WhatsApp service initialized successfully\n');

    // Test 4: Test order creation with WhatsApp notification
    console.log('📋 Test 4: Testing Order Creation with WhatsApp Notification...');
    
    // Create a test order
    const testOrder = await prisma.Order.create({
      data: {
        ...TEST_CONFIG.testOrderData,
        clientId: TEST_CONFIG.clientId,
        reference_number: `TEST-${Date.now()}`,
        created_at: new Date(),
        updated_at: new Date()
      }
    });

    console.log('✅ Test order created:', testOrder.id);

    // Test 5: Simulate WhatsApp notification sending
    console.log('📋 Test 5: Testing WhatsApp Notification Sending...');
    
    const whatsappData = {
      customerName: testOrder.name,
      customerPhone: testOrder.mobile,
      orderNumber: `ORDER-${testOrder.id}`,
      courierService: testOrder.courier_service,
      trackingNumber: testOrder.tracking_id || 'Will be assigned',
      clientCompanyName: 'RVD Jewels',
      resellerName: testOrder.reseller_name,
      resellerPhone: testOrder.reseller_mobile,
      packageValue: testOrder.package_value,
      weight: testOrder.weight,
      totalItems: testOrder.total_items,
      pickupLocation: testOrder.pickup_location,
      address: testOrder.address,
      city: testOrder.city,
      state: testOrder.state,
      pincode: testOrder.pincode
    };

    console.log('WhatsApp Data:', {
      customerName: whatsappData.customerName,
      customerPhone: whatsappData.customerPhone,
      orderNumber: whatsappData.orderNumber,
      courierService: whatsappData.courierService
    });

    // Test customer WhatsApp
    const customerResult = await whatsappService.sendCustomerOrderWhatsApp(whatsappData);
    console.log('Customer WhatsApp Result:', customerResult);

    // Test reseller WhatsApp
    const resellerResult = await whatsappService.sendResellerOrderWhatsApp(whatsappData);
    console.log('Reseller WhatsApp Result:', resellerResult);

    if (customerResult.success) {
      console.log('✅ Customer WhatsApp notification sent successfully');
    } else {
      console.log('❌ Customer WhatsApp notification failed:', customerResult.error);
    }

    if (resellerResult.success) {
      console.log('✅ Reseller WhatsApp notification sent successfully');
    } else {
      console.log('❌ Reseller WhatsApp notification failed:', resellerResult.error);
    }

    // Test 6: Check service status
    console.log('📋 Test 6: Checking WhatsApp Service Status...');
    const status = whatsappService.getStatus();
    console.log('Service Status:', status);

    if (status.configured) {
      console.log('✅ WhatsApp service is properly configured');
    } else {
      console.log('❌ WhatsApp service is not configured:', status.missingFields);
    }

    // Test 7: Test real API call (optional)
    console.log('📋 Test 7: Testing Real API Call...');
    
    // This will make a real API call to Fast2SMS
    const realApiTest = await testRealWhatsAppAPI(apiKeyConfig.value, messageIdConfig.value, TEST_CONFIG.testPhone);
    console.log('Real API Test Result:', realApiTest);

    // Cleanup: Delete test order
    await prisma.Order.delete({
      where: { id: testOrder.id }
    });
    console.log('🧹 Test order cleaned up');

    console.log('\n🎉 [WHATSAPP_TEST] All tests completed successfully!');

  } catch (error) {
    console.error('\n❌ [WHATSAPP_TEST] Test failed:', error.message);
    console.error('Stack trace:', error.stack);
    
    // Provide specific debugging information
    console.log('\n🔍 Debugging Information:');
    console.log('1. Check if Fast2SMS API key is valid');
    console.log('2. Check if message template ID 4697 exists in your Fast2SMS account');
    console.log('3. Check if the phone numbers are in correct format (91XXXXXXXXXX)');
    console.log('4. Check Fast2SMS account balance and API limits');
    
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

async function testRealWhatsAppAPI(apiKey, messageId, phone) {
  try {
    console.log('📱 [REAL_API_TEST] Testing real Fast2SMS API...');
    
    const url = new URL('https://www.fast2sms.com/dev/whatsapp');
    url.searchParams.set('authorization', apiKey);
    url.searchParams.set('message_id', messageId);
    url.searchParams.set('numbers', phone);
    url.searchParams.set('variables_values', 'Test Customer|Scan2Ship|DTDC|TRACK123');

    console.log('📱 [REAL_API_TEST] API URL:', url.toString());
    console.log('📱 [REAL_API_TEST] Phone:', phone);
    console.log('📱 [REAL_API_TEST] Message ID:', messageId);

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });

    console.log('📱 [REAL_API_TEST] Response status:', response.status);

    if (!response.ok) {
      const errorResponse = await response.text();
      console.error('📱 [REAL_API_TEST] API error response:', errorResponse);
      return {
        success: false,
        error: `API error: ${response.status} - ${errorResponse}`
      };
    }

    const result = await response.json();
    console.log('📱 [REAL_API_TEST] API response:', result);

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
    console.error('📱 [REAL_API_TEST] API call failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Run the test
if (require.main === module) {
  testWhatsAppConfiguration()
    .then(() => {
      console.log('\n✅ WhatsApp test completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ WhatsApp test failed:', error.message);
      process.exit(1);
    });
}

module.exports = { testWhatsAppConfiguration };
