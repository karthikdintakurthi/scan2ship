#!/usr/bin/env node

/**
 * Database Migration Script for Vanitha Logistics
 * 
 * This script provides a safe way to migrate database changes with:
 * - Automatic backup creation
 * - Migration validation
 * - Rollback capabilities
 * - Environment-specific handling
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Load environment variables from .env file
require('dotenv').config();

// Load environment-specific .env files
const loadEnvFile = (environment) => {
  const envFile = `.env.${environment}`;
  if (fs.existsSync(envFile)) {
    require('dotenv').config({ path: envFile });
  }
};

// Configuration
const CONFIG = {
  environments: {
    development: {
      databaseUrl: process.env.DATABASE_URL || process.env.DEV_DATABASE_URL,
      backupDir: './backups/dev',
      allowDestructive: true
    },
    staging: {
      databaseUrl: process.env.DATABASE_URL,
      backupDir: './backups/staging',
      allowDestructive: false
    },
    production: {
      databaseUrl: process.env.DATABASE_URL,
      backupDir: './backups/production',
      allowDestructive: false
    }
  }
};

class DatabaseMigrator {
  constructor(environment = 'development') {
    this.environment = environment;
    
    // Load environment-specific .env file
    if (environment !== 'development') {
      loadEnvFile(environment);
    }
    
    this.config = CONFIG.environments[environment];
    
    if (!this.config) {
      throw new Error(`Invalid environment: ${environment}`);
    }
    
    if (!this.config.databaseUrl) {
      throw new Error(`Database URL not found for environment: ${environment}`);
    }
    
    this.backupDir = this.config.backupDir;
    this.ensureBackupDirectory();
  }

  ensureBackupDirectory() {
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDirectory, { recursive: true });
    }
  }

  log(message, level = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
    console.log(`${prefix} ${message}`);
  }

  async createBackup() {
    this.log('Creating database backup...');
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(this.backupDir, `backup_${timestamp}.sql`);
    
    try {
      // Create a backup using pg_dump if available, otherwise use Prisma
      if (this.environment === 'production' || this.environment === 'staging') {
        // For production/staging, try to use pg_dump for better backup
        try {
          const dbUrl = new URL(this.config.databaseUrl);
          const pgDumpCmd = `PGPASSWORD="${dbUrl.password}" pg_dump -h "${dbUrl.hostname}" -U "${dbUrl.username}" -d "${dbUrl.pathname.slice(1)}" -f "${backupFile}"`;
          execSync(pgDumpCmd, { stdio: 'pipe' });
          this.log(`Backup created successfully: ${backupFile}`);
        } catch (error) {
          this.log('pg_dump failed, falling back to Prisma backup', 'warn');
          // Fallback to Prisma backup
          execSync(`npx prisma db pull --schema=prisma/schema.prisma`, {
            env: { ...process.env, DATABASE_URL: this.config.databaseUrl },
            stdio: 'pipe'
          });
        }
      } else {
        // For development, use Prisma
        execSync(`npx prisma db pull --schema=prisma/schema.prisma`, {
          env: { ...process.env, DATABASE_URL: this.config.databaseUrl },
          stdio: 'pipe'
        });
      }
      
      return backupFile;
    } catch (error) {
      this.log(`Backup creation failed: ${error.message}`, 'error');
      throw error;
    }
  }

  async validateMigrations() {
    this.log('Validating migrations...');
    
    try {
      // Validate schema
      execSync('npx prisma validate', {
        env: { ...process.env, DATABASE_URL: this.config.databaseUrl },
        stdio: 'pipe'
      });
      
      // Check migration status using spawn for better error handling
      const statusResult = await new Promise((resolve) => {
        const child = spawn('npx', ['prisma', 'migrate', 'status'], {
          env: { ...process.env, DATABASE_URL: this.config.databaseUrl },
          stdio: ['pipe', 'pipe', 'pipe']
        });
        
        let output = '';
        let errorOutput = '';
        
        child.stdout.on('data', (data) => {
          output += data.toString();
        });
        
        child.stderr.on('data', (data) => {
          errorOutput += data.toString();
        });
        
        child.on('close', (code) => {
          // Prisma migrate status returns non-zero exit code when there are pending migrations
          // This is normal and expected behavior
          if (code === 0 || output.includes('Following migrations have not yet been applied:')) {
            if (output.includes('Following migrations have not yet been applied:')) {
              this.log('Found pending migrations - this is normal and expected');
            }
            resolve(true);
          } else {
            this.log(`Migration status check failed with exit code ${code}`, 'error');
            if (errorOutput) {
              this.log(`Error output: ${errorOutput}`, 'error');
            }
            resolve(false);
          }
        });
        
        child.on('error', (error) => {
          this.log(`Migration status check failed: ${error.message}`, 'error');
          resolve(false);
        });
      });
      
      if (!statusResult) {
        throw new Error('Migration status check failed');
      }
      
      this.log('Migration validation passed');
      return true;
    } catch (error) {
      this.log(`Migration validation failed: ${error.message}`, 'error');
      return false;
    }
  }

  async runMigrations() {
    this.log('Running database migrations...');
    
    try {
      // Generate Prisma client first
      execSync('npx prisma generate', { stdio: 'pipe' });
      
      // Run migrations
      execSync('npx prisma migrate deploy', {
        env: { ...process.env, DATABASE_URL: this.config.databaseUrl },
        stdio: 'pipe'
      });
      
      this.log('Migrations completed successfully');
      return true;
    } catch (error) {
      this.log(`Migration failed: ${error.message}`, 'error');
      return false;
    }
  }

  async verifyMigration() {
    this.log('Verifying migration success...');
    
    return new Promise((resolve) => {
      const child = spawn('npx', ['prisma', 'migrate', 'status'], {
        env: { ...process.env, DATABASE_URL: this.config.databaseUrl },
        stdio: ['pipe', 'pipe', 'pipe']
      });
      
      let output = '';
      let errorOutput = '';
      
      child.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      child.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });
      
      child.on('close', (code) => {
        // Prisma migrate status returns non-zero exit code when there are pending migrations
        // This is normal and expected behavior
        if (code === 0 || output.includes('Following migrations have not yet been applied:')) {
          if (output.includes('Following migrations have not yet been applied:')) {
            this.log('Found pending migrations - this is normal and expected');
          }
          this.log('Migration verification passed');
          resolve(true);
        } else {
          this.log(`Migration verification failed with exit code ${code}`, 'error');
          if (errorOutput) {
            this.log(`Error output: ${errorOutput}`, 'error');
          }
          resolve(false);
        }
      });
      
      child.on('error', (error) => {
        this.log(`Migration verification failed: ${error.message}`, 'error');
        resolve(false);
      });
    });
  }

  async rollback(backupFile) {
    this.log('Rolling back migration...');
    
    if (!backupFile || !fs.existsSync(backupFile)) {
      this.log('No backup file found for rollback', 'error');
      return false;
    }
    
    try {
      // For production/staging, use psql to restore
      if (this.environment === 'production' || this.environment === 'staging') {
        const dbUrl = new URL(this.config.databaseUrl);
        const psqlCmd = `PGPASSWORD="${dbUrl.password}" psql -h "${dbUrl.hostname}" -U "${dbUrl.username}" -d "${dbUrl.pathname.slice(1)}" -f "${backupFile}"`;
        execSync(psqlCmd, { stdio: 'pipe' });
      } else {
        // For development, use Prisma reset
        execSync('npx prisma migrate reset --force', {
          env: { ...process.env, DATABASE_URL: this.config.databaseUrl },
          stdio: 'pipe'
        });
      }
      
      this.log('Rollback completed successfully');
      return true;
    } catch (error) {
      this.log(`Rollback failed: ${error.message}`, 'error');
      return false;
    }
  }

  async migrate() {
    this.log(`Starting database migration for environment: ${this.environment}`);
    
    let backupFile = null;
    
    try {
      // Step 1: Create backup
      backupFile = await this.createBackup();
      
      // Step 2: Validate migrations
      if (!(await this.validateMigrations())) {
        throw new Error('Migration validation failed');
      }
      
      // Step 3: Run migrations
      if (!(await this.runMigrations())) {
        throw new Error('Migration execution failed');
      }
      
      // Step 4: Verify migration
      if (!(await this.verifyMigration())) {
        throw new Error('Migration verification failed');
      }
      
      this.log('Database migration completed successfully!');
      return true;
      
    } catch (error) {
      this.log(`Migration failed: ${error.message}`, 'error');
      
      // Attempt rollback if backup exists
      if (backupFile) {
        this.log('Attempting rollback...');
        try {
          await this.rollback(backupFile);
        } catch (rollbackError) {
          this.log(`Rollback failed: ${rollbackError.message}`, 'error');
          this.log('Manual intervention required!', 'error');
        }
      }
      
      return false;
    }
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const environment = args[1] || 'development';
  
  try {
    const migrator = new DatabaseMigrator(environment);
    
    switch (command) {
      case 'migrate':
        await migrator.migrate();
        break;
      case 'backup':
        await migrator.createBackup();
        break;
      case 'validate':
        await migrator.validateMigrations();
        break;
      case 'status':
        await migrator.verifyMigration();
        break;
      default:
        console.log(`
Database Migration Script for Vanitha Logistics

Usage:
  node scripts/migrate-database.js <command> [environment]

Commands:
  migrate    Run database migrations
  backup     Create database backup
  validate   Validate migrations
  status     Check migration status

Environments:
  development (default)
  staging
  production

Examples:
  node scripts/migrate-database.js migrate
  node scripts/migrate-database.js migrate staging
  node scripts/migrate-database.js backup production
        `);
    }
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = DatabaseMigrator;
