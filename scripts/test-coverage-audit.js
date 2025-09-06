#!/usr/bin/env node

/**
 * Test Coverage Audit Script
 * Comprehensive analysis of test coverage across the application
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const COVERAGE_THRESHOLDS = {
  global: {
    branches: 70,
    functions: 70,
    lines: 70,
    statements: 70
  },
  security: {
    branches: 90,
    functions: 90,
    lines: 90,
    statements: 90
  },
  auth: {
    branches: 85,
    functions: 85,
    lines: 85,
    statements: 85
  },
  api: {
    branches: 75,
    functions: 75,
    lines: 75,
    statements: 75
  }
};

// Security-critical files that need high coverage
const SECURITY_FILES = [
  'src/lib/security-',
  'src/lib/password-',
  'src/lib/session-',
  'src/lib/auth-',
  'src/lib/audit-',
  'src/lib/input-sanitizer',
  'src/lib/csrf-protection',
  'src/lib/security-monitor',
  'src/lib/secure-random',
  'src/lib/error-handler',
  'src/lib/response-validator',
  'src/lib/secure-error-handler'
];

// API files that need good coverage
const API_FILES = [
  'src/app/api/',
  'src/lib/api-'
];

// Utility functions
function findFiles(pattern, directory = 'src') {
  const files = [];
  
  function traverse(dir) {
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
        traverse(fullPath);
      } else if (stat.isFile() && pattern.test(item)) {
        files.push(fullPath);
      }
    }
  }
  
  traverse(directory);
  return files;
}

function analyzeFileCoverage(filePath, coverageData) {
  const relativePath = filePath.replace(process.cwd() + '/', '');
  const fileCoverage = coverageData[relativePath];
  
  if (!fileCoverage) {
    return {
      path: relativePath,
      hasCoverage: false,
      branches: 0,
      functions: 0,
      lines: 0,
      statements: 0,
      uncoveredLines: [],
      riskLevel: 'HIGH'
    };
  }
  
  const branches = fileCoverage.branches;
  const functions = fileCoverage.functions;
  const lines = fileCoverage.lines;
  const statements = fileCoverage.statements;
  
  // Calculate percentages
  const branchPct = branches.pct;
  const functionPct = functions.pct;
  const linePct = lines.pct;
  const statementPct = statements.pct;
  
  // Find uncovered lines
  const uncoveredLines = [];
  if (lines.details) {
    lines.details.forEach((line, index) => {
      if (line === 0) {
        uncoveredLines.push(index + 1);
      }
    });
  }
  
  // Determine risk level
  let riskLevel = 'LOW';
  if (branchPct < 50 || functionPct < 50 || linePct < 50 || statementPct < 50) {
    riskLevel = 'HIGH';
  } else if (branchPct < 70 || functionPct < 70 || linePct < 70 || statementPct < 70) {
    riskLevel = 'MEDIUM';
  }
  
  return {
    path: relativePath,
    hasCoverage: true,
    branches: branchPct,
    functions: functionPct,
    lines: linePct,
    statements: statementPct,
    uncoveredLines,
    riskLevel
  };
}

function categorizeFile(filePath) {
  if (SECURITY_FILES.some(pattern => filePath.includes(pattern))) {
    return 'security';
  } else if (API_FILES.some(pattern => filePath.includes(pattern))) {
    return 'api';
  } else if (filePath.includes('auth')) {
    return 'auth';
  }
  return 'general';
}

function generateReport(coverageData) {
  console.log('🔍 SCAN2SHIP TEST COVERAGE AUDIT REPORT');
  console.log('==========================================\n');
  
  // Find all TypeScript/JavaScript files
  const allFiles = [
    ...findFiles(/\.ts$/, 'src'),
    ...findFiles(/\.tsx$/, 'src'),
    ...findFiles(/\.js$/, 'src'),
    ...findFiles(/\.jsx$/, 'src')
  ];
  
  console.log(`📊 Total Files Analyzed: ${allFiles.length}\n`);
  
  // Analyze coverage for each file
  const fileAnalysis = allFiles.map(file => analyzeFileCoverage(file, coverageData));
  
  // Categorize files
  const categorizedFiles = {
    security: fileAnalysis.filter(f => categorizeFile(f.path) === 'security'),
    auth: fileAnalysis.filter(f => categorizeFile(f.path) === 'auth'),
    api: fileAnalysis.filter(f => categorizeFile(f.path) === 'api'),
    general: fileAnalysis.filter(f => categorizeFile(f.path) === 'general')
  };
  
  // Calculate overall statistics
  const overallStats = {
    totalFiles: fileAnalysis.length,
    filesWithCoverage: fileAnalysis.filter(f => f.hasCoverage).length,
    filesWithoutCoverage: fileAnalysis.filter(f => !f.hasCoverage).length,
    highRiskFiles: fileAnalysis.filter(f => f.riskLevel === 'HIGH').length,
    mediumRiskFiles: fileAnalysis.filter(f => f.riskLevel === 'MEDIUM').length,
    lowRiskFiles: fileAnalysis.filter(f => f.riskLevel === 'LOW').length
  };
  
  // Calculate average coverage
  const filesWithCoverage = fileAnalysis.filter(f => f.hasCoverage);
  const avgCoverage = {
    branches: filesWithCoverage.reduce((sum, f) => sum + f.branches, 0) / filesWithCoverage.length || 0,
    functions: filesWithCoverage.reduce((sum, f) => sum + f.functions, 0) / filesWithCoverage.length || 0,
    lines: filesWithCoverage.reduce((sum, f) => sum + f.lines, 0) / filesWithCoverage.length || 0,
    statements: filesWithCoverage.reduce((sum, f) => sum + f.statements, 0) / filesWithCoverage.length || 0
  };
  
  // Print overall statistics
  console.log('📈 OVERALL COVERAGE STATISTICS');
  console.log('--------------------------------');
  console.log(`Total Files: ${overallStats.totalFiles}`);
  console.log(`Files with Coverage: ${overallStats.filesWithCoverage} (${((overallStats.filesWithCoverage / overallStats.totalFiles) * 100).toFixed(1)}%)`);
  console.log(`Files without Coverage: ${overallStats.filesWithoutCoverage} (${((overallStats.filesWithoutCoverage / overallStats.totalFiles) * 100).toFixed(1)}%)`);
  console.log(`High Risk Files: ${overallStats.highRiskFiles}`);
  console.log(`Medium Risk Files: ${overallStats.mediumRiskFiles}`);
  console.log(`Low Risk Files: ${overallStats.lowRiskFiles}`);
  console.log('');
  
  console.log('📊 AVERAGE COVERAGE METRICS');
  console.log('----------------------------');
  console.log(`Branches: ${avgCoverage.branches.toFixed(1)}%`);
  console.log(`Functions: ${avgCoverage.functions.toFixed(1)}%`);
  console.log(`Lines: ${avgCoverage.lines.toFixed(1)}%`);
  console.log(`Statements: ${avgCoverage.statements.toFixed(1)}%`);
  console.log('');
  
  // Print category-specific analysis
  Object.entries(categorizedFiles).forEach(([category, files]) => {
    if (files.length === 0) return;
    
    const categoryFilesWithCoverage = files.filter(f => f.hasCoverage);
    const categoryAvgCoverage = {
      branches: categoryFilesWithCoverage.reduce((sum, f) => sum + f.branches, 0) / categoryFilesWithCoverage.length || 0,
      functions: categoryFilesWithCoverage.reduce((sum, f) => sum + f.functions, 0) / categoryFilesWithCoverage.length || 0,
      lines: categoryFilesWithCoverage.reduce((sum, f) => sum + f.lines, 0) / categoryFilesWithCoverage.length || 0,
      statements: categoryFilesWithCoverage.reduce((sum, f) => sum + f.statements, 0) / categoryFilesWithCoverage.length || 0
    };
    
    const threshold = COVERAGE_THRESHOLDS[category] || COVERAGE_THRESHOLDS.global;
    const meetsThreshold = 
      categoryAvgCoverage.branches >= threshold.branches &&
      categoryAvgCoverage.functions >= threshold.functions &&
      categoryAvgCoverage.lines >= threshold.lines &&
      categoryAvgCoverage.statements >= threshold.statements;
    
    console.log(`🔒 ${category.toUpperCase()} FILES (${files.length} files)`);
    console.log('----------------------------------------');
    console.log(`Files with Coverage: ${categoryFilesWithCoverage.length}/${files.length}`);
    console.log(`Average Branches: ${categoryAvgCoverage.branches.toFixed(1)}% (threshold: ${threshold.branches}%)`);
    console.log(`Average Functions: ${categoryAvgCoverage.functions.toFixed(1)}% (threshold: ${threshold.functions}%)`);
    console.log(`Average Lines: ${categoryAvgCoverage.lines.toFixed(1)}% (threshold: ${threshold.lines}%)`);
    console.log(`Average Statements: ${categoryAvgCoverage.statements.toFixed(1)}% (threshold: ${threshold.statements}%)`);
    console.log(`Meets Threshold: ${meetsThreshold ? '✅ YES' : '❌ NO'}`);
    console.log('');
  });
  
  // Print high-risk files
  const highRiskFiles = fileAnalysis.filter(f => f.riskLevel === 'HIGH');
  if (highRiskFiles.length > 0) {
    console.log('🚨 HIGH RISK FILES (Low Coverage)');
    console.log('----------------------------------');
    highRiskFiles.forEach(file => {
      console.log(`❌ ${file.path}`);
      if (file.hasCoverage) {
        console.log(`   Branches: ${file.branches.toFixed(1)}%, Functions: ${file.functions.toFixed(1)}%, Lines: ${file.lines.toFixed(1)}%, Statements: ${file.statements.toFixed(1)}%`);
      } else {
        console.log(`   No coverage data available`);
      }
    });
    console.log('');
  }
  
  // Print files without coverage
  const filesWithoutCoverage = fileAnalysis.filter(f => !f.hasCoverage);
  if (filesWithoutCoverage.length > 0) {
    console.log('📝 FILES WITHOUT COVERAGE');
    console.log('-------------------------');
    filesWithoutCoverage.forEach(file => {
      console.log(`⚠️  ${file.path}`);
    });
    console.log('');
  }
  
  // Print recommendations
  console.log('💡 RECOMMENDATIONS');
  console.log('-------------------');
  
  if (overallStats.filesWithoutCoverage > 0) {
    console.log(`1. Add tests for ${overallStats.filesWithoutCoverage} files without coverage`);
  }
  
  if (overallStats.highRiskFiles > 0) {
    console.log(`2. Improve test coverage for ${overallStats.highRiskFiles} high-risk files`);
  }
  
  if (categorizedFiles.security.length > 0) {
    const securityFiles = categorizedFiles.security.filter(f => f.hasCoverage);
    const securityAvg = securityFiles.reduce((sum, f) => sum + f.lines, 0) / securityFiles.length || 0;
    if (securityAvg < COVERAGE_THRESHOLDS.security.lines) {
      console.log('3. 🚨 CRITICAL: Security files need higher test coverage (target: 90%+)');
    }
  }
  
  if (categorizedFiles.auth.length > 0) {
    const authFiles = categorizedFiles.auth.filter(f => f.hasCoverage);
    const authAvg = authFiles.reduce((sum, f) => sum + f.lines, 0) / authFiles.length || 0;
    if (authAvg < COVERAGE_THRESHOLDS.auth.lines) {
      console.log('4. 🔐 Authentication files need higher test coverage (target: 85%+)');
    }
  }
  
  console.log('5. Focus on testing edge cases and error conditions');
  console.log('6. Add integration tests for API endpoints');
  console.log('7. Add security-focused tests for authentication and authorization');
  console.log('8. Consider adding property-based testing for complex algorithms');
  console.log('');
  
  // Generate coverage report file
  const reportData = {
    timestamp: new Date().toISOString(),
    overallStats,
    avgCoverage,
    categorizedFiles: Object.fromEntries(
      Object.entries(categorizedFiles).map(([category, files]) => [
        category,
        {
          count: files.length,
          filesWithCoverage: files.filter(f => f.hasCoverage).length,
          avgCoverage: files.filter(f => f.hasCoverage).reduce((sum, f) => ({
            branches: sum.branches + f.branches,
            functions: sum.functions + f.functions,
            lines: sum.lines + f.lines,
            statements: sum.statements + f.statements
          }), { branches: 0, functions: 0, lines: 0, statements: 0 })
        }
      ])
    ),
    highRiskFiles: highRiskFiles.map(f => f.path),
    filesWithoutCoverage: filesWithoutCoverage.map(f => f.path)
  };
  
  fs.writeFileSync('coverage-audit-report.json', JSON.stringify(reportData, null, 2));
  console.log('📄 Detailed report saved to: coverage-audit-report.json');
  
  return {
    overallStats,
    avgCoverage,
    meetsThresholds: overallStats.filesWithoutCoverage === 0 && overallStats.highRiskFiles === 0
  };
}

// Main execution
async function main() {
  try {
    console.log('🧪 Running test coverage audit...\n');
    
    // Check if coverage data exists
    const coveragePath = path.join(process.cwd(), 'coverage', 'coverage-final.json');
    if (!fs.existsSync(coveragePath)) {
      console.log('❌ No coverage data found. Please run tests with coverage first:');
      console.log('   npm test -- --coverage');
      console.log('   or');
      console.log('   npm run test:coverage');
      process.exit(1);
    }
    
    // Load coverage data
    const coverageData = JSON.parse(fs.readFileSync(coveragePath, 'utf8'));
    
    // Generate report
    const result = generateReport(coverageData);
    
    // Exit with appropriate code
    if (result.meetsThresholds) {
      console.log('✅ Coverage audit passed!');
      process.exit(0);
    } else {
      console.log('❌ Coverage audit failed. Please improve test coverage.');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('❌ Error running coverage audit:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { generateReport, analyzeFileCoverage, categorizeFile };
