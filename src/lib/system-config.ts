import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

// Encryption key for sensitive data - must be set in environment
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;

// Validate encryption key is present
if (!ENCRYPTION_KEY) {
  throw new Error('ENCRYPTION_KEY environment variable is required for secure operation');
}

// Validate encryption key length (minimum 32 characters for AES-256)
if (ENCRYPTION_KEY.length < 32) {
  throw new Error('ENCRYPTION_KEY must be at least 32 characters long for AES-256 encryption');
}

// Cache for system configurations
let configCache: Map<string, { value: string; timestamp: number }> = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Helper function to encrypt sensitive data with proper IV
function encrypt(text: string): string {
  if (!ENCRYPTION_KEY) {
    throw new Error('Encryption key not available');
  }
  
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
  if (!ENCRYPTION_KEY) {
    throw new Error('Encryption key not available');
  }
  
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

// Get a system configuration value
export async function getSystemConfig(key: string): Promise<string | null> {
  try {
    // Check cache first
    const cached = configCache.get(key);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.value;
    }

    // Get from database
    const config = await prisma.system_config.findUnique({
      where: { key }
    });

    if (!config) {
      return null;
    }

    let value = config.value;

    // Decrypt if needed
    if (config.isEncrypted && config.value) {
      value = decrypt(config.value);
    }

    // Cache the result
    configCache.set(key, {
      value,
      timestamp: Date.now()
    });

    return value;
  } catch (error) {
    console.error(`❌ Error getting system config for key ${key}:`, error);
    return null;
  }
}

// Get multiple system configurations
export async function getSystemConfigs(keys: string[]): Promise<Record<string, string | null>> {
  try {
    const configs = await prisma.system_config.findMany({
      where: {
        key: {
          in: keys
        }
      }
    });

    const result: Record<string, string | null> = {};

    for (const key of keys) {
      const config = configs.find(c => c.key === key);
      
      if (!config) {
        result[key] = null;
        continue;
      }

      let value = config.value;

      // Decrypt if needed
      if (config.isEncrypted && config.value) {
        value = decrypt(config.value);
      }

      result[key] = value;

      // Cache the result
      configCache.set(key, {
        value,
        timestamp: Date.now()
      });
    }

    return result;
  } catch (error) {
    console.error('❌ Error getting multiple system configs:', error);
    return keys.reduce((acc, key) => ({ ...acc, [key]: null }), {});
  }
}

// Get all configurations by category
export async function getSystemConfigsByCategory(category: string): Promise<Record<string, string>> {
  try {
    const configs = await prisma.system_config.findMany({
      where: { category },
      orderBy: { key: 'asc' }
    });

    const result: Record<string, string> = {};

    for (const config of configs) {
      let value = config.value;

      // Decrypt if needed
      if (config.isEncrypted && config.value) {
        value = decrypt(config.value);
      }

      result[config.key] = value;

      // Cache the result
      configCache.set(config.key, {
        value,
        timestamp: Date.now()
      });
    }

    return result;
  } catch (error) {
    console.error(`❌ Error getting system configs for category ${category}:`, error);
    return {};
  }
}

// Update a system configuration
export async function updateSystemConfig(key: string, value: string): Promise<boolean> {
  try {
    const config = await prisma.system_config.findUnique({
      where: { key }
    });

    if (!config) {
      return false;
    }

    let valueToStore = value;

    // Encrypt if needed
    if (config.isEncrypted) {
      valueToStore = encrypt(value);
    }

    await prisma.system_config.update({
      where: { key },
      data: {
        value: valueToStore,
        updatedAt: new Date()
      }
    });

    // Update cache
    configCache.set(key, {
      value,
      timestamp: Date.now()
    });

    return true;
  } catch (error) {
    console.error(`❌ Error updating system config for key ${key}:`, error);
    return false;
  }
}

// Clear the configuration cache
export function clearConfigCache(): void {
  configCache.clear();
}

// Get all system configurations (for admin interface)
export async function getAllSystemConfigs() {
  try {
    const configs = await prisma.system_config.findMany({
      orderBy: [
        { category: 'asc' },
        { key: 'asc' }
      ]
    });

    return configs.map(config => ({
      id: config.id,
      key: config.key,
      value: config.value,
      type: config.type,
      category: config.category,
      description: config.description,
      isEncrypted: config.isEncrypted,
      createdAt: config.createdAt,
      updatedAt: config.updatedAt
    }));
  } catch (error) {
    console.error('❌ Error getting all system configs:', error);
    return [];
  }
}

// Predefined configuration getters for common use cases


export async function getCourierConfig() {
  return getSystemConfigsByCategory('courier');
}

export async function getAIConfig() {
  return getSystemConfigsByCategory('ai');
}

export async function getEmailConfig() {
  return getSystemConfigsByCategory('email');
}

export async function getSecurityConfig() {
  return getSystemConfigsByCategory('security');
}

export async function getGeneralConfig() {
  return getSystemConfigsByCategory('general');
}
