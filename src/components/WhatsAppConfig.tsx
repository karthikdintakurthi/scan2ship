'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface WhatsAppConfigData {
  configured: boolean;
  missingFields: string[];
}

export default function WhatsAppConfig() {
  const { currentUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingConfig, setIsLoadingConfig] = useState(true);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | ''>('');
  const [testPhone, setTestPhone] = useState('');
  const [configStatus, setConfigStatus] = useState<WhatsAppConfigData>({
    configured: false,
    missingFields: []
  });

  useEffect(() => {
    // Load configuration from database via API
    const loadConfig = async () => {
      try {
        setIsLoadingConfig(true);
        
        // Get authentication token
        const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
        
        if (!token) {
          console.error('📱 [WHATSAPP_CONFIG] No authentication token found');
          throw new Error('No authentication token');
        }
        
        // Fetch WhatsApp configuration from API
        const response = await fetch('/api/admin/system-config', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (response.ok) {
          const data = await response.json();
          const whatsappConfigs = data.configs?.filter((config: any) => config.category === 'whatsapp') || [];
          
          const apiKeyConfig = whatsappConfigs.find((config: any) => config.key === 'FAST2SMS_WHATSAPP_API_KEY');
          const messageIdConfig = whatsappConfigs.find((config: any) => config.key === 'FAST2SMS_WHATSAPP_MESSAGE_ID');
          
          const configData: WhatsAppConfigData = {
            configured: !!(apiKeyConfig?.value && messageIdConfig?.value),
            missingFields: []
          };

          // Check for missing fields without exposing values
          if (!apiKeyConfig?.value) configData.missingFields.push('API Key');
          if (!messageIdConfig?.value) configData.missingFields.push('Message ID');
          
          setConfigStatus(configData);
          
          console.log('📱 [WHATSAPP_CONFIG] Configuration loaded from database:', {
            configured: configData.configured,
            missingFields: configData.missingFields.length
          });
        } else {
          console.error('📱 [WHATSAPP_CONFIG] Failed to load configuration from API:', response.status, response.statusText);
          
          if (response.status === 401) {
            console.error('📱 [WHATSAPP_CONFIG] Authentication failed - user needs to login');
            setMessage('Authentication failed. Please refresh the page and login again.');
            setMessageType('error');
          } else {
            console.error('📱 [WHATSAPP_CONFIG] API error - configuration unavailable');
            setConfigStatus({
              configured: false,
              missingFields: ['API Key', 'Message ID']
            });
          }
        }
      } catch (error) {
        console.error('📱 [WHATSAPP_CONFIG] Error loading configuration:', error);
        setConfigStatus({
          configured: false,
          missingFields: ['API Key', 'Message ID']
        });
      } finally {
        setIsLoadingConfig(false);
      }
    };

    if (currentUser) {
      loadConfig();
    }
  }, [currentUser]);

  const testWhatsApp = async () => {
    if (!testPhone.trim()) {
      setMessage('Please enter a phone number for testing');
      setMessageType('error');
      return;
    }

    setIsLoading(true);
    try {
      // Test WhatsApp configuration via API
      const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
      const response = await fetch('/api/whatsapp/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          phoneNumber: testPhone,
          testVariables: ['Test Customer', 'Scan2Ship', 'DTDC', 'TRACK123']
        })
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setMessage('Test WhatsApp message sent successfully!');
          setMessageType('success');
        } else {
          setMessage(`Test failed: ${result.error}`);
          setMessageType('error');
        }
      } else {
        throw new Error('Failed to send test message');
      }
    } catch (error) {
      setMessage('Failed to send test message');
      setMessageType('error');
    } finally {
      setIsLoading(false);
    }

    setTimeout(() => {
      setMessage('');
      setMessageType('');
    }, 5000);
  };

  if (isLoadingConfig) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">Loading WhatsApp configuration...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">📱 WhatsApp Service Configuration</h3>
        <div className="flex items-center space-x-2">
          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
            configStatus.configured 
              ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            {configStatus.configured ? 'Configured' : 'Not Configured'}
          </span>
        </div>
      </div>

      {message && (
        <div className={`mb-4 p-3 rounded-md ${
          messageType === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
        }`}>
          {message}
        </div>
      )}

      <div className="space-y-6">
        {/* Configuration Status */}
        <div className="border border-gray-200 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-3">Configuration Status</h4>
          
          {configStatus.configured ? (
            <div className="text-sm text-gray-700">
              <p className="text-green-600 mb-2">✅ WhatsApp service is properly configured and ready to use.</p>
              <p>All required configuration values are set in the system.</p>
            </div>
          ) : (
            <div className="text-sm text-gray-700">
              <p className="text-red-600 mb-2">❌ WhatsApp service is not fully configured.</p>
              <p className="mb-2">Missing configuration:</p>
              <ul className="list-disc list-inside space-y-1">
                {configStatus.missingFields.map((field, index) => (
                  <li key={index} className="text-red-600">{field}</li>
                ))}
              </ul>
              <p className="mt-2 text-gray-600">
                Please contact your administrator to configure these values in the system settings.
              </p>
            </div>
          )}
        </div>

        {/* Test Configuration */}
        {configStatus.configured && (
          <div className="border border-gray-200 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-3">Test WhatsApp Configuration</h4>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Test Phone Number
                </label>
                <input
                  type="tel"
                  value={testPhone}
                  onChange={(e) => setTestPhone(e.target.value)}
                  placeholder="Enter phone number (e.g., 9876543210)"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">Phone number to send test WhatsApp message</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Test Variables
                </label>
                <div className="text-xs text-gray-500 mb-2">
                  Test will use sample order data: Customer Name, Client Company Name, Courier Service, Tracking Number
                </div>
              </div>

              <button
                onClick={testWhatsApp}
                disabled={isLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Sending...' : 'Send Test WhatsApp'}
              </button>
            </div>
          </div>
        )}

        {/* Setup Instructions */}
        <div className="border border-gray-200 rounded-lg p-4 bg-blue-50">
          <h4 className="font-medium text-blue-900 mb-3">📋 Setup Instructions</h4>
          <div className="text-sm text-blue-800 space-y-2">
            <p>1. <strong>Get Fast2SMS WhatsApp API Key:</strong> Sign up at <a href="https://www.fast2sms.com" target="_blank" rel="noopener noreferrer" className="underline">fast2sms.com</a></p>
            <p>2. <strong>Create WhatsApp Template:</strong> Set up WhatsApp template in Fast2SMS dashboard</p>
            <p>3. <strong>Get Message ID:</strong> Copy the message ID from your WhatsApp template</p>
            <p>4. <strong>Configure Variables:</strong> Ensure your template has variables (Var1, Var2, etc.)</p>
            <p>5. <strong>Contact Administrator:</strong> Provide the API key and message ID to your system administrator</p>
            <p>6. <strong>Test Configuration:</strong> Use the test section above to verify setup once configured</p>
          </div>
        </div>

        {/* Security Notice */}
        <div className="border border-yellow-200 rounded-lg p-4 bg-yellow-50">
          <h4 className="font-medium text-yellow-900 mb-3">🔒 Security Notice</h4>
          <div className="text-sm text-yellow-800 space-y-2">
            <p>• API keys and sensitive configuration are managed securely on the server side</p>
            <p>• Client-side code never exposes sensitive information</p>
            <p>• All configuration changes must go through secure administrative channels</p>
            <p>• Test functionality is available only when properly configured</p>
          </div>
        </div>
      </div>
    </div>
  );
}
