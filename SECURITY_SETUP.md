# Security Setup Guide

## Overview
This document outlines the security measures implemented in the Vanitha Logistics application and provides instructions for secure deployment.

## Critical Security Changes Made

### 1. Removed Hardcoded Secrets
- ❌ Removed `'fallback-secret'` from JWT verification
- ❌ Removed `'vanitha-logistics-encryption-key-2024'` from encryption
- ❌ Updated environment template with proper placeholders

### 2. Implemented Secure JWT Configuration
- ✅ Centralized JWT configuration in `src/lib/jwt-config.ts`
- ✅ Environment variable validation with minimum length requirements
- ✅ Weak secret detection and prevention
- ✅ Reduced token expiry from 24h to 8h for better security
- ✅ Added issuer and audience validation

### 3. Enhanced Encryption Security
- ✅ Removed hardcoded encryption key fallbacks
- ✅ Environment variable validation for encryption keys
- ✅ Minimum 32-character requirement for AES-256 encryption
- ✅ Proper error handling for missing encryption keys

## Environment Variables Required

### Critical (Application will not start without these)
```bash
# JWT Secret - Must be at least 32 characters
JWT_SECRET="your-super-secure-jwt-secret-key-here-minimum-32-characters"

# Encryption Key - Must be at least 32 characters
ENCRYPTION_KEY="your-super-secure-encryption-key-here-minimum-32-characters"

# Database Connection
DATABASE_URL="postgresql://username:password@localhost:5432/database_name"
```

### Important (Features may not work without these)
```bash
# OpenAI API for AI features
OPENAI_API_KEY="your_openai_api_key_here"

# WhatsApp API
FAST2SMS_WHATSAPP_API_KEY="your_fast2sms_whatsapp_api_key_here"
FAST2SMS_WHATSAPP_MESSAGE_ID="your_message_id_here"
```

## Security Validation

### Pre-flight Checks
Before starting the application, run:
```bash
npm run validate-env
```

This will:
- ✅ Validate all required environment variables
- ✅ Check for weak/commonly used secrets
- ✅ Ensure minimum length requirements
- ✅ Validate production vs development settings

### Automatic Validation
The application now includes:
- ✅ Environment validation on startup
- ✅ JWT secret validation
- ✅ Encryption key validation
- ✅ Weak secret detection

## Security Features Implemented

### 1. JWT Security
- **Algorithm**: HS256 (HMAC with SHA-256)
- **Expiry**: 8 hours (reduced from 24h)
- **Issuer/Audience**: Validated on verification
- **Secret**: Minimum 32 characters, weak value detection

### 2. Encryption Security
- **Algorithm**: AES-256-CBC
- **Key Length**: Minimum 32 characters
- **Validation**: Environment variable required
- **Error Handling**: Proper error messages for missing keys

### 3. Input Validation
- **Password Policy**: 12+ characters, complexity requirements
- **Input Sanitization**: HTML tag removal, length limits
- **JWT Format**: Basic token structure validation

### 4. Session Management
- **Concurrent Sessions**: Maximum 3 per user
- **Idle Timeout**: 30 minutes
- **Absolute Timeout**: 8 hours
- **Automatic Cleanup**: Expired session removal

## Deployment Checklist

### Development
- [ ] Copy `env-template.env` to `.env.local`
- [ ] Fill in all required environment variables
- [ ] Use strong, unique secrets (32+ characters)
- [ ] Run `npm run validate-env` to verify
- [ ] Test application startup

### Production
- [ ] Set `NODE_ENV=production`
- [ ] Use strong, unique secrets (32+ characters)
- [ ] Remove `DEBUG` environment variable
- [ ] Set `NEXT_TELEMETRY_DISABLED=1`
- [ ] Run `npm run validate-env` to verify
- [ ] Test application startup
- [ ] Monitor security logs

## Security Best Practices

### 1. Secret Management
- Never commit secrets to version control
- Use environment variables for all secrets
- Rotate secrets regularly (recommended: every 90 days)
- Use different secrets for different environments

### 2. Password Policy
- Minimum 12 characters
- Require uppercase, lowercase, numbers, special characters
- Enforce password expiration (90 days)
- Implement account lockout after failed attempts

### 3. API Security
- Implement rate limiting
- Validate all inputs
- Use HTTPS in production
- Implement proper CORS policies

### 4. Monitoring
- Log all authentication attempts
- Monitor for suspicious activity
- Regular security audits
- Keep dependencies updated

## Troubleshooting

### Common Issues

#### 1. "JWT_SECRET environment variable is required"
**Solution**: Set the `JWT_SECRET` environment variable with a strong secret (32+ characters)

#### 2. "ENCRYPTION_KEY environment variable is required"
**Solution**: Set the `ENCRYPTION_KEY` environment variable with a strong key (32+ characters)

#### 3. "JWT_SECRET must be at least 32 characters long"
**Solution**: Use a longer, more complex secret

#### 4. "JWT_SECRET cannot use common weak values"
**Solution**: Use a unique, strong secret instead of common values

### Validation Commands
```bash
# Validate environment variables
npm run validate-env

# Check if application can start
npm run build
npm start
```

## Security Contacts

For security issues or questions:
- **Security Team**: security@vanithalogistics.com
- **Emergency**: +91-XXXXXXXXXX
- **Bug Reports**: Use GitHub Issues with "Security" label

## Updates

This security setup guide will be updated as new security features are implemented. Check back regularly for updates.

---

**Last Updated**: December 2024  
**Version**: 1.0  
**Security Level**: Enhanced
