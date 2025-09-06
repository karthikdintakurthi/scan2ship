#!/usr/bin/env node

/**
 * API Tests Runner
 * Comprehensive test runner for all API endpoints and webhooks
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Test configuration
const TEST_CONFIG = {
  // Test categories and their patterns
  categories: {
    auth: {
      pattern: '**/auth/**/*.test.ts',
      description: 'Authentication APIs',
      priority: 'CRITICAL',
    },
    admin: {
      pattern: '**/admin/**/*.test.ts',
      description: 'Admin APIs',
      priority: 'HIGH',
    },
    orders: {
      pattern: '**/orders*.test.ts',
      description: 'Order Management APIs',
      priority: 'HIGH',
    },
    webhooks: {
      pattern: '**/webhooks/**/*.test.ts',
      description: 'Webhook APIs',
      priority: 'CRITICAL',
    },
    shopify: {
      pattern: '**/shopify/**/*.test.ts',
      description: 'Shopify Integration APIs',
      priority: 'HIGH',
    },
    general: {
      pattern: '**/api/**/*.test.ts',
      description: 'General APIs',
      priority: 'MEDIUM',
    },
  },
  
  // Test execution options
  options: {
    verbose: true,
    coverage: true,
    timeout: 30000,
    maxWorkers: '50%',
  },
};

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logHeader(message) {
  log('\n' + '='.repeat(60), 'cyan');
  log(message, 'bright');
  log('='.repeat(60), 'cyan');
}

function logSection(message) {
  log('\n' + '-'.repeat(40), 'blue');
  log(message, 'blue');
  log('-'.repeat(40), 'blue');
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'cyan');
}

// Find test files
function findTestFiles(category) {
  const testDir = path.join(process.cwd(), 'src', 'app', 'api', '__tests__');
  
  if (!fs.existsSync(testDir)) {
    return [];
  }
  
  const files = [];
  
  function traverse(dir, pattern) {
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        traverse(fullPath, pattern);
      } else if (stat.isFile() && item.endsWith('.test.ts')) {
        const relativePath = path.relative(process.cwd(), fullPath);
        if (matchesPattern(relativePath, pattern)) {
          files.push(relativePath);
        }
      }
    }
  }
  
  traverse(testDir, category.pattern);
  return files;
}

function matchesPattern(filePath, pattern) {
  // Simple pattern matching - convert glob to regex
  const regexPattern = pattern
    .replace(/\*\*/g, '.*')
    .replace(/\*/g, '[^/]*')
    .replace(/\?/g, '.');
  
  const regex = new RegExp(`^${regexPattern}$`);
  return regex.test(filePath);
}

// Run tests for a specific category
function runCategoryTests(category) {
  logSection(`Running ${category.description} Tests`);
  
  const testFiles = findTestFiles(category);
  
  if (testFiles.length === 0) {
    logWarning(`No test files found for ${category.description}`);
    return { success: true, tests: 0, passed: 0, failed: 0 };
  }
  
  logInfo(`Found ${testFiles.length} test files:`);
  testFiles.forEach(file => {
    log(`  - ${file}`, 'cyan');
  });
  
  try {
    // Build Jest command
    const jestArgs = [
      '--testPathPattern=' + testFiles.join('|'),
      '--verbose',
      '--coverage',
      '--coverageReporters=text',
      '--coverageReporters=json',
      '--coverageReporters=html',
      '--testTimeout=30000',
      '--maxWorkers=50%',
      '--passWithNoTests',
    ];
    
    const command = `npx jest ${jestArgs.join(' ')}`;
    
    logInfo(`Running command: ${command}`);
    
    const output = execSync(command, { 
      encoding: 'utf8',
      stdio: 'pipe',
      cwd: process.cwd(),
    });
    
    // Parse test results from output
    const results = parseTestResults(output);
    
    logSuccess(`${category.description} tests completed`);
    logInfo(`Tests: ${results.tests}, Passed: ${results.passed}, Failed: ${results.failed}`);
    
    if (results.failed > 0) {
      logError(`${results.failed} tests failed`);
    }
    
    return results;
    
  } catch (error) {
    logError(`Failed to run ${category.description} tests: ${error.message}`);
    return { success: false, tests: 0, passed: 0, failed: 1 };
  }
}

// Parse test results from Jest output
function parseTestResults(output) {
  const lines = output.split('\n');
  let tests = 0;
  let passed = 0;
  let failed = 0;
  
  for (const line of lines) {
    if (line.includes('Tests:')) {
      const match = line.match(/Tests:\s*(\d+)/);
      if (match) tests = parseInt(match[1]);
    }
    if (line.includes('Passed:')) {
      const match = line.match(/Passed:\s*(\d+)/);
      if (match) passed = parseInt(match[1]);
    }
    if (line.includes('Failed:')) {
      const match = line.match(/Failed:\s*(\d+)/);
      if (match) failed = parseInt(match[1]);
    }
  }
  
  return { tests, passed, failed, success: failed === 0 };
}

// Generate test report
function generateReport(results) {
  logHeader('API TESTS SUMMARY REPORT');
  
  const totalTests = results.reduce((sum, r) => sum + r.tests, 0);
  const totalPassed = results.reduce((sum, r) => sum + r.passed, 0);
  const totalFailed = results.reduce((sum, r) => sum + r.failed, 0);
  const successRate = totalTests > 0 ? (totalPassed / totalTests * 100).toFixed(1) : 0;
  
  log(`\n📊 Overall Results:`, 'bright');
  log(`   Total Tests: ${totalTests}`);
  log(`   Passed: ${totalPassed}`, 'green');
  log(`   Failed: ${totalFailed}`, totalFailed > 0 ? 'red' : 'green');
  log(`   Success Rate: ${successRate}%`, successRate >= 90 ? 'green' : successRate >= 70 ? 'yellow' : 'red');
  
  log(`\n📋 Category Breakdown:`, 'bright');
  Object.entries(TEST_CONFIG.categories).forEach(([key, category]) => {
    const result = results.find(r => r.category === key);
    if (result) {
      const status = result.failed === 0 ? '✅' : '❌';
      const color = result.failed === 0 ? 'green' : 'red';
      log(`   ${status} ${category.description}: ${result.passed}/${result.tests} passed`, color);
    } else {
      log(`   ⚠️  ${category.description}: No tests found`, 'yellow');
    }
  });
  
  // Priority analysis
  log(`\n🎯 Priority Analysis:`, 'bright');
  const criticalResults = results.filter(r => {
    const category = Object.values(TEST_CONFIG.categories).find(c => c.priority === 'CRITICAL');
    return category && r.category === Object.keys(TEST_CONFIG.categories).find(k => TEST_CONFIG.categories[k] === category);
  });
  
  const criticalFailed = criticalResults.reduce((sum, r) => sum + r.failed, 0);
  if (criticalFailed > 0) {
    logError(`CRITICAL tests failed: ${criticalFailed}`);
  } else {
    logSuccess('All CRITICAL tests passed');
  }
  
  // Recommendations
  log(`\n💡 Recommendations:`, 'bright');
  if (totalFailed > 0) {
    log('   - Fix failing tests before deployment');
    log('   - Review test coverage for failed areas');
    log('   - Consider adding more test cases for edge scenarios');
  }
  
  if (successRate < 90) {
    log('   - Improve test coverage to reach 90%+ success rate');
    log('   - Add more comprehensive test cases');
  }
  
  if (totalTests === 0) {
    log('   - No tests found - implement test suite immediately');
    log('   - Start with critical authentication and webhook tests');
  }
  
  // Save report to file
  const reportData = {
    timestamp: new Date().toISOString(),
    summary: {
      totalTests,
      totalPassed,
      totalFailed,
      successRate: parseFloat(successRate),
    },
    categories: results,
    recommendations: totalFailed > 0 ? [
      'Fix failing tests before deployment',
      'Review test coverage for failed areas',
      'Consider adding more test cases for edge scenarios',
    ] : [],
  };
  
  fs.writeFileSync('api-tests-report.json', JSON.stringify(reportData, null, 2));
  logInfo('Detailed report saved to: api-tests-report.json');
  
  return totalFailed === 0;
}

// Main execution
async function main() {
  try {
    logHeader('SCAN2SHIP API TESTS RUNNER');
    logInfo('Starting comprehensive API test suite...');
    
    const results = [];
    
    // Run tests for each category in priority order
    const priorityOrder = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
    
    for (const priority of priorityOrder) {
      const categories = Object.entries(TEST_CONFIG.categories)
        .filter(([_, config]) => config.priority === priority);
      
      for (const [key, category] of categories) {
        const result = runCategoryTests(category);
        results.push({
          category: key,
          ...result,
        });
      }
    }
    
    // Generate final report
    const allPassed = generateReport(results);
    
    // Exit with appropriate code
    if (allPassed) {
      logSuccess('\n🎉 All API tests passed successfully!');
      process.exit(0);
    } else {
      logError('\n💥 Some API tests failed. Please review and fix.');
      process.exit(1);
    }
    
  } catch (error) {
    logError(`Test runner failed: ${error.message}`);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { runCategoryTests, generateReport, findTestFiles };
