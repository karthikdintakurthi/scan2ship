interface WhatsAppConfig {
  apiKey: string;
  messageId: string;
}

interface OrderWhatsAppData {
  customerName: string;
  customerPhone: string;
  orderNumber: string;
  courierService: string;
  trackingNumber: string;
  clientCompanyName?: string;
  resellerName?: string;
  resellerPhone?: string;
  packageValue: number;
  weight: number;
  totalItems: number;
  pickupLocation: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
}

interface WhatsAppResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}

class WhatsAppService {
  private config: WhatsAppConfig;
  private baseUrl: string;

  constructor(config: WhatsAppConfig) {
    this.config = config;
    this.baseUrl = 'https://www.fast2sms.com/dev/whatsapp';
  }

  /**
   * Send WhatsApp message using Fast2SMS API with template variables
   */
  private async sendWhatsAppMessage(phone: string, variables: string[]): Promise<WhatsAppResponse> {
    try {
      // Validate configuration
      if (!this.config.apiKey) {
        throw new Error('Fast2SMS WhatsApp API key not configured');
      }
      if (!this.config.messageId) {
        throw new Error('Fast2SMS WhatsApp message ID not configured');
      }

      const formattedPhone = this.formatPhoneNumber(phone);
      const variablesValues = variables.join('|');

      console.log('📱 [WHATSAPP_SERVICE] Sending WhatsApp message:', {
        phone: formattedPhone,
        messageId: this.config.messageId,
        variables,
        variablesValues
      });

      const url = new URL(this.baseUrl);
      url.searchParams.set('authorization', this.config.apiKey);
      url.searchParams.set('message_id', this.config.messageId);
      url.searchParams.set('numbers', formattedPhone);
      url.searchParams.set('variables_values', variablesValues);

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      console.log('📱 [WHATSAPP_SERVICE] Fast2SMS API response status:', response.status);

      if (!response.ok) {
        const errorResponse = await response.text();
        console.error('📱 [WHATSAPP_SERVICE] Fast2SMS API error response:', errorResponse);
        throw new Error(`WhatsApp API error: ${response.status} - ${errorResponse}`);
      }

      const result = await response.json();
      console.log('📱 [WHATSAPP_SERVICE] Fast2SMS API response:', result);

      if (result.return === true) {
        console.log('✅ [WHATSAPP_SERVICE] WhatsApp message sent successfully');
        return {
          success: true,
          messageId: result.request_id || 'unknown'
        };
      }

      throw new Error(`WhatsApp API error: ${result.message?.join(', ') || 'Unknown error'}`);

    } catch (error) {
      console.error('❌ [WHATSAPP_SERVICE] WhatsApp message failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Format phone number for Fast2SMS API
   */
  private formatPhoneNumber(phone: string): string {
    const digits = phone.replace(/\D/g, '');
    
    // Remove +91 prefix if present (12 digits)
    if (digits.startsWith('91') && digits.length === 12) {
      return digits.substring(2);
    }
    
    // Add 91 prefix if not present (10 digits)
    if (!digits.startsWith('91') && digits.length === 10) {
      return '91' + digits;
    }
    
    return digits;
  }

  /**
   * Send order confirmation WhatsApp message to customer
   */
  async sendCustomerOrderWhatsApp(data: OrderWhatsAppData): Promise<WhatsAppResponse> {
    try {
      const variables = this.generateCustomerVariables(data);
      console.log('📱 [WHATSAPP_SERVICE] Sending customer WhatsApp message for order:', data.orderNumber);
      
      const result = await this.sendWhatsAppMessage(data.customerPhone, variables);
      
      if (result.success) {
        console.log('✅ [WHATSAPP_SERVICE] Customer WhatsApp message sent successfully:', {
          orderNumber: data.orderNumber,
          messageId: result.messageId
        });
      }
      
      return result;
    } catch (error) {
      console.error('❌ [WHATSAPP_SERVICE] Customer WhatsApp message failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Send order confirmation WhatsApp message to reseller
   */
  async sendResellerOrderWhatsApp(data: OrderWhatsAppData): Promise<WhatsAppResponse> {
    if (!data.resellerPhone) {
      console.log('📱 [WHATSAPP_SERVICE] No reseller phone number, skipping reseller WhatsApp');
      return { success: true };
    }

    try {
      const variables = this.generateResellerVariables(data);
      console.log('📱 [WHATSAPP_SERVICE] Sending reseller WhatsApp message for order:', data.orderNumber);
      
      const result = await this.sendWhatsAppMessage(data.resellerPhone, variables);
      
      if (result.success) {
        console.log('✅ [WHATSAPP_SERVICE] Reseller WhatsApp message sent successfully:', {
          orderNumber: data.orderNumber,
          messageId: result.messageId
        });
      }
      
      return result;
    } catch (error) {
      console.error('❌ [WHATSAPP_SERVICE] Reseller WhatsApp message failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Send test WhatsApp message
   */
  async sendTestWhatsApp(phone: string, variables: string[]): Promise<WhatsAppResponse> {
    try {
      console.log('📱 [WHATSAPP_SERVICE] Sending test WhatsApp message...');
      
      const result = await this.sendWhatsAppMessage(phone, variables);
      
      if (result.success) {
        console.log('✅ [WHATSAPP_SERVICE] Test WhatsApp message sent successfully');
      }
      
      return result;
    } catch (error) {
      console.error('❌ [WHATSAPP_SERVICE] Test WhatsApp message failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Generate customer WhatsApp variables
   */
  private generateCustomerVariables(data: OrderWhatsAppData): string[] {
    return [
      data.customerName,
      data.resellerName ? data.resellerName : data.clientCompanyName || 'Scan2Ship',
      data.courierService.replace('_', ' ').toUpperCase(),
      data.trackingNumber || 'Will be assigned'
    ];
  }

  /**
   * Generate reseller WhatsApp variables
   */
  private generateResellerVariables(data: OrderWhatsAppData): string[] {
    return [
      data.resellerName + ' (Your Customer -' + data.customerName + ')' || 'Reseller',
      data.clientCompanyName || 'Scan2Ship',
      data.courierService.replace('_', ' ').toUpperCase(),
      data.trackingNumber || 'Will be assigned'
    ];
  }

  /**
   * Update WhatsApp service configuration
   */
  updateConfig(newConfig: Partial<WhatsAppConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('📱 [WHATSAPP_SERVICE] Configuration updated:', this.config);
  }

  /**
   * Check if WhatsApp service is configured
   */
  getStatus(): { configured: boolean; missingFields: string[] } {
    const missingFields = [];
    
    if (!this.config.apiKey) missingFields.push('API Key');
    if (!this.config.messageId) missingFields.push('Message ID');
    
    return {
      configured: missingFields.length === 0,
      missingFields
    };
  }
}

// Helper function to load WhatsApp configuration from database (server-side)
async function loadWhatsAppConfigFromDB(): Promise<WhatsAppConfig> {
  try {
    // Only run on server side
    if (typeof window !== 'undefined') {
      return {
        apiKey: process.env.FAST2SMS_API_KEY || '',
        messageId: '4697'
      };
    }

    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();

    try {
      const whatsappConfig = await prisma.system_config.findMany({
        where: { category: 'whatsapp' }
      });

      const config: WhatsAppConfig = {
        apiKey: process.env.FAST2SMS_API_KEY || '',
        messageId: '4697'
      };

      for (const item of whatsappConfig) {
        if (item.key === 'FAST2SMS_API_KEY') {
          config.apiKey = item.value || process.env.FAST2SMS_API_KEY || '';
        } else if (item.key === 'FAST2SMS_WHATSAPP_MESSAGE_ID') {
          config.messageId = item.value;
        }
      }

      return config;
    } finally {
      await prisma.$disconnect();
    }
  } catch (error) {
    console.error('❌ Error loading WhatsApp config from DB:', error);
    return {
      apiKey: '',
      messageId: '4697'
    };
  }
}

// Create and export default instance
const whatsappService = new WhatsAppService({
  apiKey: process.env.FAST2SMS_API_KEY || '',
  messageId: process.env.FAST2SMS_WHATSAPP_MESSAGE_ID || '4697'
});

// Function to initialize WhatsApp service with database config
export async function initializeWhatsAppService(): Promise<void> {
  try {
    const config = await loadWhatsAppConfigFromDB();
    whatsappService.updateConfig(config);
    console.log('📱 [WHATSAPP_SERVICE] Initialized with database configuration');
  } catch (error) {
    console.error('❌ [WHATSAPP_SERVICE] Failed to initialize with database config:', error);
  }
}

export default whatsappService;
export type { OrderWhatsAppData, WhatsAppConfig };
