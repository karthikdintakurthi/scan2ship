/**
 * Fast2SMS API Service
 * Documentation: https://docs.fast2sms.com/reference/authorization
 * Supports both DLT SMS (recommended) and Quick SMS routes
 */

const FAST2SMS_API_URL = 'https://www.fast2sms.com/dev/bulkV2';

interface Fast2SMSResponse {
  return: boolean;
  request_id: string;
  message: string[];
}

interface SendOTPParams {
  mobile: string;
  otp: string;
  variables?: Record<string, string>;
}

interface DLTConfig {
  senderId: string;
  templateId: string;
  entityId?: string;
}

/**
 * Send OTP via Fast2SMS
 */
export async function sendOTP(params: SendOTPParams): Promise<{ success: boolean; requestId?: string; error?: string }> {
  try {
    const apiKey = process.env.FAST2SMS_API_KEY;
    
    if (!apiKey) {
      console.error('❌ [FAST2SMS] FAST2SMS_API_KEY environment variable is not set');
      return { 
        success: false, 
        error: 'SMS service is not configured. Please contact support.' 
      };
    }

    // Clean mobile number (ensure it's 10 digits)
    const cleanMobile = params.mobile.replace(/\D/g, '');
    let mobileNumber = cleanMobile;
    
    // Handle different mobile number formats
    if (cleanMobile.length === 12 && cleanMobile.startsWith('91')) {
      mobileNumber = cleanMobile.substring(2);
    } else if (cleanMobile.length === 13 && cleanMobile.startsWith('91')) {
      mobileNumber = cleanMobile.substring(3);
    }

    // Validate mobile number format
    if (mobileNumber.length !== 10 || !/^[6-9]\d{9}$/.test(mobileNumber)) {
      return { 
        success: false, 
        error: 'Invalid mobile number format' 
      };
    }

    // Check if DLT configuration is available
    const dltSenderId = process.env.FAST2SMS_DLT_SENDER_ID;
    const dltTemplateId = process.env.FAST2SMS_DLT_TEMPLATE_ID;
    const dltEntityId = process.env.FAST2SMS_DLT_ENTITY_ID;
    
    // DLT requires sender_id and template_id (entity_id may be optional depending on template registration)
    const useDLT = !!(dltSenderId && dltTemplateId);

    let requestBody: any;

    if (useDLT) {
      // Use DLT SMS API (recommended for India - better compliance and deliverability)
      // For DLT SMS, we need: sender_id, message (template ID), and variables_values
      console.log(`📱 [FAST2SMS] Using DLT SMS route`);
      
      // DLT SMS requires entity_id - if not provided, fallback to Quick SMS
      if (!dltEntityId) {
        console.warn('⚠️ [FAST2SMS] DLT Entity ID not provided, falling back to Quick SMS');
        const message = `Your OTP for Scan2Ship order tracking is ${params.otp}. Valid for 5 minutes. Do not share this OTP with anyone.`;
        requestBody = {
          route: 'q',
          message: message,
          numbers: mobileNumber,
          flash: 0
        };
      } else {
        // DLT SMS format according to Fast2SMS API documentation (https://docs.fast2sms.com/reference/new-endpoint-2)
        // Example format:
        // {
        //   "route": "dlt",
        //   "sender_id": "JKSHUB",
        //   "message": "208015",  // Template ID
        //   "variables_values": "123456",  // OTP value (for single variable, just the value)
        //   "numbers": "9948550555",
        //   "flash": 0
        // }
        // For template: "Your OTP for tracking your orders is {#VAR#} - JUNIOR KIDS HUB"
        // variables_values: For single variable, just pass the value. For multiple variables, use "|" separator
        requestBody = {
          route: 'dlt',
          sender_id: dltSenderId.trim(), // Sender ID short code (e.g., "JKSHUB")
          message: String(dltTemplateId).trim(), // Template ID from DLT Manager (e.g., "208015")
          variables_values: params.otp, // OTP value - for single {#VAR#}, just pass the value directly
          numbers: mobileNumber, // 10-digit mobile number
          flash: 0 // 0 for normal SMS, 1 for flash SMS
        };
        
        // Note: entity_id is not required in the request body for bulkV2 endpoint
        // It's embedded in the template registration
        
        console.log(`📱 [FAST2SMS] DLT Request Body:`, JSON.stringify(requestBody, null, 2));
        console.log(`📱 [FAST2SMS] DLT Config Check:`, {
          sender_id: dltSenderId,
          template_id: dltTemplateId,
          entity_id: dltEntityId,
          template_id_length: dltTemplateId?.length,
          entity_id_length: dltEntityId?.length,
          otp: params.otp
        });
      }
    } else {
      // Fallback to Quick SMS route (non-DLT)
      console.log(`📱 [FAST2SMS] Using Quick SMS route (non-DLT)`);
      const message = `Your OTP for Scan2Ship order tracking is ${params.otp}. Valid for 5 minutes. Do not share this OTP with anyone.`;
      requestBody = {
        route: 'q', // Quick SMS route
        message: message,
        numbers: mobileNumber,
        flash: 0
      };
    }

    console.log(`📱 [FAST2SMS] Sending OTP to ${mobileNumber}`);

    console.log(`📱 [FAST2SMS] Request URL: ${FAST2SMS_API_URL}`);
    console.log(`📱 [FAST2SMS] Request Body:`, JSON.stringify(requestBody, null, 2));

    const response = await fetch(FAST2SMS_API_URL, {
      method: 'POST',
      headers: {
        'authorization': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    const responseText = await response.text();
    console.log(`📱 [FAST2SMS] Response Status: ${response.status}`);
    console.log(`📱 [FAST2SMS] Response Body:`, responseText);

    let data: Fast2SMSResponse;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error('❌ [FAST2SMS] Failed to parse response:', parseError);
      return {
        success: false,
        error: `Invalid response from SMS service: ${responseText.substring(0, 100)}`
      };
    }

    if (!response.ok || !data.return) {
      console.error('❌ [FAST2SMS] Failed to send OTP:', data);
      
      // Provide more helpful error messages
      let errorMessage = 'Failed to send OTP. Please try again.';
      if (data.message && Array.isArray(data.message) && data.message.length > 0) {
        errorMessage = data.message[0];
      } else if (typeof data.message === 'string') {
        errorMessage = data.message;
      }
      
      // Specific error handling for DLT issues
      if (useDLT) {
        if (errorMessage.includes('Invalid Message ID') || errorMessage.includes('Template') || errorMessage.includes('template')) {
          errorMessage = `DLT Template ID "${dltTemplateId}" is invalid. Please verify:
1. Template ID is correct in Fast2SMS DLT Manager
2. Template is approved and active
3. Template content matches: "Your OTP for tracking your orders is {#VAR#} - JUNIOR KIDS HUB"
4. Sender ID "${dltSenderId}" matches the template's sender ID`;
        } else if (errorMessage.includes('Entity') || errorMessage.includes('entity')) {
          errorMessage = `DLT Entity ID "${dltEntityId}" is invalid. Please verify it matches your registered entity ID in Fast2SMS.`;
        } else if (errorMessage.includes('Sender') || errorMessage.includes('sender')) {
          errorMessage = `DLT Sender ID "${dltSenderId}" is invalid. Please verify it matches your registered sender ID.`;
        }
      }
      
      return { 
        success: false, 
        error: errorMessage
      };
    }

    console.log(`✅ [FAST2SMS] OTP sent successfully. Request ID: ${data.request_id}`);
    
    return {
      success: true,
      requestId: data.request_id
    };

  } catch (error) {
    console.error('❌ [FAST2SMS] Error sending OTP:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to send OTP. Please try again.' 
    };
  }
}

/**
 * Generate a 6-digit OTP
 */
export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}
