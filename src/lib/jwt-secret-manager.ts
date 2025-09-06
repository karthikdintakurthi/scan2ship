/**
 * JWT Secret Manager
 * Handles JWT secret rotation and management for enhanced security
 */

import crypto from 'crypto';
import { prisma } from './prisma';

export interface JWTSecret {
  id: string;
  secret: string;
  isActive: boolean;
  createdAt: Date;
  expiresAt: Date;
  description: string;
}

export interface SecretRotationConfig {
  maxActiveSecrets: number;
  rotationIntervalDays: number;
  secretLifetimeDays: number;
  autoRotation: boolean;
}

export class JWTSecretManager {
  private static instance: JWTSecretManager;
  private secrets: JWTSecret[] = [];
  private config: SecretRotationConfig = {
    maxActiveSecrets: 3,
    rotationIntervalDays: 30,
    secretLifetimeDays: 90,
    autoRotation: true
  };

  private constructor() {}

  static getInstance(): JWTSecretManager {
    if (!JWTSecretManager.instance) {
      JWTSecretManager.instance = new JWTSecretManager();
    }
    return JWTSecretManager.instance;
  }

  /**
   * Initialize the secret manager
   */
  async initialize(): Promise<void> {
    try {
      await this.loadSecretsFromDatabase();
      await this.performMaintenance();
    } catch (error) {
      console.error('Failed to initialize JWT secret manager:', error);
      throw error;
    }
  }

  /**
   * Get the primary active secret
   */
  getPrimarySecret(): string {
    // Auto-initialize if not already initialized
    if (this.secrets.length === 0) {
      console.log('🔄 Auto-initializing JWT secret manager...');
      this.initialize().catch(error => {
        console.error('❌ Auto-initialization failed:', error);
        throw error;
      });
      
      // For immediate use, try to load from environment
      const primarySecret = process.env.JWT_SECRET;
      if (!primarySecret) {
        throw new Error('JWT_SECRET environment variable is required');
      }
      
      // Create a temporary secret entry
      this.secrets = [{
        id: 'temp-primary',
        secret: primarySecret,
        isActive: true,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        description: 'Temporary JWT secret from environment'
      }];
      
      console.log('✅ JWT secret manager auto-initialized');
    }
    
    const primarySecret = this.secrets.find(s => s.isActive);
    if (!primarySecret) {
      throw new Error('No active JWT secret available');
    }
    return primarySecret.secret;
  }

  /**
   * Get all active secrets for verification
   */
  getActiveSecrets(): string[] {
    // Auto-initialize if not already initialized
    if (this.secrets.length === 0) {
      console.log('🔄 Auto-initializing JWT secret manager...');
      this.initialize().catch(error => {
        console.error('❌ Auto-initialization failed:', error);
        throw error;
      });
      
      // For immediate use, try to load from environment
      const primarySecret = process.env.JWT_SECRET;
      if (!primarySecret) {
        throw new Error('JWT_SECRET environment variable is required');
      }
      
      // Create a temporary secret entry
      this.secrets = [{
        id: 'temp-primary',
        secret: primarySecret,
        isActive: true,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        description: 'Temporary JWT secret from environment'
      }];
      
      console.log('✅ JWT secret manager auto-initialized');
    }
    
    return this.secrets
      .filter(s => s.isActive)
      .map(s => s.secret);
  }

  /**
   * Generate a new JWT secret
   */
  private generateSecret(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Create a new JWT secret
   */
  async createSecret(description: string = 'Auto-generated secret'): Promise<JWTSecret> {
    const secret: JWTSecret = {
      id: crypto.randomUUID(),
      secret: this.generateSecret(),
      isActive: true,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + this.config.secretLifetimeDays * 24 * 60 * 60 * 1000),
      description
    };

    // Store in database
    await this.storeSecretInDatabase(secret);
    
    // Add to local cache
    this.secrets.push(secret);
    
    return secret;
  }

  /**
   * Rotate JWT secrets
   */
  async rotateSecrets(): Promise<void> {
    try {
      console.log('🔄 Starting JWT secret rotation...');

      // Create new secret
      const newSecret = await this.createSecret('Rotated secret');
      console.log('✅ New JWT secret created');

      // Deactivate old secrets that are expired
      const now = new Date();
      for (const secret of this.secrets) {
        if (secret.expiresAt < now && secret.isActive) {
          await this.deactivateSecret(secret.id);
          console.log(`🔄 Deactivated expired secret: ${secret.id}`);
        }
      }

      // Ensure we don't have too many active secrets
      const activeSecrets = this.secrets.filter(s => s.isActive);
      if (activeSecrets.length > this.config.maxActiveSecrets) {
        const oldestActive = activeSecrets
          .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())[0];
        
        await this.deactivateSecret(oldestActive.id);
        console.log(`🔄 Deactivated oldest secret to maintain limit: ${oldestActive.id}`);
      }

      console.log('✅ JWT secret rotation completed');
    } catch (error) {
      console.error('❌ JWT secret rotation failed:', error);
      throw error;
    }
  }

  /**
   * Deactivate a specific secret
   */
  async deactivateSecret(secretId: string): Promise<void> {
    const secret = this.secrets.find(s => s.id === secretId);
    if (secret) {
      secret.isActive = false;
      await this.updateSecretInDatabase(secret);
    }
  }

  /**
   * Verify JWT token against all active secrets
   */
  verifyToken(token: string): { success: boolean; secretId?: string; error?: string } {
    const activeSecrets = this.getActiveSecrets();
    
    for (const secret of activeSecrets) {
      try {
        const jwt = require('jsonwebtoken');
        jwt.verify(token, secret);
        return { success: true, secretId: this.secrets.find(s => s.secret === secret)?.id };
      } catch (error) {
        // Continue to next secret
      }
    }
    
    return { success: false, error: 'Token verification failed against all active secrets' };
  }

  /**
   * Load secrets from database
   */
  private async loadSecretsFromDatabase(): Promise<void> {
    try {
      // For now, we'll use environment variables
      // In a production system, you'd store these in a secure database
      const primarySecret = process.env.JWT_SECRET;
      if (!primarySecret) {
        throw new Error('JWT_SECRET environment variable is required');
      }

      this.secrets = [{
        id: 'primary',
        secret: primarySecret,
        isActive: true,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
        description: 'Primary JWT secret from environment'
      }];

      console.log('✅ JWT secrets loaded from environment');
    } catch (error) {
      console.error('❌ Failed to load JWT secrets:', error);
      throw error;
    }
  }

  /**
   * Store secret in database (placeholder for production)
   */
  private async storeSecretInDatabase(secret: JWTSecret): Promise<void> {
    // In production, implement secure database storage
    // For now, we'll just log it
    console.log(`📝 Storing new JWT secret: ${secret.id}`);
  }

  /**
   * Update secret in database (placeholder for production)
   */
  private async updateSecretInDatabase(secret: JWTSecret): Promise<void> {
    // In production, implement secure database storage
    console.log(`📝 Updating JWT secret: ${secret.id}`);
  }

  /**
   * Perform maintenance tasks
   */
  private async performMaintenance(): Promise<void> {
    try {
      const now = new Date();
      
      // Check if rotation is needed
      const oldestActive = this.secrets
        .filter(s => s.isActive)
        .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())[0];

      if (oldestActive) {
        const daysSinceCreation = (now.getTime() - oldestActive.createdAt.getTime()) / (1000 * 60 * 60 * 24);
        
        if (daysSinceCreation >= this.config.rotationIntervalDays) {
          console.log('🔄 Automatic secret rotation needed');
          if (this.config.autoRotation) {
            await this.rotateSecrets();
          }
        }
      }

      // Clean up expired secrets
      this.secrets = this.secrets.filter(s => s.expiresAt > now);
      
    } catch (error) {
      console.error('❌ Secret maintenance failed:', error);
    }
  }

  /**
   * Get secret statistics
   */
  getSecretStats(): {
    totalSecrets: number;
    activeSecrets: number;
    expiredSecrets: number;
    nextRotationDays: number;
  } {
    const now = new Date();
    const activeSecrets = this.secrets.filter(s => s.isActive);
    const expiredSecrets = this.secrets.filter(s => s.expiresAt < now);
    
    const oldestActive = activeSecrets
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())[0];
    
    const nextRotationDays = oldestActive 
      ? Math.ceil((this.config.rotationIntervalDays - (now.getTime() - oldestActive.createdAt.getTime()) / (1000 * 60 * 60 * 24)))
      : 0;

    return {
      totalSecrets: this.secrets.length,
      activeSecrets: activeSecrets.length,
      expiredSecrets: expiredSecrets.length,
      nextRotationDays: Math.max(0, nextRotationDays)
    };
  }
}

// Export singleton instance
export const jwtSecretManager = JWTSecretManager.getInstance();
