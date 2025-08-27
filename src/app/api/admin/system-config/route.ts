import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

// Encryption key for sensitive data (in production, use a proper key management system)
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'vanitha-logistics-encryption-key-2024';

// Helper function to encrypt sensitive data
function encrypt(text: string): string {
  const cipher = crypto.createCipher('aes-256-cbc', ENCRYPTION_KEY);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return encrypted;
}

// Helper function to decrypt sensitive data
function decrypt(encryptedText: string): string {
  const decipher = crypto.createDecipher('aes-256-cbc', ENCRYPTION_KEY);
  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

// Helper function to get authenticated admin user
async function getAuthenticatedAdmin(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret') as any;
    
    // Get user and client data from database
    const user = await prisma.users.findUnique({
      where: { id: decoded.userId },
      include: {
        client: true
      }
    });

    if (!user || !user.isActive || (user.role !== 'admin' && user.role !== 'master_admin')) {
      return null;
    }

    return {
      user: user,
      client: user.client
    };
  } catch (error) {
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    // Authenticate admin user
    const auth = await getAuthenticatedAdmin(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('📊 [API_ADMIN_SYSTEM_CONFIG_GET] Fetching system configuration from database');

    // Get all system configurations from database
    const configs = await prisma.system_config.findMany({
      orderBy: [
        { category: 'asc' },
        { key: 'asc' }
      ]
    });

    // Process configurations and decrypt sensitive data
    const processedConfigs = configs.map(config => {
      let displayValue = config.value;
      
      // For encrypted fields, show masked value
      if (config.isEncrypted && config.value) {
        if (config.type === 'password') {
          displayValue = '••••••••••••••••';
        } else {
          displayValue = '***ENCRYPTED***';
        }
      }
      
      return {
        id: config.id,
        key: config.key,
        value: config.value, // Keep original value for editing
        displayValue: displayValue, // Masked value for display
        type: config.type,
        category: config.category,
        description: config.description,
        isEncrypted: config.isEncrypted
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

    console.log('✅ [API_ADMIN_SYSTEM_CONFIG_GET] System configuration retrieved from database');

    return NextResponse.json({
      configs: processedConfigs,
      configByCategory,
      total: configs.length
    });

  } catch (error) {
    console.error('❌ [API_ADMIN_SYSTEM_CONFIG_GET] Error fetching system config:', error);
    return NextResponse.json(
      { error: 'Failed to fetch system configuration' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Authenticate admin user
    const auth = await getAuthenticatedAdmin(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
