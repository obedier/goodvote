#!/usr/bin/env node

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Test configuration - Updated for comprehensive coverage
const TESTS = [
  {
    name: 'Database Tests',
    script: 'scripts/test-database.js',
    description: 'Tests database connectivity, FEC tables, and data integrity'
  },
  {
    name: 'API Tests',
    script: 'scripts/test-api.js',
    description: 'Tests all API endpoints and response formats'
  },
  {
    name: 'Frontend Tests',
    script: 'scripts/test-frontend.js',
    description: 'Tests page functionality, navigation, and accessibility'
  },
  {
    name: 'Campaign Finance Validation',
    script: 'scripts/test-campaign-finance-validation.js',
    description: 'Validates campaign finance calculations against FEC data'
  },
  {
    name: 'Search & Data Exploration',
    script: 'scripts/test-search-functionality.js',
    description: 'Tests global search, autocomplete, and data exploration features'
  },
  {
    name: 'Lobbying & Groups',
    script: 'scripts/test-lobbying-features.js',
    description: 'Tests PAC database, organizations, and lobbying features'
  },
  {
    name: 'Elections & Outside Spending',
    script: 'scripts/test-elections-features.js',
    description: 'Tests election tracking, outside spending, and Get Local! features'
  },
  {
    name: 'Performance & Load Tests',
    script: 'scripts/test-performance.js',
    description: 'Tests API response times and frontend performance'
  }
];

// Test results tracking
const testResults = {
  passed: 0,
  failed: 0,
  total: 0,
  details: [],
  warnings: []
};

// Utility functions
function logTest(name, passed, details = '', isWarning = false) {
  const status = passed ? '✅ PASS' : '❌ FAIL';
  const warningStatus = isWarning ? '⚠️  WARN' : '';
  console.log(`${status}${warningStatus} ${name}`);
  if (details) console.log(`   ${details}`);
  
  if (passed) {
    testResults.passed++;
  } else {
    testResults.failed++;
  }
  testResults.total++;
  
  testResults.details.push({ name, passed, details, isWarning });
  
  if (isWarning) {
    testResults.warnings.push({ name, details });
  }
}

function runScript(scriptPath) {
  return new Promise((resolve, reject) => {
    const child = spawn('node', [scriptPath], {
      stdio: 'pipe',
      cwd: process.cwd()
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
      if (code === 0) {
        resolve({ success: true, output, errorOutput });
      } else {
        resolve({ success: false, output, errorOutput, code });
      }
    });
    
    child.on('error', (error) => {
      reject(error);
    });
  });
}

async function checkPrerequisites() {
  console.log('🔍 Checking Prerequisites...\n');
  
  // Check if scripts exist
  for (const test of TESTS) {
    const scriptPath = path.join(process.cwd(), test.script);
    const exists = fs.existsSync(scriptPath);
    logTest(`Script exists: ${test.script}`, exists);
  }
  
  // Check if .env file exists
  const envPath = path.join(process.cwd(), '.env.local');
  const envExists = fs.existsSync(envPath);
  logTest('Environment file exists', envExists, envExists ? '.env.local found' : '.env.local not found');
  
  // Check if package.json exists
  const packagePath = path.join(process.cwd(), 'package.json');
  const packageExists = fs.existsSync(packagePath);
  logTest('Package.json exists', packageExists);
  
  // Check for required dependencies
  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  const requiredDeps = ['puppeteer', 'node-fetch', 'pg'];
  const missingDeps = requiredDeps.filter(dep => !packageJson.dependencies[dep] && !packageJson.devDependencies[dep]);
  
  if (missingDeps.length > 0) {
    logTest('Required dependencies', false, `Missing: ${missingDeps.join(', ')}`);
  } else {
    logTest('Required dependencies', true, 'All required dependencies installed');
  }
  
  console.log('');
  return testResults.failed === 0;
}

async function runAllTests() {
  console.log('🧪 Running GoodVote Comprehensive Test Suite\n');
  console.log('📋 Test Categories:');
  TESTS.forEach((test, index) => {
    console.log(`   ${index + 1}. ${test.name}: ${test.description}`);
  });
  console.log('');
  
  // Check prerequisites
  const prerequisitesOk = await checkPrerequisites();
  if (!prerequisitesOk) {
    console.log('❌ Prerequisites not met. Please check the failed items above.');
    process.exit(1);
  }
  
  // Run each test suite
  for (const test of TESTS) {
    console.log(`\n📋 Running ${test.name}`);
    console.log(`📝 ${test.description}`);
    console.log('─'.repeat(50));
    
    try {
      const result = await runScript(test.script);
      
      if (result.success) {
        logTest(test.name, true, 'All tests passed');
        console.log(result.output);
      } else {
        logTest(test.name, false, `Exit code: ${result.code}`);
        console.log(result.output);
        if (result.errorOutput) {
          console.log('Errors:', result.errorOutput);
        }
      }
    } catch (error) {
      logTest(test.name, false, error.message);
    }
  }
  
  // Generate summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 COMPREHENSIVE TEST SUMMARY');
  console.log('='.repeat(60));
  
  console.log(`✅ Passed: ${testResults.passed}`);
  console.log(`❌ Failed: ${testResults.failed}`);
  console.log(`⚠️  Warnings: ${testResults.warnings.length}`);
  console.log(`📈 Success Rate: ${Math.round((testResults.passed / testResults.total) * 100)}%`);
  
  if (testResults.failed > 0) {
    console.log('\n❌ Failed Test Suites:');
    testResults.details
      .filter(test => !test.passed)
      .forEach(test => console.log(`   - ${test.name}: ${test.details}`));
  }
  
  if (testResults.warnings.length > 0) {
    console.log('\n⚠️  Warnings:');
    testResults.warnings.forEach(warning => {
      console.log(`   - ${warning.name}: ${warning.details}`);
    });
  }
  
  // Generate recommendations
  console.log('\n💡 Recommendations:');
  
  if (testResults.failed === 0) {
    console.log('   ✅ All tests passed! The application is ready for deployment.');
    console.log('   🚀 You can now run manual testing on the application.');
  } else {
    console.log('   🔧 Fix the failed tests before proceeding.');
    console.log('   📖 Check the test output above for specific issues.');
    console.log('   🛠️  Ensure the development server is running (npm run dev).');
    console.log('   🗄️  Verify database connectivity and FEC data availability.');
  }
  
  // Known issues from plan
  console.log('\n🔧 Known Issues to Address:');
  console.log('   - State data API test failing (400 error for invalid parameters) - expected behavior');
  console.log('   - Frontend pages may be stuck in loading state due to JavaScript hydration issues');
  console.log('   - Donor API returning errors (needs debugging)');
  console.log('   - PAC financial data investigation needed (receipt/disbursement amounts null)');
  
  // Exit with appropriate code
  process.exit(testResults.failed > 0 ? 1 : 0);
}

// Handle errors
process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled Promise Rejection:', error);
  process.exit(1);
});

// Run tests
runAllTests().catch(error => {
  console.error('❌ Test execution failed:', error);
  process.exit(1);
}); 