interface DelhiveryCreateOrderRequest {
  waybill?: string; // Can be empty/null when creating new order
  order: string; // Reference number
  pickup_location: string; // Vendor pickup location
  consignee: {
    name: string; // Customer name
    address: string; // Complete delivery address
    city: string;
    state: string;
    country: string;
    pincode: string;
    phone: string; // Customer mobile number
  };
  payment_mode: string; // "prepaid" or "cod" (lowercase as expected by Delhivery API)
  cod_amount?: number; // Required if payment mode is COD
  package_details: {
    weight: number; // Shipment weight
    length: number; // Shipment length
    breadth: number; // Shipment breadth
    height: number; // Shipment height
    package_value: number; // Package amount
    commodity_value?: number; // Commodity value
    tax_value?: number; // Tax value
    category_of_goods?: string; // Category of goods
  };
  product_description?: string; // Product to be shipped
  return_address?: string; // Return pickup location
  return_pincode?: string; // Return pin
  fragile_shipment?: boolean; // True/false
  seller_details?: {
    name?: string; // Seller name
    address?: string; // Seller address
    gst?: string; // Seller GST
    invoice_number?: string; // Invoice number
  };
  quantity?: number; // Quantity
  reference_number?: string; // Your own order reference
  tracking_id?: string; // Tracking ID
}

interface DelhiveryCreateOrderResponse {
  success: boolean;
  waybill_number: string;
  order_id: string;
  message?: string;
  error?: string;
}

export class DelhiveryService {
  private baseUrl: string;
  private maxRetries: number;

  constructor() {
    this.baseUrl = process.env.DELHIVERY_BASE_URL || 'https://track.delhivery.com'
    this.maxRetries = 3
    
    // Debug logging
    console.log('🔑 Delhivery Service Initialized:')
    console.log('  Base URL:', this.baseUrl)
    console.log('  Note: API Key will be taken from pickup location configuration')
  }

  private async makeRequest(endpoint: string, options: RequestInit, apiKey: string, retryCount = 0): Promise<any> {
    try {
      // Ensure the correct header format for Delhivery API
      const finalHeaders = {
        'Authorization': `Token ${apiKey.trim()}`,
        'Accept': 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
        ...options.headers,
      };
      
      // Validate API key format
      if (!apiKey || typeof apiKey !== 'string') {
        throw new Error('Invalid API key: API key is required and must be a string');
      }
      
      // Trim the API key and check if it's empty
      const trimmedApiKey = apiKey.trim();
      if (!trimmedApiKey) {
        throw new Error('Invalid API key: API key is empty after trimming');
      }
      
      // Check for invalid characters in API key
      const invalidChars = trimmedApiKey.match(/[^\x20-\x7E]/);
      if (invalidChars) {
        throw new Error(`Invalid API key: Contains invalid characters at position ${invalidChars.index}`);
      }
      
      const fullUrl = `${this.baseUrl}${endpoint}`;
      
      console.log('🌐 Delhivery API Request Details:');
      console.log('  Full URL:', fullUrl);
      console.log('  Method:', options.method || 'GET');
      console.log('  Raw API Key:', apiKey);
      console.log('  Clean API Key:', trimmedApiKey);
      console.log('  Final Headers:', JSON.stringify(finalHeaders, null, 2));
      console.log('  Request Body:', options.body || 'No body');
      console.log('  Retry Count:', retryCount);
      
      const response = await fetch(fullUrl, {
        ...options,
        headers: finalHeaders,
      });

      console.log('📡 Delhivery API Response Details:');
      console.log('  Status:', response.status);
      console.log('  Status Text:', response.statusText);
      console.log('  Response Headers:', JSON.stringify(Object.fromEntries(response.headers.entries()), null, 2));

      if (!response.ok) {
        const errorText = await response.text();
        console.log('  Error Response Body:', errorText);
        throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
      }

      const result = await response.json();
      console.log('  Response Body:', JSON.stringify(result, null, 2));
      return result;
    } catch (error) {
      console.error('❌ Delhivery API request failed:', error);
      if (retryCount < this.maxRetries) {
        console.log(`🔄 Retrying Delhivery API request... (${retryCount + 1}/${this.maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1))); // Exponential backoff
        return this.makeRequest(endpoint, options, apiKey, retryCount + 1);
      }
      throw error;
    }
  }

  async createOrder(orderData: any): Promise<DelhiveryCreateOrderResponse> {
    try {
      console.log('🚀 Creating Delhivery order with data:', orderData);
      
      // Get API key from pickup location configuration
      const { getDelhiveryApiKey } = await import('./pickup-location-config');
      
      // Extract client ID from order data if available
      const clientId = orderData.clientId;
      if (!clientId) {
        console.warn('⚠️ [DELHIVERY] No client ID provided in order data - API key selection may be incorrect');
      }
      
      const apiKey = await getDelhiveryApiKey(orderData.pickup_location, clientId);
      
      if (!apiKey) {
        throw new Error(`No Delhivery API key found for pickup location: ${orderData.pickup_location}${clientId ? ` and client: ${clientId}` : ''}. Please configure the API key in the client settings for this pickup location.`);
      }
      
      console.log('🔑 Using Delhivery API key from pickup location:', orderData.pickup_location);
      if (clientId) {
        console.log('🔑 API key retrieved for client:', clientId);
      }
      
      // Log reseller information if present
      if (orderData.reseller_name || orderData.reseller_mobile) {
        console.log('🏪 Reseller Information:');
        console.log('  Name:', orderData.reseller_name || 'Not provided');
        console.log('  Mobile:', orderData.reseller_mobile || 'Not provided');
      }
      
      // Helper function to sanitize text fields for JSON
      const sanitizeText = (text: any): string => {
        if (!text) return '';
        return String(text)
          .replace(/[\r\n\t]/g, ' ') // Replace newlines and tabs with spaces
          .replace(/[;]/g, ' ') // Remove semicolons and replace with spaces
          .replace(/\s+/g, ' ') // Replace multiple spaces with single space
          .trim(); // Remove leading/trailing whitespace
      };

      // Map order data to Delhivery API format - exactly matching the working example
      const shipmentData = {
        name: sanitizeText(orderData.name),
        add: sanitizeText(orderData.address),
        pin: sanitizeText(orderData.pincode),
        city: sanitizeText(orderData.city),
        state: sanitizeText(orderData.state),
        country: sanitizeText(orderData.country) || 'India',
        phone: sanitizeText(orderData.phone || orderData.mobile),
        mobile: sanitizeText(orderData.mobile),
        order: sanitizeText(orderData.reference_number) || `Order-${Date.now()}`,
        payment_mode: orderData.is_cod ? 'COD' : 'Prepaid', // Match the exact format from curl example
        return_pin: sanitizeText(orderData.return_pincode),
        return_city: '',
        return_phone: '',
        return_add: sanitizeText(orderData.return_address?.address || orderData.return_address),
        return_state: '',
        return_country: 'India',
        products_desc: sanitizeText(orderData.product_description),
        hsn_code: sanitizeText(orderData.hsn_code),
        cod_amount: orderData.is_cod ? (orderData.cod_amount?.toString() || '') : '',
        order_date: null, // Match the curl example format
        total_amount: orderData.package_value?.toString() || '',
        seller_add: sanitizeText(orderData.seller_address),
        seller_name: sanitizeText(orderData.reseller_name || orderData.seller_name),
        seller_inv: sanitizeText(orderData.invoice_number),
        seller_phone: sanitizeText(orderData.reseller_mobile),
        quantity: orderData.total_items?.toString() || '',
        waybill: orderData.tracking_id || '', // Empty for new orders
        shipment_length: orderData.shipment_length?.toString() || '10',
        shipment_width: orderData.shipment_breadth?.toString() || '10',
        shipment_height: orderData.shipment_height?.toString() || '10',
        weight: orderData.weight?.toString() || '100', // Weight in grams
        shipping_mode: 'Surface', // Default to Surface
        address_type: '' // Match the curl example format
      };

      // Prepare the JSON data for the request
      const jsonData = {
        shipments: [shipmentData],
        pickup_location: {
          name: orderData.pickup_location || 'VIJAYA8 FRANCHISE' // Use actual pickup location value
        }
      };

      // Validate JSON can be stringified without errors
      let jsonString: string;
      try {
        jsonString = JSON.stringify(jsonData);
        console.log('✅ JSON validation successful');
        console.log('📏 JSON string length:', jsonString.length);
        
        // Additional validation: check for unterminated strings
        if (jsonString.includes('\\"') && !jsonString.includes('"')) {
          console.warn('⚠️ Potential unterminated string detected in JSON');
        }
        
        // Test parsing the JSON back to ensure it's valid
        JSON.parse(jsonString);
        console.log('✅ JSON parsing test successful');
        
      } catch (jsonError) {
        console.error('❌ JSON stringification/parsing failed:', jsonError);
        console.error('❌ Problematic data:', JSON.stringify(jsonData, null, 2));
        
        // Log each field to identify the problematic one
        console.error('🔍 Debugging JSON fields:');
        Object.entries(shipmentData).forEach(([key, value]) => {
          try {
            JSON.stringify({ [key]: value });
          } catch (fieldError) {
            console.error(`❌ Problematic field "${key}":`, value);
            console.error(`❌ Field error:`, fieldError);
          }
        });
        
        throw new Error(`JSON preparation failed: ${jsonError instanceof Error ? jsonError.message : 'Unknown error'}`);
      }

      // Send data exactly as the working example - as form data with format=json&data={...}
      const requestBody = `format=json&data=${jsonString}`;

      console.log('📦 Delhivery API Request Body:', requestBody);
      console.log('🔍 [DELHIVERY] Pickup location being sent:', orderData.pickup_location);
      console.log('🔍 [DELHIVERY] Sanitized shipment data:', JSON.stringify(shipmentData, null, 2));
      console.log('🔍 [DELHIVERY] JSON data length:', jsonString.length, 'characters');

      const response = await this.makeRequest('/api/cmu/create.json', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: requestBody
      }, apiKey);

      // Log the response with proper formatting to show array contents
      console.log('✅ Delhivery order created successfully:');
      console.log('  Raw Response:', JSON.stringify(response, null, 2));
      
      // Check if the API call was successful
      if (response.success === false || response.error === true) {
        let errorMessage = 'Delhivery API returned an error';
        let detailedError = '';
        
        // Try to extract error message from remarks array if available
        if (response.packages && response.packages.length > 0) {
          const packageInfo = response.packages[0];
          if (packageInfo.remarks && Array.isArray(packageInfo.remarks) && packageInfo.remarks.length > 0) {
            detailedError = packageInfo.remarks.join(', ');
            errorMessage = `Delhivery API Error: ${detailedError}`;
          }
          
          // Also check if package status is "Fail"
          if (packageInfo.status === 'Fail') {
            console.log('❌ [DELHIVERY] Package status is Fail');
            if (packageInfo.remarks && Array.isArray(packageInfo.remarks) && packageInfo.remarks.length > 0) {
              detailedError = packageInfo.remarks.join(', ');
              errorMessage = `Delhivery API Error: ${detailedError}`;
            }
          }
        }
        
        // Fallback to rmk field if available
        if (!detailedError && response.rmk) {
          detailedError = response.rmk;
          errorMessage = `Delhivery API Error: ${detailedError}`;
        }
        
        // Log detailed error information for debugging
        console.error('❌ [DELHIVERY] API Error Details:', {
          success: response.success,
          error: response.error,
          rmk: response.rmk,
          packages: response.packages,
          detailedError: detailedError,
          fullResponse: response
        });
        
        throw new Error(errorMessage);
      }
      
      // Extract waybill number and order ID from packages array
      let waybillNumber = '';
      let orderId = '';
      if (response.packages && response.packages.length > 0) {
        const packageInfo = response.packages[0];
        waybillNumber = packageInfo.waybill || '';
        orderId = packageInfo.refnum || '';
        console.log('📦 Extracted waybill from package:');
        console.log('  Package Info:', JSON.stringify(packageInfo, null, 2));
        
        // Log remarks array content if it exists
        if (packageInfo.remarks && Array.isArray(packageInfo.remarks)) {
          console.log('  Remarks:', packageInfo.remarks);
          console.log('  Remarks (stringified):', JSON.stringify(packageInfo.remarks, null, 2));
        }
      }
      
      return {
        success: true,
        waybill_number: waybillNumber,
        order_id: orderId,
        message: 'Order created successfully'
      };

    } catch (error) {
      console.error('❌ Failed to create Delhivery order:', error);
      throw error;
    }
  }

  async getOrderStatus(waybill: string, pickupLocation: string): Promise<any> {
    try {
      // Get API key from pickup location configuration
      const { getDelhiveryApiKey } = await import('./pickup-location-config');
      const apiKey = await getDelhiveryApiKey(pickupLocation);
      
      if (!apiKey) {
        throw new Error(`No Delhivery API key found for pickup location: ${pickupLocation}`);
      }
      
      const response = await this.makeRequest(`/api/waybill/${waybill}`, {}, apiKey);
      return response;
    } catch (error) {
      console.error('Delhivery Status API Error:', error);
      throw error;
    }
  }

  async validatePincode(pincode: string, pickupLocation?: string): Promise<{
    success: boolean;
    serviceable: boolean;
    city?: string;
    state?: string;
    country?: string;
    message?: string;
    error?: string;
  }> {
    try {
      // Get API key from pickup location configuration
      if (!pickupLocation) {
        throw new Error('Pickup location is required for pincode validation');
      }
      
      const { getDelhiveryApiKey } = await import('./pickup-location-config');
      const apiKey = await getDelhiveryApiKey(pickupLocation);
      
      if (!apiKey) {
        throw new Error(`No Delhivery API key found for pickup location: ${pickupLocation}. Please configure it in the client settings.`);
      }
      
      // Use the production Delhivery pincode validation endpoint
      const url = `${this.baseUrl}/c/api/pin-codes/json/?filter_codes=${pincode}`;
      const options = {
        method: 'GET', 
        headers: {
          'Authorization': `Token ${apiKey}`,
          'Content-Type': 'application/json'
        }
      };

      const response = await fetch(url, options);

      if (response.ok) {
        const data = await response.json();
        
        // Check if pincode is serviceable based on Delhivery response
        if (data && data.delivery_codes && Array.isArray(data.delivery_codes) && data.delivery_codes.length > 0) {
          const deliveryCode = data.delivery_codes[0];
          const postalCode = deliveryCode.postal_code;
          
          return {
            success: true,
            serviceable: true,
            city: postalCode.city || '',
            state: postalCode.inc ? postalCode.inc.split('_').pop()?.replace(/[()]/g, '').replace(/^[A-Z]\s*/, '') || '' : '',
            country: 'India',
            message: 'Pincode is serviceable by Delhivery',
          };
        } else if (data && data.delivery_codes && Array.isArray(data.delivery_codes) && data.delivery_codes.length === 0) {
          // Empty delivery_codes array means pincode not found
          return {
            success: true,
            serviceable: false,
            message: 'Pincode is not serviceable by Delhivery',
          };
        } else {
          return {
            success: true,
            serviceable: false,
            message: 'Pincode is not serviceable by Delhivery',
          };
        }
      } else {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
      }

    } catch (error) {
      return {
        success: false,
        serviceable: false,
        error: error instanceof Error ? error.message : 'Failed to validate pincode',
      };
    }
  }

  async cancelOrder(waybill: string, pickupLocation: string, clientId?: number): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      console.log('🚫 [DELHIVERY_CANCEL] Cancelling order with waybill:', waybill);
      
      // Get API key from pickup location configuration
      const { getDelhiveryApiKey } = await import('./pickup-location-config');
      
      const apiKey = await getDelhiveryApiKey(pickupLocation, clientId);
      
      if (!apiKey) {
        throw new Error(`No Delhivery API key found for pickup location: ${pickupLocation}${clientId ? ` and client: ${clientId}` : ''}. Please configure the API key in the client settings for this pickup location.`);
      }
      
      console.log('🔑 [DELHIVERY_CANCEL] Using Delhivery API key for pickup location:', pickupLocation);
      
      // Use production Delhivery API URL for cancellation
      const delhiveryUrl = 'https://track.delhivery.com/api/p/edit';
      
      // Prepare cancellation payload according to Delhivery documentation
      const cancelPayload = {
        waybill: waybill,
        cancellation: "true"
      };
      
      console.log('📦 [DELHIVERY_CANCEL] Calling Delhivery Production API:', delhiveryUrl);
      console.log('📦 [DELHIVERY_CANCEL] Cancellation payload:', cancelPayload);
      
      const response = await this.makeRequest(
        '/api/p/edit',
        {
          method: 'POST',
          headers: {
            'Authorization': `Token ${apiKey}`,
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(cancelPayload)
        },
        apiKey
      );
      
      console.log('✅ [DELHIVERY_CANCEL] Order cancelled successfully in Delhivery:', response);
      
      return {
        success: true,
        message: 'Order cancelled successfully in Delhivery'
      };
      
    } catch (error) {
      console.error('❌ [DELHIVERY_CANCEL] Error cancelling order:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to cancel order in Delhivery'
      };
    }
  }
}

export const delhiveryService = new DelhiveryService();
