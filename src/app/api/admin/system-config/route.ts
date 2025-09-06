import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { applySecurityMiddleware, securityHeaders } from '@/lib/security-middleware';
import { authorizeUser, UserRole, PermissionLevel } from '@/lib/auth-middleware';
import crypto from 'crypto';

// Encryption key for sensitive data (SECURITY: No fallback key for security)
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;

if (!ENCRYPTION_KEY) {
  throw new Error('ENCRYPTION_KEY environment variable is required for security');
}

// Helper function to encrypt sensitive data with proper IV
function encrypt(text: string): string {
  // Generate a random IV for each encryption
  const iv = crypto.randomBytes(16);
  
  // Create cipher with IV
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  // Prepend IV to encrypted data
  return iv.toString('hex') + ':' + encrypted;
}

// Helper function to decrypt sensitive data with proper IV
function decrypt(encryptedText: string): string {
  try {
    // Split IV and encrypted data
    const parts = encryptedText.split(':');
    if (parts.length !== 2) {
      throw new Error('Invalid encrypted data format');
    }
    
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];
    
    // Create decipher with IV
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('❌ Error decrypting value:', error);
    throw new Error('Failed to decrypt sensitive data - encryption key may be invalid');
  }
}

// Helper function to mask sensitive values
function maskSensitiveValue(value: string, type: string, isEncrypted: boolean): string {
  if (!value) return '';
  
  if (isEncrypted) {
    return '••••••••••••••••';
  }
  
  // Mask sensitive keys based on their names
  const sensitiveKeys = [
    'API_KEY', 'SECRET', 'PASSWORD', 'TOKEN', 'KEY', 'CREDENTIAL'
  ];
  
  const isSensitive = sensitiveKeys.some(key => 
    value.toUpperCase().includes(key)
  );
  
  if (isSensitive) {
    if (type === 'password') {
      return '••••••••••••••••';
    } else {
      return `${value.substring(0, 4)}••••••••••••••••${value.substring(value.length - 4)}`;
    }
  }
  
  return value;
}

export async function GET(request: NextRequest) {
  try {
    // Apply security middleware
    const securityResponse = await applySecurityMiddleware(
      request,
      new NextResponse(),
      { rateLimit: 'api', cors: true, securityHeaders: true }
    );
    
    if (securityResponse) {
      securityHeaders(securityResponse);
      return securityResponse;
    }

    // Authorize admin user
    const authResult = await authorizeUser(request, {
      requiredRole: UserRole.ADMIN,
      requiredPermissions: [PermissionLevel.ADMIN],
      requireActiveUser: true,
      requireActiveClient: false  // System config should be accessible regardless of client status
    });

    if (authResult.response) {
      securityHeaders(authResult.response);
      return authResult.response;
    }

    console.log('📊 [API_ADMIN_SYSTEM_CONFIG_GET] Fetching system configuration from database');

    // Get all system configurations from database
    const configs = await prisma.system_config.findMany({
      orderBy: [
        { category: 'asc' },
        { key: 'asc' }
      ]
    });

    // Process configurations and mask sensitive data
    const processedConfigs = configs.map(config => {
      const displayValue = maskSensitiveValue(config.value, config.type, config.isEncrypted);
      
      return {
        id: config.id,
        key: config.key,
        // NEVER expose actual values to the client
        value: null, // Remove actual values for security
        displayValue: displayValue, // Masked value for display
        type: config.type,
        category: config.category,
        description: config.description,
        isEncrypted: config.isEncrypted,
        // Add security metadata
        isSensitive: config.isEncrypted || config.key.toUpperCase().includes('API_KEY') || 
                    config.key.toUpperCase().includes('SECRET') || 
                    config.key.toUpperCase().includes('PASSWORD')
      };
    });

    // Group configurations by category
    const configByCategory = processedConfigs.reduce((acc, config) => {
      if (!acc[config.category]) {
        acc[config.category] = [];
      }
      acc[config.category].push(config);
      return acc;
    }, {} as Record<string, any[]>);

    console.log('✅ [API_ADMIN_SYSTEM_CONFIG_GET] System configuration retrieved from database (sensitive data masked)');

    const response = NextResponse.json({
      configs: processedConfigs,
      configByCategory,
      total: configs.length,
      security: {
        sensitiveDataMasked: true,
        actualValuesNotExposed: true,
        timestamp: new Date().toISOString()
      }
    });
    
    securityHeaders(response);
    return response;

  } catch (error) {
    console.error('❌ [API_ADMIN_SYSTEM_CONFIG_GET] Error fetching system config:', error);
    const response = NextResponse.json(
      { error: 'Failed to fetch system configuration' },
      { status: 500 }
    );
    securityHeaders(response);
    return response;
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 [API_ADMIN_SYSTEM_CONFIG_POST] Starting request...');
    
    // Apply security middleware
    const securityResponse = await applySecurityMiddleware(
      request,
      new NextResponse(),
      { rateLimit: 'api', cors: true, securityHeaders: true }
    );
    
    if (securityResponse) {
      securityHeaders(securityResponse);
      return securityResponse;
    }

    // Authorize admin user
    const authResult = await authorizeUser(request, {
      requiredRole: UserRole.ADMIN,
      requiredPermissions: [PermissionLevel.ADMIN],
      requireActiveUser: true,
      requireActiveClient: false  // System config should be accessible regardless of client status
    });

    if (authResult.response) {
      securityHeaders(authResult.response);
      return authResult.response;
    }

    const createData = await request.json();
    const { configs } = createData;

    console.log('📝 [API_ADMIN_SYSTEM_CONFIG_POST] Creating/updating system configuration in database');
    console.log('📝 [API_ADMIN_SYSTEM_CONFIG_POST] Received data:', JSON.stringify(createData, null, 2));

    // Create or update each configuration
    const upsertPromises = configs.map(async (config: any) => {
      const configId = `config-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      return prisma.system_config.upsert({
        where: { key: config.key },
        update: {
          value: config.value,
          category: config.category,
          type: config.type,
          description: config.description,
          isEncrypted: false,
          updatedAt: new Date()
        },
        create: {
          id: configId,
          key: config.key,
          value: config.value,
          category: config.category,
          type: config.type,
          description: config.description,
          isEncrypted: false,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
    });

    await Promise.all(upsertPromises);

    console.log('✅ [API_ADMIN_SYSTEM_CONFIG_POST] System configuration created/updated in database');

    return NextResponse.json({
      message: 'System configuration saved successfully',
      savedCount: configs.length
    });

  } catch (error) {
    console.error('❌ [API_ADMIN_SYSTEM_CONFIG_POST] Error saving system config:', error);
    return NextResponse.json(
      { error: 'Failed to save system configuration' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    console.log('🚀 [API_ADMIN_SYSTEM_CONFIG_PUT] Starting request...');
    
    // Apply security middleware
    const securityResponse = await applySecurityMiddleware(
      request,
      new NextResponse(),
      { rateLimit: 'api', cors: true, securityHeaders: true }
    );
    
    if (securityResponse) {
      securityHeaders(securityResponse);
      return securityResponse;
    }

    // Authorize admin user
    const authResult = await authorizeUser(request, {
      requiredRole: UserRole.ADMIN,
      requiredPermissions: [PermissionLevel.ADMIN],
      requireActiveUser: true,
      requireActiveClient: false  // System config should be accessible regardless of client status
    });

    if (authResult.response) {
      securityHeaders(authResult.response);
      return authResult.response;
    }

    const updateData = await request.json();
    const { configs } = updateData;

    console.log('📝 [API_ADMIN_SYSTEM_CONFIG_PUT] Updating system configuration in database');

    // Update each configuration
    const updatePromises = configs.map(async (config: any) => {
      let valueToStore = config.value;
      
      // Don't encrypt any keys - store as plain text
      // if (config.isEncrypted && config.value && !config.value.startsWith('••••••••••••••••')) {
      //   valueToStore = encrypt(config.value);
      // }
      
      return prisma.system_config.update({
        where: { id: config.id },
        data: {
          value: valueToStore,
          isEncrypted: false, // Don't encrypt any keys
          updatedAt: new Date()
        }
      });
    });

    await Promise.all(updatePromises);

    console.log('✅ [API_ADMIN_SYSTEM_CONFIG_PUT] System configuration updated in database');

    return NextResponse.json({
      message: 'System configuration updated successfully',
      updatedCount: configs.length
    });

  } catch (error) {
    console.error('❌ [API_ADMIN_SYSTEM_CONFIG_PUT] Error updating system config:', error);
    return NextResponse.json(
      { error: 'Failed to update system configuration' },
      { status: 500 }
    );
  }
}
