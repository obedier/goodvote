#!/usr/bin/env node

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Test configuration
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
  }
];

// Test results tracking
const testResults = {
  passed: 0,
  failed: 0,
  total: 0,
  details: []
};

// Utility functions
function logTest(name, passed, details = '') {
  const status = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`${status} ${name}`);
  if (details) console.log(`   ${details}`);
  
  if (passed) {
    testResults.passed++;
  } else {
    testResults.failed++;
  }
  testResults.total++;
  
  testResults.details.push({ name, passed, details });
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
  
  console.log('');
  return testResults.failed === 0;
}

async function runAllTests() {
  console.log('🧪 Running GoodVote Comprehensive Test Suite\n');
  
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
  console.log(`📈 Success Rate: ${Math.round((testResults.passed / testResults.total) * 100)}%`);
  
  if (testResults.failed > 0) {
    console.log('\n❌ Failed Test Suites:');
    testResults.details
      .filter(test => !test.passed)
      .forEach(test => console.log(`   - ${test.name}: ${test.details}`));
  }
  
  // Generate recommendations
  console.log('\n💡 Recommendations:');
  
  if (testResults.failed === 0) {
    console.log('   ✅ All tests passed! The application is ready for deployment.');
  } else {
    console.log('   🔧 Fix the failed tests before proceeding.');
    console.log('   📖 Check the test output above for specific issues.');
    console.log('   🛠️  Ensure the development server is running (npm run dev).');
    console.log('   🗄️  Verify database connectivity and FEC data availability.');
  }
  
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