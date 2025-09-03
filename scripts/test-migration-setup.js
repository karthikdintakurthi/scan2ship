#!/usr/bin/env node

/**
 * Test Migration Setup Script
 * 
 * This script verifies that all components of the CI/CD pipeline
 * are properly configured and working.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class MigrationSetupTester {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.successes = [];
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${type.toUpperCase()}]`;
    console.log(`${prefix} ${message}`);
  }

  addError(message) {
    this.errors.push(message);
    this.log(message, 'error');
  }

  addWarning(message) {
    this.warnings.push(message);
    this.log(message, 'warn');
  }

  addSuccess(message) {
    this.successes.push(message);
    this.log(message, 'success');
  }

  // Test 1: Check if required directories exist
  testDirectoryStructure() {
    this.log('Testing directory structure...');
    
    const requiredDirs = [
      '.github/workflows',
      '.github/environments',
      'scripts',
      'backups/dev',
      'backups/staging',
      'backups/production',
      'prisma'
    ];

    requiredDirs.forEach(dir => {
      if (fs.existsSync(dir)) {
        this.addSuccess(`✓ Directory exists: ${dir}`);
      } else {
        this.addError(`✗ Directory missing: ${dir}`);
      }
    });
  }

  // Test 2: Check if required files exist
  testRequiredFiles() {
    this.log('Testing required files...');
    
    const requiredFiles = [
      '.github/workflows/database-migration.yml',
      '.github/environments/staging.yml',
      '.github/environments/production.yml',
      'scripts/migrate-database.js',
      'prisma/schema.prisma',
      'package.json'
    ];

    requiredFiles.forEach(file => {
      if (fs.existsSync(file)) {
        this.addSuccess(`✓ File exists: ${file}`);
      } else {
        this.addError(`✗ File missing: ${file}`);
      }
    });
  }

  // Test 3: Check package.json scripts
  testPackageScripts() {
    this.log('Testing package.json scripts...');
    
    try {
      const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
      const scripts = packageJson.scripts || {};
      
      const requiredScripts = [
        'db:migrate:staging',
        'db:migrate:production',
        'db:backup:staging',
        'db:backup:production',
        'db:validate:staging',
        'db:validate:production'
      ];

      requiredScripts.forEach(script => {
        if (scripts[script]) {
          this.addSuccess(`✓ Script exists: ${script}`);
        } else {
          this.addWarning(`⚠ Script missing: ${script}`);
        }
      });
    } catch (error) {
      this.addError(`✗ Failed to read package.json: ${error.message}`);
    }
  }

  // Test 4: Check Prisma setup
  testPrismaSetup() {
    this.log('Testing Prisma setup...');
    
    try {
      // Check if Prisma is installed
      execSync('npx prisma --version', { stdio: 'pipe' });
      this.addSuccess('✓ Prisma CLI is available');
    } catch (error) {
      this.addError('✗ Prisma CLI not available');
    }

    try {
      // Check if schema is valid
      execSync('npx prisma validate', { stdio: 'pipe' });
      this.addSuccess('✓ Prisma schema is valid');
    } catch (error) {
      this.addError(`✗ Prisma schema validation failed: ${error.message}`);
    }
  }

  // Test 5: Check GitHub Actions setup
  testGitHubActions() {
    this.log('Testing GitHub Actions setup...');
    
    try {
      const workflowFile = fs.readFileSync('.github/workflows/database-migration.yml', 'utf8');
      
      if (workflowFile.includes('Database Migration Pipeline')) {
        this.addSuccess('✓ GitHub Actions workflow exists');
      } else {
        this.addError('✗ GitHub Actions workflow content invalid');
      }

      if (workflowFile.includes('STAGING_DATABASE_URL')) {
        this.addSuccess('✓ Workflow references staging database');
      } else {
        this.addWarning('⚠ Workflow missing staging database reference');
      }

      if (workflowFile.includes('PRODUCTION_DATABASE_URL')) {
        this.addSuccess('✓ Workflow references production database');
      } else {
        this.addWarning('⚠ Workflow missing production database reference');
      }
    } catch (error) {
      this.addError(`✗ Failed to read GitHub Actions workflow: ${error.message}`);
    }
  }

  // Test 6: Check environment configurations
  testEnvironmentConfigs() {
    this.log('Testing environment configurations...');
    
    try {
      const stagingConfig = fs.readFileSync('.github/environments/staging.yml', 'utf8');
      const productionConfig = fs.readFileSync('.github/environments/production.yml', 'utf8');
      
      if (stagingConfig.includes('name: staging')) {
        this.addSuccess('✓ Staging environment config exists');
      } else {
        this.addError('✗ Staging environment config invalid');
      }

      if (productionConfig.includes('name: production')) {
        this.addSuccess('✓ Production environment config exists');
      } else {
        this.addError('✗ Production environment config invalid');
      }

      if (productionConfig.includes('required_approving_review_count: 2')) {
        this.addSuccess('✓ Production environment has proper protection rules');
      } else {
        this.addWarning('⚠ Production environment protection rules may be insufficient');
      }
    } catch (error) {
      this.addError(`✗ Failed to read environment configs: ${error.message}`);
    }
  }

  // Test 7: Check migration script
  testMigrationScript() {
    this.log('Testing migration script...');
    
    try {
      const scriptContent = fs.readFileSync('scripts/migrate-database.js', 'utf8');
      
      if (scriptContent.includes('DatabaseMigrator')) {
        this.addSuccess('✓ Migration script contains DatabaseMigrator class');
      } else {
        this.addError('✗ Migration script missing DatabaseMigrator class');
      }

      if (scriptContent.includes('createBackup')) {
        this.addSuccess('✓ Migration script has backup functionality');
      } else {
        this.addWarning('⚠ Migration script missing backup functionality');
      }

      if (scriptContent.includes('rollback')) {
        this.addSuccess('✓ Migration script has rollback functionality');
      } else {
        this.addWarning('⚠ Migration script missing rollback functionality');
      }
    } catch (error) {
      this.addError(`✗ Failed to read migration script: ${error.message}`);
    }
  }

  // Run all tests
  async runAllTests() {
    this.log('Starting migration setup tests...', 'info');
    console.log('=' .repeat(60));
    
    this.testDirectoryStructure();
    this.testRequiredFiles();
    this.testPackageScripts();
    this.testPrismaSetup();
    this.testGitHubActions();
    this.testEnvironmentConfigs();
    this.testMigrationScript();
    
    console.log('=' .repeat(60));
    this.log('Test summary:', 'info');
    console.log(`✓ Successes: ${this.successes.length}`);
    console.log(`⚠ Warnings: ${this.warnings.length}`);
    console.log(`✗ Errors: ${this.errors.length}`);
    
    if (this.errors.length > 0) {
      console.log('\n❌ SETUP HAS ERRORS - Please fix before proceeding');
      this.errors.forEach(error => console.log(`  - ${error}`));
      process.exit(1);
    } else if (this.warnings.length > 0) {
      console.log('\n⚠️  SETUP HAS WARNINGS - Review and address as needed');
      this.warnings.forEach(warning => console.log(`  - ${warning}`));
    } else {
      console.log('\n🎉 SETUP IS COMPLETE AND READY!');
    }
    
    console.log('\nNext steps:');
    console.log('1. Set up GitHub secrets (STAGING_DATABASE_URL, PRODUCTION_DATABASE_URL)');
    console.log('2. Configure environment variables');
    console.log('3. Test the migration script locally');
    console.log('4. Create your first migration and test the pipeline');
  }
}

// Run tests if called directly
if (require.main === module) {
  const tester = new MigrationSetupTester();
  tester.runAllTests();
}

module.exports = MigrationSetupTester;
