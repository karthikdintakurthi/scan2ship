# 🔒 Security Configuration Guide

This guide explains how to properly configure the security settings for the Scan2Ship application after the security audit fixes.

## 🚨 Critical Security Variables

After the security audit, the following environment variables are now **REQUIRED** for the application to function securely:

### 1. **ENCRYPTION_KEY** (Required)
```bash
ENCRYPTION_KEY="your_secure_encryption_key_here"
```
- **Purpose**: Encrypts sensitive data in the database
- **Requirements**: 
  - Must be at least 32 characters long
  - Use a cryptographically secure random string
  - Never use default or predictable values
- **Generate**: `openssl rand -hex 32`

### 2. **NEXT_PUBLIC_APP_PASSWORD** (Required)
```bash
NEXT_PUBLIC_APP_PASSWORD="your_secure_app_password_here"
```
- **Purpose**: Password for the application access screen
- **Requirements**:
  - Must be at least 12 characters long
  - Include uppercase, lowercase, numbers, and special characters
  - Never use default passwords like "scan2ship"

### 3. **NEXT_PUBLIC_UPI_ID** (Required)
```bash
NEXT_PUBLIC_UPI_ID="your_upi_id_here"
```
- **Purpose**: UPI ID for payment processing
- **Example**: `"scan2ship@ybl"`

### 4. **NEXT_PUBLIC_PAYEE_NAME** (Required)
```bash
NEXT_PUBLIC_PAYEE_NAME="your_payee_name_here"
```
- **Purpose**: Payee name for payment processing
- **Example**: `"Scan2Ship"`

## 🔐 Existing Security Variables

These variables were already in place and should remain secure:

### JWT_SECRET
```bash
JWT_SECRET="your_jwt_secret_here"
```
- **Purpose**: Signs and verifies JWT tokens
- **Requirements**: At least 32 characters, cryptographically secure

### Database Security
```bash
DATABASE_URL="postgresql://user:password@host:port/database"
```
- **Purpose**: Database connection string
- **Security**: Use strong passwords and restrict database access

## 🛠️ Setup Instructions

### 1. **Copy Environment Template**
```bash
cp env-template.env .env.local
```

### 2. **Generate Secure Keys**
```bash
# Generate encryption key
openssl rand -hex 32

# Generate JWT secret
openssl rand -hex 32

# Generate app password (use a password manager)
# Example: MySecureApp2024!@#
```

### 3. **Update .env.local**
Replace the placeholder values in `.env.local` with your generated secure values:

```bash
# Authentication & Security
JWT_SECRET="your_generated_jwt_secret_here"
ENCRYPTION_KEY="your_generated_encryption_key_here"

# Application Security
NEXT_PUBLIC_APP_PASSWORD="your_secure_app_password_here"
NEXT_PUBLIC_UPI_ID="your_upi_id_here"
NEXT_PUBLIC_PAYEE_NAME="your_payee_name_here"
```

### 4. **Verify Configuration**
```bash
# Check if all required variables are set
npm run validate-env
```

## 🔍 Security Checklist

- [ ] All hardcoded secrets removed from code
- [ ] Environment variables properly configured
- [ ] Strong passwords generated
- [ ] Encryption key is cryptographically secure
- [ ] JWT secret is unique and secure
- [ ] Database credentials are secure
- [ ] API keys are properly managed
- [ ] No sensitive data in version control

## 🚫 What NOT to Do

- ❌ Never commit `.env.local` to version control
- ❌ Never use default or predictable passwords
- ❌ Never share environment variables in plain text
- ❌ Never use the same password for multiple purposes
- ❌ Never use short or simple encryption keys

## 🔄 Regular Security Maintenance

### Monthly
- [ ] Rotate JWT secrets
- [ ] Review API key permissions
- [ ] Check for security updates

### Quarterly
- [ ] Rotate encryption keys (requires data migration)
- [ ] Review user access permissions
- [ ] Update security policies

### Annually
- [ ] Full security audit
- [ ] Penetration testing
- [ ] Security training for team

## 📞 Support

If you encounter issues with security configuration:

1. Check the application logs for missing environment variables
2. Verify all required variables are set in `.env.local`
3. Ensure no typos in variable names
4. Contact the development team for assistance

## 🔗 Additional Resources

- [Next.js Environment Variables](https://nextjs.org/docs/basic-features/environment-variables)
- [OWASP Security Guidelines](https://owasp.org/www-project-top-ten/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)

---
*This guide should be reviewed and updated regularly as security requirements evolve.*
