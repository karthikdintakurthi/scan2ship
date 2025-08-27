# Vanitha Logistics (Scan2Ship) - User Guide

## Welcome to Vanitha Logistics

Vanitha Logistics (Scan2Ship) is a comprehensive logistics management platform designed to streamline your shipping operations. This guide will help you get started and make the most of our platform.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Dashboard Overview](#dashboard-overview)
3. [Order Management](#order-management)
4. [Client Management](#client-management)
5. [Analytics & Reports](#analytics--reports)
6. [Settings & Configuration](#settings--configuration)
7. [Troubleshooting](#troubleshooting)
8. [FAQ](#faq)

## Getting Started

### First Time Setup

1. **Access the Platform**
   - Navigate to: https://scan2ship.vercel.app
   - You'll be redirected to the login page

2. **Login Credentials**
   - **Email**: Your registered email address
   - **Password**: Your secure password
   - Click "Login" to access your dashboard

3. **Dashboard Welcome**
   - Upon first login, you'll see the welcome screen
   - Complete your profile setup if prompted
   - Review the quick start guide

### User Roles & Permissions

#### Client User
- Create and manage orders
- View order history and tracking
- Access basic analytics
- Manage pickup locations
- Configure courier services

#### Admin User
- All client user permissions
- Manage multiple clients
- Access advanced analytics
- Configure system settings
- User management

#### Master Admin
- All admin permissions
- Platform-wide management
- System configuration
- Client onboarding

## Dashboard Overview

### Main Dashboard

The dashboard provides a comprehensive overview of your logistics operations:

#### Key Metrics
- **Total Orders**: Number of orders created
- **Pending Orders**: Orders awaiting processing
- **Delivered Orders**: Successfully delivered orders
- **Revenue**: Total revenue from orders

#### Quick Actions
- **Create New Order**: Start a new order
- **View Orders**: Access order management
- **Analytics**: View detailed reports
- **Settings**: Configure your account

#### Recent Activity
- Latest orders created
- Recent deliveries
- System notifications
- Important updates

### Navigation Menu

- **Dashboard**: Main overview page
- **Orders**: Order management section
- **Analytics**: Reports and insights
- **Settings**: Configuration options
- **Help**: Support and documentation

## Order Management

### Creating a New Order

1. **Navigate to Orders**
   - Click "Orders" in the main menu
   - Click "Create New Order" button

2. **Customer Information**
   - **Name**: Customer's full name
   - **Mobile**: Primary contact number
   - **Phone**: Alternative contact (optional)
   - **Address**: Complete delivery address
   - **City**: Delivery city
   - **State**: Delivery state
   - **Country**: Delivery country (default: India)
   - **Pincode**: Delivery postal code

3. **Order Details**
   - **Courier Service**: Select preferred courier
   - **Pickup Location**: Choose pickup location
   - **Package Value**: Declared value in INR
   - **Weight**: Package weight in grams
   - **Total Items**: Number of items in package
   - **Reference Number**: Your internal reference (optional)

4. **Payment Options**
   - **COD**: Cash on Delivery (if applicable)
   - **COD Amount**: Amount to collect (if COD)

5. **Additional Information**
   - **Reseller Name**: If applicable
   - **Reseller Mobile**: Reseller contact
   - **Product Description**: Item description
   - **Shipment Dimensions**: Length, breadth, height
   - **Fragile Shipment**: Mark if fragile

6. **Submit Order**
   - Review all information
   - Click "Create Order"
   - System will generate tracking number

### Managing Orders

#### View All Orders
1. Navigate to "Orders" section
2. Use filters to find specific orders:
   - **Search**: By name, mobile, or reference number
   - **Status**: Filter by order status
   - **Date Range**: Filter by creation date
   - **Courier**: Filter by courier service

#### Order Actions
- **View**: See complete order details
- **Edit**: Modify order information
- **Delete**: Remove order (if allowed)
- **Retry**: Retry courier API call (if failed)
- **Track**: View delivery status

#### Order Status Tracking
- **Created**: Order created successfully
- **Processing**: Being processed by courier
- **In Transit**: Package in delivery
- **Delivered**: Successfully delivered
- **Failed**: Delivery failed
- **Returned**: Package returned

### Bulk Operations

#### Import Orders
1. Prepare CSV file with order data
2. Navigate to "Orders" → "Import"
3. Upload CSV file
4. Review and confirm import
5. System processes all orders

#### Export Orders
1. Apply desired filters
2. Click "Export" button
3. Choose format (CSV/Excel)
4. Download file

## Client Management

### Client Overview

The client management section allows you to manage multiple clients and their configurations.

#### Client List
- View all clients
- Search by company name or email
- Filter by subscription status
- Sort by various criteria

#### Client Details
- **Basic Information**: Name, company, contact details
- **Subscription**: Plan, status, expiry date
- **Configuration**: Pickup locations, courier services
- **Analytics**: Performance metrics

### Adding New Clients

1. **Navigate to Admin Panel**
   - Access admin section (admin users only)
   - Click "Add New Client"

2. **Client Information**
   - **Name**: Contact person name
   - **Company Name**: Business name
   - **Email**: Primary contact email
   - **Phone**: Contact number
   - **Address**: Business address
   - **Subscription Plan**: Choose plan

3. **Configuration Setup**
   - **Pickup Locations**: Configure pickup points
   - **Courier Services**: Enable required couriers
   - **API Keys**: Configure courier API keys
   - **Default Settings**: Set order defaults

4. **User Creation**
   - Create initial user account
   - Set role and permissions
   - Send login credentials

### Client Configuration

#### Pickup Locations
- **Add Location**: New pickup point
- **Edit Location**: Modify existing location
- **API Keys**: Configure courier API keys
- **Default Settings**: Set default values

#### Courier Services
- **Enable Services**: Activate courier partnerships
- **Default Service**: Set primary courier
- **Rate Configuration**: Configure pricing
- **Service Areas**: Define coverage areas

## Analytics & Reports

### Order Analytics

#### Overview Dashboard
- **Total Orders**: Complete order count
- **Revenue**: Total revenue generated
- **Average Order Value**: Mean order value
- **Success Rate**: Delivery success percentage

#### Performance Metrics
- **Orders by Status**: Distribution by status
- **Orders by Courier**: Performance by courier
- **Daily Trends**: Order volume trends
- **Geographic Distribution**: Orders by location

#### Detailed Reports
- **Order History**: Complete order timeline
- **Revenue Analysis**: Revenue trends and patterns
- **Courier Performance**: Delivery success rates
- **Customer Analysis**: Customer behavior insights

### Client Analytics (Admin Only)

#### Platform Overview
- **Total Clients**: Number of active clients
- **Revenue**: Total platform revenue
- **Client Growth**: New client acquisition
- **Retention Rate**: Client retention metrics

#### Client Performance
- **Top Clients**: Highest performing clients
- **Client Activity**: Usage patterns
- **Subscription Analysis**: Plan distribution
- **Revenue by Client**: Individual client revenue

### Exporting Reports

1. **Select Report Type**
   - Choose desired report
   - Set date range
   - Apply filters

2. **Generate Report**
   - Click "Generate Report"
   - Wait for processing
   - Download file

3. **Report Formats**
   - **PDF**: For sharing and printing
   - **Excel**: For data analysis
   - **CSV**: For system integration

## Settings & Configuration

### Account Settings

#### Profile Management
- **Personal Information**: Update contact details
- **Password**: Change login password
- **Preferences**: Set default options
- **Notifications**: Configure alerts

#### Security Settings
- **Two-Factor Authentication**: Enable 2FA
- **Session Management**: Active sessions
- **Login History**: Recent login activity
- **API Keys**: Manage API access

### System Configuration

#### General Settings
- **Company Information**: Business details
- **Default Values**: Order defaults
- **Currency**: Set currency format
- **Timezone**: Configure timezone

#### Integration Settings
- **Courier APIs**: Configure courier integrations
- **Webhooks**: Set up webhook endpoints
- **Email Settings**: Configure email notifications
- **SMS Settings**: Set up SMS notifications

#### Advanced Settings
- **Data Retention**: Configure data retention policies
- **Backup Settings**: Automated backup configuration
- **Performance**: Optimize system performance
- **Logging**: Configure system logs

### User Management

#### User Roles
- **Client User**: Basic order management
- **Admin User**: Client and system management
- **Master Admin**: Full platform access

#### User Permissions
- **Order Management**: Create, edit, delete orders
- **Client Management**: Manage client accounts
- **Analytics Access**: View reports and insights
- **System Configuration**: Modify system settings

## Troubleshooting

### Common Issues

#### Login Problems
**Issue**: Unable to login
**Solution**:
1. Check email and password
2. Reset password if needed
3. Clear browser cache
4. Contact support if persistent

#### Order Creation Issues
**Issue**: Orders not creating
**Solution**:
1. Check required fields
2. Verify pickup location configuration
3. Ensure courier API keys are set
4. Check internet connection

#### Courier Integration Issues
**Issue**: Courier API failures
**Solution**:
1. Verify API key configuration
2. Check courier service status
3. Retry failed orders
4. Contact courier support

#### Performance Issues
**Issue**: Slow loading times
**Solution**:
1. Check internet connection
2. Clear browser cache
3. Try different browser
4. Contact support if persistent

### Error Messages

#### "Invalid API Key"
- Check courier API key configuration
- Verify key is active and valid
- Contact courier for new key

#### "Pincode Not Serviceable"
- Verify pincode is correct
- Check courier service area
- Try alternative courier

#### "Order Creation Failed"
- Check all required fields
- Verify pickup location exists
- Ensure courier is active
- Retry order creation

### Getting Help

#### Support Channels
- **In-App Help**: Built-in help system
- **Email Support**: support@vanithalogistics.com
- **Phone Support**: +91-XXXXXXXXXX
- **Live Chat**: Available during business hours

#### Documentation
- **User Guide**: This comprehensive guide
- **API Documentation**: Technical API reference
- **Video Tutorials**: Step-by-step guides
- **FAQ**: Frequently asked questions

## FAQ

### General Questions

**Q: What is Vanitha Logistics?**
A: Vanitha Logistics is a comprehensive logistics management platform that helps businesses streamline their shipping operations through order management, courier integrations, and analytics.

**Q: How much does it cost?**
A: We offer various subscription plans starting from ₹999/month. Contact us for detailed pricing information.

**Q: Which couriers do you support?**
A: We currently support Delhivery, with DTDC and Blue Dart coming soon. We can integrate with any courier that provides API access.

**Q: Is my data secure?**
A: Yes, we use industry-standard encryption and security measures to protect your data. We're compliant with data protection regulations.

### Technical Questions

**Q: Can I integrate with my existing system?**
A: Yes, we provide comprehensive APIs for integration with your existing systems and workflows.

**Q: Do you provide mobile apps?**
A: Our web application is mobile-responsive. Native mobile apps are in development.

**Q: Can I export my data?**
A: Yes, you can export orders, reports, and analytics data in various formats (CSV, Excel, PDF).

**Q: Is there a limit on orders?**
A: Order limits depend on your subscription plan. Contact us to discuss your requirements.

### Business Questions

**Q: How do I get started?**
A: Sign up for an account, complete your profile setup, configure your pickup locations and courier services, and start creating orders.

**Q: Can I manage multiple businesses?**
A: Yes, our multi-tenant architecture allows you to manage multiple clients or businesses from a single account.

**Q: Do you provide training?**
A: Yes, we provide comprehensive training and onboarding support for new clients.

**Q: What if I need custom features?**
A: We offer custom development services for enterprise clients. Contact us to discuss your requirements.

### Support Questions

**Q: What are your support hours?**
A: Our support team is available Monday to Friday, 9 AM to 6 PM IST. Emergency support is available 24/7 for enterprise clients.

**Q: How quickly do you respond to support requests?**
A: We typically respond to support requests within 2-4 hours during business hours.

**Q: Do you provide phone support?**
A: Yes, phone support is available for all clients during business hours.

**Q: Can I schedule a demo?**
A: Yes, we offer free demos to help you understand our platform. Contact us to schedule a session.

## Conclusion

Vanitha Logistics (Scan2Ship) is designed to make your logistics operations more efficient and profitable. This guide covers the essential features and functionality to help you get the most out of our platform.

For additional support or questions, please don't hesitate to contact our support team. We're here to help you succeed!

---

**Contact Information**
- **Website**: https://scan2ship.vercel.app
- **Email**: support@vanithalogistics.com
- **Phone**: +91-XXXXXXXXXX
- **Address**: Vanitha Logistics, Vijayawada, Andhra Pradesh, India
