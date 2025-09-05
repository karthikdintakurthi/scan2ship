# WhatsApp Service Setup Guide

## Overview
This guide will help you configure the WhatsApp service for individual clients in the scan2ship application using the Fast2SMS WhatsApp API. Each client has their own independent WhatsApp configuration, allowing for personalized messaging and separate billing.

## Prerequisites
1. **Fast2SMS Account**: You need a Fast2SMS account with WhatsApp API access
2. **Admin Access**: You must be logged in as an admin or master admin user
3. **WhatsApp Business API**: Your Fast2SMS account must have WhatsApp Business API access

## Step 1: Get Fast2SMS Credentials

### 1.1 Create Fast2SMS Account
1. Go to [Fast2SMS](https://fast2sms.com/)
2. Sign up for an account
3. Complete your profile and KYC verification
4. Apply for WhatsApp Business API access

### 1.2 Get API Key
1. Login to your Fast2SMS dashboard
2. Go to **API Keys** section
3. Generate a new API key for WhatsApp
4. Copy the API key (keep it secure)

### 1.3 Get Message Template ID
1. In your Fast2SMS dashboard, go to **WhatsApp Templates**
2. Create or use an existing message template
3. Copy the **Template ID**
4. Ensure the template is approved by WhatsApp

## Step 2: Configure WhatsApp Service

### 2.1 Access Client Settings
1. Login to scan2ship as admin/master admin
2. Go to **Admin Settings** > **Client Settings**
3. Select the specific client you want to configure
4. Scroll down to the **"WhatsApp Service Configuration"** section

### 2.2 Configure WhatsApp Settings
1. Fill in the required configuration fields:
   - **Fast2SMS WhatsApp API Key**: Your actual Fast2SMS API key
   - **WhatsApp Message Template ID**: Your actual message template ID

2. Configure optional settings:
   - **Enable WhatsApp Service**: Check to enable the service
   - **Default Country Code**: Default country code (e.g., `+91` for India)
   - **Maximum Retry Attempts**: Maximum retry attempts for failed messages

3. Click **"Save WhatsApp Configuration"** to save your settings

### 2.3 Client-Specific Configuration
**Important**: Each client has their own WhatsApp configuration:
- Different API keys for different clients
- Different message templates for different business needs
- Independent service enable/disable settings
- Separate retry and country code configurations

This allows each client to:
- Use their own Fast2SMS account
- Customize message templates for their business
- Control their own WhatsApp service independently
- Maintain separate billing and usage tracking

## Step 3: Test WhatsApp Service

### 3.1 Verify Configuration
1. Go to any page that shows WhatsApp configuration status
2. The status should now show "✅ Configured" instead of "❌ Not Configured"
3. Missing fields should be empty

### 3.2 Test Message Sending
1. Use the WhatsApp test functionality in the application
2. Enter a test phone number
3. Send a test message
4. Check if the message is delivered successfully

## Step 4: Troubleshooting

### Common Issues and Solutions

#### Issue: "WhatsApp service is not fully configured"
**Solution**: Ensure both API Key and Message ID are set with actual values (not placeholders)

#### Issue: "Authentication failed" errors
**Solution**: 
1. Verify your Fast2SMS API key is correct
2. Check if your Fast2SMS account is active
3. Ensure you have sufficient balance in your Fast2SMS account

#### Issue: "Message template not found"
**Solution**:
1. Verify the Message ID matches your approved template
2. Ensure the template is approved by WhatsApp
3. Check if the template is active in your Fast2SMS dashboard

#### Issue: "Phone number invalid"
**Solution**:
1. Ensure phone numbers include country code (e.g., +91XXXXXXXXXX)
2. Check if the phone number is registered on WhatsApp
3. Verify the phone number format matches your template requirements

### Debug Steps
1. Check browser console for error messages
2. Verify network requests in browser DevTools
3. Check server logs for API errors
4. Test Fast2SMS API directly using their documentation

## Step 5: Advanced Configuration

### 5.1 Custom Message Templates
You can create multiple message templates and configure them:

```
WHATSAPP_ORDER_CONFIRMATION_TEMPLATE_ID: [Template ID for order confirmations]
WHATSAPP_SHIPMENT_UPDATE_TEMPLATE_ID: [Template ID for shipment updates]
WHATSAPP_PAYMENT_REMINDER_TEMPLATE_ID: [Template ID for payment reminders]
```

### 5.2 Rate Limiting
Configure rate limiting to avoid hitting API limits:

```
WHATSAPP_RATE_LIMIT_PER_MINUTE: 30
WHATSAPP_RATE_LIMIT_PER_HOUR: 1000
```

### 5.3 Error Handling
Configure retry and error handling:

```
WHATSAPP_MAX_RETRIES: 3
WHATSAPP_RETRY_DELAY_SECONDS: 60
WHATSAPP_ERROR_NOTIFICATION_EMAIL: admin@yourcompany.com
```

## Security Considerations

### API Key Security
- **Never** expose your API key in client-side code
- Store API keys as `password` type in system configuration
- Regularly rotate your API keys
- Monitor API usage for suspicious activity

### Data Privacy
- Ensure phone numbers are handled according to privacy regulations
- Implement proper consent mechanisms for WhatsApp messaging
- Follow WhatsApp Business API policies and guidelines

## Monitoring and Maintenance

### Regular Checks
1. **Daily**: Monitor message delivery rates
2. **Weekly**: Check API usage and costs
3. **Monthly**: Review and update message templates
4. **Quarterly**: Audit configuration and security settings

### Performance Metrics
- Message delivery success rate
- API response times
- Error rates and types
- Cost per message

## Support and Resources

### Fast2SMS Support
- **Documentation**: [https://docs.fast2sms.com/](https://docs.fast2sms.com/)
- **Support Email**: support@fast2sms.com
- **API Status**: Check their status page for service updates

### WhatsApp Business API
- **Documentation**: [https://developers.facebook.com/docs/whatsapp](https://developers.facebook.com/docs/whatsapp)
- **Policy Updates**: Monitor for policy changes
- **Best Practices**: Follow their messaging guidelines

### scan2ship Support
- **Technical Issues**: Check application logs and error messages
- **Configuration Help**: Use the built-in configuration tools
- **Feature Requests**: Contact your development team

## Conclusion

Once configured properly, the WhatsApp service will enable:
- Automated order confirmations
- Shipment status updates
- Payment reminders
- Customer support notifications
- Marketing communications (with proper consent)

The service will integrate seamlessly with your existing order management system and provide a better customer experience through instant WhatsApp notifications.

---

**Last Updated**: September 2, 2025  
**Version**: 1.0  
**Author**: scan2ship Development Team
