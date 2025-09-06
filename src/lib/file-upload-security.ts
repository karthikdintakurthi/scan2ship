/**
 * Enhanced File Upload Security System
 * Provides comprehensive file validation and security measures
 */

import { securityConfig } from './security-config';
import { logAuditEvent, AuditEventType } from './audit-logger';
import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';

interface FileValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  fileInfo: {
    originalName: string;
    sanitizedName: string;
    size: number;
    mimeType: string;
    extension: string;
    hash: string;
    dimensions?: { width: number; height: number };
  };
  securityScore: number;
}

interface FileUploadContext {
  userId?: string;
  clientId?: string;
  ipAddress: string;
  userAgent: string;
  requestId?: string;
}

/**
 * Dangerous file signatures to detect
 */
const DANGEROUS_SIGNATURES = [
  { signature: [0x4D, 0x5A], name: 'PE Executable' },
  { signature: [0x7F, 0x45, 0x4C, 0x46], name: 'ELF Executable' },
  { signature: [0xFE, 0xED, 0xFA, 0xCE], name: 'Mach-O Executable' },
  { signature: [0xCA, 0xFE, 0xBA, 0xBE], name: 'Java Class' },
  { signature: [0x50, 0x4B, 0x03, 0x04], name: 'ZIP Archive' },
  { signature: [0x52, 0x61, 0x72, 0x21], name: 'RAR Archive' },
  { signature: [0x1F, 0x8B], name: 'GZIP Archive' }
];

/**
 * Sanitize filename
 */
function sanitizeFileName(fileName: string): string {
  // Remove or replace dangerous characters
  let sanitized = fileName
    .replace(/[<>:"/\\|?*]/g, '_')
    .replace(/\.\./g, '_')
    .replace(/^\.+/, '')
    .replace(/\.+$/, '');
  
  // Limit length
  if (sanitized.length > securityConfig.fileUpload.maxFileNameLength) {
    const ext = path.extname(sanitized);
    const nameWithoutExt = sanitized.slice(0, -ext.length);
    const maxNameLength = securityConfig.fileUpload.maxFileNameLength - ext.length;
    sanitized = nameWithoutExt.slice(0, maxNameLength) + ext;
  }
  
  // Ensure it's not empty
  if (!sanitized || sanitized === '_') {
    sanitized = 'file_' + Date.now();
  }
  
  return sanitized;
}

/**
 * Validate file signature
 */
function validateFileSignature(buffer: Buffer, expectedMimeType: string): boolean {
  const config = securityConfig.fileUpload;
  
  // Check for dangerous signatures
  for (const danger of DANGEROUS_SIGNATURES) {
    if (buffer.length >= danger.signature.length) {
      const matches = danger.signature.every((byte, index) => 
        buffer[index] === byte
      );
      if (matches) {
        return false;
      }
    }
  }
  
  // Validate MIME type based on file signature
  const signatures: Record<string, number[][]> = {
    'image/jpeg': [[0xFF, 0xD8, 0xFF]],
    'image/png': [[0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]],
    'image/gif': [[0x47, 0x49, 0x46, 0x38, 0x37, 0x61], [0x47, 0x49, 0x46, 0x38, 0x39, 0x61]],
    'image/webp': [[0x52, 0x49, 0x46, 0x46], [0x57, 0x45, 0x42, 0x50]],
    'application/pdf': [[0x25, 0x50, 0x44, 0x46]],
    'text/plain': [], // No specific signature
    'application/json': [] // No specific signature
  };
  
  const expectedSignatures = signatures[expectedMimeType];
  if (!expectedSignatures || expectedSignatures.length === 0) {
    return true; // No signature to validate
  }
  
  return expectedSignatures.some(signature => {
    if (buffer.length < signature.length) return false;
    return signature.every((byte, index) => buffer[index] === byte);
  });
}

/**
 * Scan file content for malicious patterns
 */
function scanFileContent(buffer: Buffer): { isMalicious: boolean; threats: string[] } {
  const threats: string[] = [];
  const content = buffer.toString('utf8', 0, Math.min(buffer.length, 1024 * 1024)); // First 1MB
  
  // Check for script tags
  if (/<script[^>]*>/i.test(content)) {
    threats.push('Script tag detected');
  }
  
  // Check for JavaScript
  if (/javascript:/i.test(content) || /on\w+\s*=/i.test(content)) {
    threats.push('JavaScript code detected');
  }
  
  // Check for PHP code
  if (/<\?php/i.test(content) || /<\?=/i.test(content)) {
    threats.push('PHP code detected');
  }
  
  // Check for SQL injection patterns
  if (/(union|select|insert|update|delete|drop|create|alter)\s+.*\s+(from|into|where|set)/i.test(content)) {
    threats.push('SQL injection pattern detected');
  }
  
  // Check for base64 encoded content
  const base64Pattern = /data:image\/[^;]+;base64,/i;
  if (base64Pattern.test(content)) {
    threats.push('Base64 encoded content detected');
  }
  
  // Check for suspicious URLs
  if (/https?:\/\/[^\s]+/i.test(content)) {
    threats.push('URL detected in file content');
  }
  
  return {
    isMalicious: threats.length > 0,
    threats
  };
}

/**
 * Validate image dimensions
 */
async function validateImageDimensions(buffer: Buffer, mimeType: string): Promise<{ isValid: boolean; width?: number; height?: number }> {
  if (!mimeType.startsWith('image/')) {
    return { isValid: true };
  }
  
  try {
    // This is a simplified check - in production, use a proper image library
    const config = securityConfig.fileUpload;
    
    // For now, just check if it's a valid image format
    if (mimeType === 'image/jpeg' && buffer[0] === 0xFF && buffer[1] === 0xD8) {
      return { isValid: true, width: 0, height: 0 }; // Placeholder
    }
    
    if (mimeType === 'image/png' && buffer[0] === 0x89 && buffer[1] === 0x50) {
      return { isValid: true, width: 0, height: 0 }; // Placeholder
    }
    
    return { isValid: true };
  } catch (error) {
    return { isValid: false };
  }
}

/**
 * Generate file hash
 */
function generateFileHash(buffer: Buffer): string {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

/**
 * Validate uploaded file
 */
export async function validateFileUpload(
  file: {
    name: string;
    size: number;
    type: string;
    buffer: Buffer;
  },
  context: FileUploadContext
): Promise<FileValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const config = securityConfig.fileUpload;
  
  // Basic validation
  if (file.size > config.maxSize) {
    errors.push(`File size ${file.size} exceeds maximum allowed size ${config.maxSize}`);
  }
  
  if (file.size === 0) {
    errors.push('File is empty');
  }
  
  // Validate file type
  if (!config.allowedTypes.includes(file.type)) {
    errors.push(`File type ${file.type} is not allowed`);
  }
  
  // Validate file extension
  const extension = path.extname(file.name).toLowerCase();
  if (!config.allowedExtensions.includes(extension)) {
    errors.push(`File extension ${extension} is not allowed`);
  }
  
  // Validate filename length
  if (file.name.length > config.maxFileNameLength) {
    errors.push(`Filename length exceeds maximum allowed length ${config.maxFileNameLength}`);
  }
  
  // Sanitize filename
  const sanitizedName = config.sanitizeFileName ? sanitizeFileName(file.name) : file.name;
  
  // Validate file signature
  if (config.validateFileHeaders && !validateFileSignature(file.buffer, file.type)) {
    errors.push('File signature does not match declared MIME type');
  }
  
  // Scan file content
  if (config.scanFileContent) {
    const scanResult = scanFileContent(file.buffer);
    if (scanResult.isMalicious) {
      errors.push(`Malicious content detected: ${scanResult.threats.join(', ')}`);
    }
  }
  
  // Validate image dimensions
  if (config.validateImageDimensions) {
    const dimensionResult = await validateImageDimensions(file.buffer, file.type);
    if (!dimensionResult.isValid) {
      errors.push('Invalid image dimensions');
    }
  }
  
  // Generate file hash
  const hash = generateFileHash(file.buffer);
  
  // Calculate security score
  let securityScore = 100;
  securityScore -= errors.length * 20;
  securityScore -= warnings.length * 5;
  securityScore = Math.max(0, securityScore);
  
  const result: FileValidationResult = {
    isValid: errors.length === 0,
    errors,
    warnings,
    fileInfo: {
      originalName: file.name,
      sanitizedName,
      size: file.size,
      mimeType: file.type,
      extension,
      hash,
      dimensions: undefined // Would be populated by image dimension validation
    },
    securityScore
  };
  
  // Log file upload attempt
  await logAuditEvent(
    result.isValid ? AuditEventType.FILE_UPLOADED : AuditEventType.FILE_SCAN_FAILED,
    {
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type,
      securityScore,
      errors: result.errors,
      warnings: result.warnings,
      hash
    },
    {
      userId: context.userId,
      clientId: context.clientId,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      resource: 'file-upload',
      action: 'upload',
      requestId: context.requestId
    }
  );
  
  return result;
}

/**
 * Quarantine suspicious file
 */
export async function quarantineFile(
  file: { name: string; buffer: Buffer },
  reason: string,
  context: FileUploadContext
): Promise<boolean> {
  try {
    const config = securityConfig.fileUpload;
    const quarantineDir = config.quarantinePath;
    
    // Ensure quarantine directory exists
    await fs.mkdir(quarantineDir, { recursive: true });
    
    // Generate quarantine filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const hash = generateFileHash(file.buffer);
    const quarantineName = `${timestamp}_${hash}_${file.name}`;
    const quarantinePath = path.join(quarantineDir, quarantineName);
    
    // Write file to quarantine
    await fs.writeFile(quarantinePath, file.buffer);
    
    // Log quarantine event
    await logAuditEvent(
      AuditEventType.SUSPICIOUS_ACTIVITY,
      {
        action: 'file_quarantined',
        fileName: file.name,
        quarantinePath,
        reason,
        hash
      },
      {
        userId: context.userId,
        clientId: context.clientId,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        resource: 'file-quarantine',
        action: 'quarantine'
      }
    );
    
    return true;
  } catch (error) {
    console.error('❌ Failed to quarantine file:', error);
    return false;
  }
}

/**
 * Clean up old quarantined files
 */
export async function cleanupQuarantinedFiles(retentionDays: number = 30): Promise<number> {
  try {
    const config = securityConfig.fileUpload;
    const quarantineDir = config.quarantinePath;
    const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
    
    let deletedCount = 0;
    
    try {
      const files = await fs.readdir(quarantineDir);
      
      for (const file of files) {
        const filePath = path.join(quarantineDir, file);
        const stats = await fs.stat(filePath);
        
        if (stats.mtime < cutoffDate) {
          await fs.unlink(filePath);
          deletedCount++;
        }
      }
    } catch (error) {
      // Directory might not exist
      console.log('Quarantine directory does not exist');
    }
    
    console.log(`🧹 Cleaned up ${deletedCount} quarantined files`);
    return deletedCount;
    
  } catch (error) {
    console.error('❌ Failed to cleanup quarantined files:', error);
    return 0;
  }
}
