import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

// Encryption key for sensitive data
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'vanitha-logistics-encryption-key-2024';

// Cache for system configurations
let configCache: Map<string, { value: string; timestamp: number }> = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Helper function to encrypt sensitive data
function encrypt(text: string): string {
  const cipher = crypto.createCipher('aes-256-cbc', ENCRYPTION_KEY);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return encrypted;
}

// Helper function to decrypt sensitive data
function decrypt(encryptedText: string): string {
  try {
    const decipher = crypto.createDecipher('aes-256-cbc', ENCRYPTION_KEY);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    console.error('❌ Error decrypting value:', error);
    return encryptedText; // Return original if decryption fails
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
    const config = await prisma.systemConfig.findUnique({
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
    const configs = await prisma.systemConfig.findMany({
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
    const configs = await prisma.systemConfig.findMany({
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
    const config = await prisma.systemConfig.findUnique({
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

    await prisma.systemConfig.update({
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
    const configs = await prisma.systemConfig.findMany({
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
