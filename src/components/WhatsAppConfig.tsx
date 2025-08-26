'use client';

import { useState, useEffect } from 'react';
import whatsappService from '@/lib/whatsapp-service';

export default function WhatsAppConfig() {
  const [apiKey, setApiKey] = useState('');
  const [messageId, setMessageId] = useState('');
  const [isEnabled, setIsEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | ''>('');
  const [testPhone, setTestPhone] = useState('');

  useEffect(() => {
    // Load configuration from environment variables or localStorage
    const loadConfig = () => {
      const config = {
        apiKey: process.env.NEXT_PUBLIC_FAST2SMS_WHATSAPP_API_KEY || localStorage.getItem('whatsapp_api_key') || '',
        messageId: process.env.NEXT_PUBLIC_FAST2SMS_WHATSAPP_MESSAGE_ID || localStorage.getItem('whatsapp_message_id') || '',
        enabled: localStorage.getItem('whatsapp_enabled') === 'true'
      };

      setApiKey(config.apiKey);
      setMessageId(config.messageId);
      setIsEnabled(config.enabled);
    };

    loadConfig();
  }, []);

  const saveConfig = () => {
    try {
      localStorage.setItem('whatsapp_api_key', apiKey);
      localStorage.setItem('whatsapp_message_id', messageId);
      localStorage.setItem('whatsapp_enabled', isEnabled.toString());

      // Update service configuration
      whatsappService.updateConfig({
        apiKey,
        messageId
      });

      setMessage('WhatsApp configuration saved successfully!');
      setMessageType('success');
    } catch (error) {
      setMessage('Failed to save configuration');
      setMessageType('error');
    }

    setTimeout(() => {
      setMessage('');
      setMessageType('');
    }, 3000);
  };

  const testWhatsApp = async () => {
    if (!testPhone.trim()) {
      setMessage('Please enter a phone number for testing');
      setMessageType('error');
      return;
    }

    setIsLoading(true);
    try {
      // Test with sample variables (4 variables for message ID 4697)
      const testVariables = ['Test Customer', 'Scan2Ship', 'DTDC', 'TRACK123'];
      const result = await whatsappService.sendTestWhatsApp(testPhone, testVariables);
      
      if (result.success) {
        setMessage('Test WhatsApp message sent successfully!');
        setMessageType('success');
      } else {
        setMessage(`Test failed: ${result.error}`);
        setMessageType('error');
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

  const serviceStatus = whatsappService.getStatus();

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">📱 WhatsApp Service Configuration</h3>
        <div className="flex items-center space-x-2">
          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
            serviceStatus.configured 
              ? 'bg-green-100 text-green-800' 
              : 'bg-red-100 text-red-800'
          }`}>
            {serviceStatus.configured ? 'Configured' : 'Not Configured'}
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
        {/* Enable/Disable WhatsApp */}
        <div className="flex items-center">
          <input
            type="checkbox"
            id="whatsappEnabled"
            checked={isEnabled}
            onChange={(e) => setIsEnabled(e.target.checked)}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label htmlFor="whatsappEnabled" className="ml-2 block text-sm text-gray-900">
            Enable WhatsApp Notifications
          </label>
        </div>

        {/* API Configuration */}
        <div className="border border-gray-200 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-3">Fast2SMS WhatsApp API Configuration</h4>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                API Key
              </label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Enter Fast2SMS WhatsApp API key"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">Your Fast2SMS WhatsApp API key</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Message ID
              </label>
              <input
                type="text"
                value={messageId}
                onChange={(e) => setMessageId(e.target.value)}
                placeholder="Enter WhatsApp message ID"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">WhatsApp message ID from Fast2SMS dashboard</p>
            </div>
          </div>
        </div>

        {/* Test Configuration */}
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
              disabled={isLoading || !isEnabled || !apiKey || !messageId}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Sending...' : 'Send Test WhatsApp'}
            </button>
          </div>
        </div>

        {/* Setup Instructions */}
        <div className="border border-gray-200 rounded-lg p-4 bg-blue-50">
          <h4 className="font-medium text-blue-900 mb-3">📋 Setup Instructions</h4>
          <div className="text-sm text-blue-800 space-y-2">
            <p>1. <strong>Get Fast2SMS WhatsApp API Key:</strong> Sign up at <a href="https://www.fast2sms.com" target="_blank" rel="noopener noreferrer" className="underline">fast2sms.com</a></p>
            <p>2. <strong>Create WhatsApp Template:</strong> Set up WhatsApp template in Fast2SMS dashboard</p>
            <p>3. <strong>Get Message ID:</strong> Copy the message ID from your WhatsApp template</p>
            <p>4. <strong>Configure Variables:</strong> Ensure your template has variables (Var1, Var2, etc.)</p>
            <p>5. <strong>Test Configuration:</strong> Use the test section above to verify setup</p>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            onClick={saveConfig}
            className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            Save Configuration
          </button>
        </div>
      </div>
    </div>
  );
}
