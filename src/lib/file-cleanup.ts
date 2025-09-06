/**
 * File Cleanup System
 * Provides comprehensive temporary file management and cleanup
 */

import fs from 'fs/promises';
import path from 'path';
import { logSecurity, LogCategory } from './logger';

interface FileCleanupConfig {
  tempDirectories: string[];
  maxFileAge: number; // in milliseconds
  cleanupInterval: number; // in milliseconds
  maxFileSize: number; // in bytes
  quarantineDirectory: string;
  backupDirectory: string;
  enableAutoCleanup: boolean;
  enableQuarantine: boolean;
  enableBackup: boolean;
}

interface FileInfo {
  path: string;
  size: number;
  createdAt: Date;
  modifiedAt: Date;
  isDirectory: boolean;
  isQuarantined: boolean;
  isBackedUp: boolean;
}

interface CleanupResult {
  filesDeleted: number;
  filesQuarantined: number;
  filesBackedUp: number;
  spaceFreed: number; // in bytes
  errors: string[];
  duration: number; // in milliseconds
}

/**
 * Default cleanup configuration
 */
const defaultCleanupConfig: FileCleanupConfig = {
  tempDirectories: [
    './temp',
    './uploads/temp',
    './quarantine',
    './logs',
    './cache'
  ],
  maxFileAge: 24 * 60 * 60 * 1000, // 24 hours
  cleanupInterval: 60 * 60 * 1000, // 1 hour
  maxFileSize: 100 * 1024 * 1024, // 100MB
  quarantineDirectory: './quarantine',
  backupDirectory: './backups',
  enableAutoCleanup: true,
  enableQuarantine: true,
  enableBackup: false
};

/**
 * File cleanup manager
 */
class FileCleanupManager {
  private config: FileCleanupConfig;
  private cleanupTimer?: NodeJS.Timeout;
  private isRunning = false;

  constructor(config: Partial<FileCleanupConfig> = {}) {
    this.config = { ...defaultCleanupConfig, ...config };
  }

  /**
   * Start automatic cleanup
   */
  public start(): void {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    this.cleanupTimer = setInterval(() => {
      this.performCleanup().catch(error => {
        logSecurity('File cleanup error', {
          error: error instanceof Error ? error.message : String(error)
        }, LogCategory.SYSTEM);
      });
    }, this.config.cleanupInterval);

    logSecurity('File cleanup manager started', {
      interval: this.config.cleanupInterval,
      directories: this.config.tempDirectories
    }, LogCategory.SYSTEM);
  }

  /**
   * Stop automatic cleanup
   */
  public stop(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
    this.isRunning = false;

    logSecurity('File cleanup manager stopped', {}, LogCategory.SYSTEM);
  }

  /**
   * Perform cleanup operation
   */
  public async performCleanup(): Promise<CleanupResult> {
    const startTime = Date.now();
    const result: CleanupResult = {
      filesDeleted: 0,
      filesQuarantined: 0,
      filesBackedUp: 0,
      spaceFreed: 0,
      errors: [],
      duration: 0
    };

    try {
      for (const directory of this.config.tempDirectories) {
        try {
          await this.cleanupDirectory(directory, result);
        } catch (error) {
          result.errors.push(`Failed to cleanup ${directory}: ${error instanceof Error ? error.message : String(error)}`);
        }
      }

      // Cleanup quarantine directory
      if (this.config.enableQuarantine) {
        await this.cleanupQuarantine(result);
      }

      // Cleanup backup directory
      if (this.config.enableBackup) {
        await this.cleanupBackups(result);
      }

      result.duration = Date.now() - startTime;

      logSecurity('File cleanup completed', {
        filesDeleted: result.filesDeleted,
        filesQuarantined: result.filesQuarantined,
        spaceFreed: result.spaceFreed,
        duration: result.duration,
        errors: result.errors.length
      }, LogCategory.SYSTEM);

    } catch (error) {
      result.errors.push(`Cleanup failed: ${error instanceof Error ? error.message : String(error)}`);
      result.duration = Date.now() - startTime;
    }

    return result;
  }

  /**
   * Cleanup specific directory
   */
  private async cleanupDirectory(directory: string, result: CleanupResult): Promise<void> {
    try {
      const files = await this.getDirectoryFiles(directory);
      const now = new Date();

      for (const file of files) {
        const fileAge = now.getTime() - file.createdAt.getTime();
        const shouldDelete = fileAge > this.config.maxFileAge;
        const shouldQuarantine = file.size > this.config.maxFileSize;

        if (shouldDelete) {
          if (shouldQuarantine && this.config.enableQuarantine) {
            await this.quarantineFile(file);
            result.filesQuarantined++;
          } else {
            await this.deleteFile(file);
            result.filesDeleted++;
            result.spaceFreed += file.size;
          }
        }
      }
    } catch (error) {
      result.errors.push(`Failed to cleanup directory ${directory}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get all files in directory
   */
  private async getDirectoryFiles(directory: string): Promise<FileInfo[]> {
    const files: FileInfo[] = [];

    try {
      const entries = await fs.readdir(directory, { withFileTypes: true });

      for (const entry of entries) {
        const filePath = path.join(directory, entry.name);
        const stats = await fs.stat(filePath);

        files.push({
          path: filePath,
          size: stats.size,
          createdAt: stats.birthtime,
          modifiedAt: stats.mtime,
          isDirectory: entry.isDirectory(),
          isQuarantined: false,
          isBackedUp: false
        });
      }
    } catch (error) {
      // Directory might not exist
      logSecurity('Directory not found during cleanup', {
        directory,
        error: error instanceof Error ? error.message : String(error)
      }, LogCategory.SYSTEM);
    }

    return files;
  }

  /**
   * Delete file
   */
  private async deleteFile(file: FileInfo): Promise<void> {
    try {
      if (!file.isDirectory) {
        await fs.unlink(file.path);
        logSecurity('File deleted during cleanup', {
          path: file.path,
          size: file.size
        }, LogCategory.SYSTEM);
      } else {
        await fs.rmdir(file.path);
        logSecurity('Directory deleted during cleanup', {
          path: file.path
        }, LogCategory.SYSTEM);
      }
    } catch (error) {
      throw new Error(`Failed to delete ${file.path}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Quarantine file
   */
  private async quarantineFile(file: FileInfo): Promise<void> {
    try {
      const quarantinePath = path.join(this.config.quarantineDirectory, path.basename(file.path));
      
      // Ensure quarantine directory exists
      await fs.mkdir(this.config.quarantineDirectory, { recursive: true });
      
      // Move file to quarantine
      await fs.rename(file.path, quarantinePath);
      
      logSecurity('File quarantined during cleanup', {
        originalPath: file.path,
        quarantinePath,
        size: file.size
      }, LogCategory.SYSTEM);
    } catch (error) {
      throw new Error(`Failed to quarantine ${file.path}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Cleanup quarantine directory
   */
  private async cleanupQuarantine(result: CleanupResult): Promise<void> {
    try {
      const quarantineAge = 7 * 24 * 60 * 60 * 1000; // 7 days
      const files = await this.getDirectoryFiles(this.config.quarantineDirectory);
      const now = new Date();

      for (const file of files) {
        const fileAge = now.getTime() - file.createdAt.getTime();
        
        if (fileAge > quarantineAge) {
          await this.deleteFile(file);
          result.filesDeleted++;
          result.spaceFreed += file.size;
        }
      }
    } catch (error) {
      result.errors.push(`Failed to cleanup quarantine: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Cleanup backup directory
   */
  private async cleanupBackups(result: CleanupResult): Promise<void> {
    try {
      const backupAge = 30 * 24 * 60 * 60 * 1000; // 30 days
      const files = await this.getDirectoryFiles(this.config.backupDirectory);
      const now = new Date();

      for (const file of files) {
        const fileAge = now.getTime() - file.createdAt.getTime();
        
        if (fileAge > backupAge) {
          await this.deleteFile(file);
          result.filesDeleted++;
          result.spaceFreed += file.size;
        }
      }
    } catch (error) {
      result.errors.push(`Failed to cleanup backups: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Cleanup specific file
   */
  public async cleanupFile(filePath: string): Promise<boolean> {
    try {
      const stats = await fs.stat(filePath);
      const file: FileInfo = {
        path: filePath,
        size: stats.size,
        createdAt: stats.birthtime,
        modifiedAt: stats.mtime,
        isDirectory: stats.isDirectory(),
        isQuarantined: false,
        isBackedUp: false
      };

      await this.deleteFile(file);
      
      logSecurity('File cleaned up manually', {
        path: filePath,
        size: file.size
      }, LogCategory.SYSTEM);
      
      return true;
    } catch (error) {
      logSecurity('Failed to cleanup file', {
        path: filePath,
        error: error instanceof Error ? error.message : String(error)
      }, LogCategory.SYSTEM);
      
      return false;
    }
  }

  /**
   * Get cleanup statistics
   */
  public async getCleanupStats(): Promise<{
    totalFiles: number;
    totalSize: number;
    oldestFile: Date | null;
    newestFile: Date | null;
    quarantineFiles: number;
    backupFiles: number;
  }> {
    let totalFiles = 0;
    let totalSize = 0;
    let oldestFile: Date | null = null;
    let newestFile: Date | null = null;
    let quarantineFiles = 0;
    let backupFiles = 0;

    for (const directory of this.config.tempDirectories) {
      const files = await this.getDirectoryFiles(directory);
      
      for (const file of files) {
        totalFiles++;
        totalSize += file.size;
        
        if (!oldestFile || file.createdAt < oldestFile) {
          oldestFile = file.createdAt;
        }
        
        if (!newestFile || file.createdAt > newestFile) {
          newestFile = file.createdAt;
        }
      }
    }

    // Count quarantine files
    if (this.config.enableQuarantine) {
      const quarantineFiles = await this.getDirectoryFiles(this.config.quarantineDirectory);
      quarantineFiles += quarantineFiles.length;
    }

    // Count backup files
    if (this.config.enableBackup) {
      const backupFiles = await this.getDirectoryFiles(this.config.backupDirectory);
      backupFiles += backupFiles.length;
    }

    return {
      totalFiles,
      totalSize,
      oldestFile,
      newestFile,
      quarantineFiles,
      backupFiles
    };
  }
}

// Export singleton instance
export const fileCleanupManager = new FileCleanupManager();

// Export convenience functions
export const startFileCleanup = () => fileCleanupManager.start();
export const stopFileCleanup = () => fileCleanupManager.stop();
export const performFileCleanup = () => fileCleanupManager.performCleanup();
export const cleanupFile = (filePath: string) => fileCleanupManager.cleanupFile(filePath);
export const getCleanupStats = () => fileCleanupManager.getCleanupStats();
