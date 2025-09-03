#!/usr/bin/env node

/**
 * Security Validation Script
 * Checks for critical security issues in the application
 */

const fs = require('fs');
const path = require('path');

// Security checks to perform
const securityChecks = [
  {
    name: 'Hardcoded JWT Secrets',
    pattern: /fallback-secret|hardcoded.*secret|default.*secret/gi,
    severity: 'CRITICAL',
    description: 'Hardcoded secrets can compromise the entire system'
  },
  {
    name: 'Hardcoded Encryption Keys',
    pattern: /vanitha-logistics-encryption-key-2024|hardcoded.*key/gi,
    severity: 'CRITICAL',
    description: 'Hardcoded encryption keys can expose sensitive data'
  },
  {
    name: 'Hardcoded API Keys',
    pattern: /your_.*_api_key|your_.*_secret/gi,
    severity: 'HIGH',
    description: 'Hardcoded API keys can expose external services'
  },
  {
    name: 'Console Logging in Production',
    pattern: /console\.(log|warn|error|info)/g,
    severity: 'MEDIUM',
    description: 'Excessive console logging can expose sensitive information'
  },
  {
    name: 'SQL Injection Patterns',
    pattern: /(\b(union|select|insert|update|delete|drop|create|alter)\b)/gi,
    severity: 'HIGH',
    description: 'Potential SQL injection vulnerabilities'
  }
];

// Directories to scan
const scanDirectories = [
  'src',
  'scripts',
  'prisma'
];

// File extensions to scan
const scanExtensions = [
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.prisma'
];

// Results storage
const results = {
  critical: [],
  high: [],
  medium: [],
  low: [],
  passed: 0
};

/**
 * Scan a file for security issues
 */
function scanFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    
    securityChecks.forEach(check => {
      const matches = content.match(check.pattern);
      if (matches) {
        const issue = {
          file: filePath,
          pattern: check.pattern.source,
          matches: matches.length,
          severity: check.severity,
          description: check.description,
          lines: []
        };
        
        // Find line numbers with matches
        lines.forEach((line, index) => {
          if (check.pattern.test(line)) {
            issue.lines.push({
              number: index + 1,
              content: line.trim()
            });
          }
        });
        
        // Add to results
        switch (check.severity) {
          case 'CRITICAL':
            results.critical.push(issue);
            break;
          case 'HIGH':
            results.high.push(issue);
            break;
          case 'MEDIUM':
            results.medium.push(issue);
            break;
          case 'LOW':
            results.low.push(issue);
            break;
        }
      }
    });
    
    results.passed++;
  } catch (error) {
    console.error(`Error scanning file ${filePath}:`, error.message);
  }
}

/**
 * Recursively scan directories
 */
function scanDirectory(dirPath) {
  try {
    const items = fs.readdirSync(dirPath);
    
    items.forEach(item => {
      const fullPath = path.join(dirPath, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        scanDirectory(fullPath);
      } else if (stat.isFile()) {
        const ext = path.extname(item);
        if (scanExtensions.includes(ext)) {
          scanFile(fullPath);
        }
      }
    });
  } catch (error) {
    console.error(`Error scanning directory ${dirPath}:`, error.message);
  }
}

/**
 * Print results
 */
function printResults() {
  console.log('\n🔒 SECURITY VALIDATION RESULTS\n');
  console.log('=' .repeat(50));
  
  if (results.critical.length > 0) {
    console.log(`\n🚨 CRITICAL ISSUES (${results.critical.length}):`);
    results.critical.forEach(issue => {
      console.log(`\n  📁 ${issue.file}`);
      console.log(`  ⚠️  ${issue.description}`);
      console.log(`  🔍 Found ${issue.matches} matches`);
      issue.lines.forEach(line => {
        console.log(`     Line ${line.number}: ${line.content}`);
      });
    });
  }
  
  if (results.high.length > 0) {
    console.log(`\n⚠️  HIGH PRIORITY ISSUES (${results.high.length}):`);
    results.high.forEach(issue => {
      console.log(`\n  📁 ${issue.file}`);
      console.log(`  ⚠️  ${issue.description}`);
      console.log(`  🔍 Found ${issue.matches} matches`);
    });
  }
  
  if (results.medium.length > 0) {
    console.log(`\n⚠️  MEDIUM PRIORITY ISSUES (${results.medium.length}):`);
    results.medium.forEach(issue => {
      console.log(`\n  📁 ${issue.file}`);
      console.log(`  ⚠️  ${issue.description}`);
      console.log(`  🔍 Found ${issue.matches} matches`);
    });
  }
  
  if (results.low.length > 0) {
    console.log(`\n⚠️  LOW PRIORITY ISSUES (${results.low.length}):`);
    results.low.forEach(issue => {
      console.log(`\n  📁 ${issue.file}`);
      console.log(`  ⚠️  ${issue.description}`);
      console.log(`  🔍 Found ${issue.matches} matches`);
    });
  }
  
  console.log(`\n✅ Files passed security checks: ${results.passed}`);
  
  const totalIssues = results.critical.length + results.high.length + results.medium.length + results.low.length;
  
  if (totalIssues === 0) {
    console.log('\n🎉 All security checks passed!');
    process.exit(0);
  } else {
    console.log(`\n🚨 Total security issues found: ${totalIssues}`);
    if (results.critical.length > 0) {
      console.log('\n❌ CRITICAL ISSUES MUST BE FIXED BEFORE PRODUCTION!');
      process.exit(1);
    } else {
      console.log('\n⚠️  Please review and fix the identified issues.');
      process.exit(0);
    }
  }
}

// Main execution
console.log('🔒 Starting security validation...\n');

scanDirectories.forEach(dir => {
  if (fs.existsSync(dir)) {
    console.log(`📁 Scanning directory: ${dir}`);
    scanDirectory(dir);
  } else {
    console.log(`⚠️  Directory not found: ${dir}`);
  }
});

printResults();
