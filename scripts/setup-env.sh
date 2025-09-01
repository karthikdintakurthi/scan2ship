#!/bin/bash

# Environment Setup Script for Vanitha Logistics
# This script helps set up your .env.local file with secure secrets

echo "🔒 Setting up secure environment variables for Vanitha Logistics..."
echo ""

# Check if .env.local exists
if [ -f ".env.local" ]; then
    echo "⚠️  .env.local already exists. Backing up to .env.local.backup"
    cp .env.local .env.local.backup
fi

# Generate strong secrets
echo "🔐 Generating cryptographically secure secrets..."
JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
ENCRYPTION_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")

echo "✅ JWT_SECRET generated: ${JWT_SECRET:0:16}..."
echo "✅ ENCRYPTION_KEY generated: ${ENCRYPTION_KEY:0:16}..."
echo ""

# Create .env.local with secure values
echo "📝 Creating .env.local with secure configuration..."

cat > .env.local << EOF
# ========================================
# VANITHA LOGISTICS - ENVIRONMENT CONFIGURATION
# ========================================
# This file contains your actual environment variables
# DO NOT commit this file to version control

# Database Configuration
DATABASE_URL="postgresql://karthiknaidudintakurthi@localhost:5432/vanitha-logistics"

# Authentication & Security
JWT_SECRET="${JWT_SECRET}"
ENCRYPTION_KEY="${ENCRYPTION_KEY}"

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
FAST2SMS_WHATSAPP_MESSAGE_ID="your_message_id_here"

# File Upload Configuration
MAX_FILE_SIZE="5242880"  # 5MB in bytes
ALLOWED_FILE_TYPES="image/jpeg,image/png,image/gif"

# Rate Limiting
RATE_LIMIT_WINDOW="900000"  # 15 minutes in milliseconds
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
echo "🔍 Next steps:"
echo "1. Review the generated .env.local file"
echo "2. Fill in any missing API keys (OpenAI, WhatsApp, etc.)"
echo "3. Run: npm run validate-env"
echo "4. Test the application: npm run build && npm start"
echo ""
echo "⚠️  IMPORTANT: Never commit .env.local to version control!"
echo "   It contains sensitive secrets that should remain private."
