#!/bin/bash

# Vanitha Logistics Environment Setup Script
echo "🚀 Setting up Vanitha Logistics Environment Variables..."

# Check if .env.local exists
if [ -f ".env.local" ]; then
    echo "⚠️  .env.local already exists. Backing up to .env.local.backup"
    cp .env.local .env.local.backup
fi

# Create new .env.local with current values
cat > .env.local << 'EOF'
# ========================================
# VANITHA LOGISTICS - ENVIRONMENT CONFIG
# ========================================

# Database Configuration
DATABASE_URL="postgresql://karthiknaidudintakurthi@localhost:5432/vanitha-logistics"

# Authentication & Security
JWT_SECRET="vanitha-logistics-super-secret-jwt-key-2024"

# Application Configuration
NODE_ENV="development"
NEXT_PUBLIC_APP_NAME="Vanitha Logistics - Accelerate Your Logistics"
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Delhivery API Configuration
# Note: DELHIVERY_API_KEY is now managed at client level through pickup locations
DELHIVERY_BASE_URL="https://track.delhivery.com"
DELHIVERY_WEBHOOK_SECRET="your_delhivery_webhook_secret_here"

# OpenAI API Configuration (for address processing)
OPENAI_API_KEY="your_openai_api_key_here"
OPENAI_MODEL="gpt-4o-mini"

# Fast2SMS WhatsApp API Configuration
FAST2SMS_WHATSAPP_API_KEY="your_fast2sms_whatsapp_api_key_here"
FAST2SMS_WHATSAPP_MESSAGE_ID="4697"

# Note: Google Cloud configuration removed as it's no longer needed

# Note: Email configuration removed as it's no longer needed

# File Upload Configuration
MAX_FILE_SIZE="5242880"
ALLOWED_FILE_TYPES="image/jpeg,image/png,image/gif"

# Rate Limiting
RATE_LIMIT_WINDOW="900000"
RATE_LIMIT_MAX_REQUESTS="100"

# Logging Configuration
LOG_LEVEL="info"
LOG_FILE_PATH="./logs/app.log"

# Development Tools
NEXT_TELEMETRY_DISABLED="1"
DEBUG="app:*"
EOF

echo "✅ .env.local created successfully!"
echo ""
echo "🔑 IMPORTANT: You need to update the following keys with your actual values:"
echo "   - Note: DELHIVERY_API_KEY is now managed at client level through pickup locations"
echo "   - OPENAI_API_KEY: Get from OpenAI platform"
echo "   - SMTP_USER/SMTP_PASS: Your email credentials (if using email features)"
echo ""
echo "📝 Edit .env.local to add your actual API keys"
echo "🚀 Restart your development server after updating the keys"
