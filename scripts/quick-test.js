#!/usr/bin/env node

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Quick test configuration - only essential tests with shorter timeouts
const QUICK_TESTS = [
  {
    name: 'Database Connectivity',
    script: 'scripts/test-database-simple.js',
    description: 'Quick database connectivity test',
    timeout: 10000, // 10 seconds
    essential: true
  },
  {
    name: 'API Endpoints',
    script: 'scripts/test-api-fast.js',
    description: 'Quick API endpoint validation',
    timeout: 20000, // 20 seconds
    essential: true
  },
  {
    name: 'Frontend Loading',
    script: 'scripts/test-frontend-simple.js',
    description: 'Quick frontend page loading test',
    timeout: 25000, // 25 seconds
    essential: true
  }
];

// Test results tracking
const testResults = {
  passed: 0,
  failed: 0,
  timedOut: 0,
  total: 0,
  details: [],
  startTime: Date.now()
};

// Utility functions
function logTest(name, status, details = '') {
  const statusMap = {
    'pass': '✅ PASS',
    'fail': '❌ FAIL',
    'timeout': '⏰ TIMEOUT'
  };
  
  const statusText = statusMap[status] || status;
  console.log(`${statusText} ${name}`);
  if (details) console.log(`   ${details}`);
  
  if (status === 'pass') {
    testResults.passed++;
  } else if (status === 'timeout') {
    testResults.timedOut++;
  } else {
    testResults.failed++;
  }
  testResults.total++;
  
  testResults.details.push({ name, status, details });
}

function runScriptWithTimeout(scriptPath, timeoutMs) {
  return new Promise((resolve) => {
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
    
    const timeout = setTimeout(() => {
      child.kill('SIGTERM');
      resolve({ 
        success: false, 
        output, 
        errorOutput, 
        code: 'TIMEOUT',
        timedOut: true 
      });
    }, timeoutMs);
    
    child.on('close', (code) => {
      clearTimeout(timeout);
      if (code === 0) {
        resolve({ success: true, output, errorOutput });
      } else {
        resolve({ success: false, output, errorOutput, code });
      }
    });
    
    child.on('error', (error) => {
      clearTimeout(timeout);
      resolve({ success: false, output, errorOutput, error: error.message });
    });
  });
}

async function runQuickTests() {
  console.log('⚡ Running GoodVote Quick Test Suite\n');
  console.log('📋 Quick Tests (Fast execution with timeouts):');
  QUICK_TESTS.forEach((test, index) => {
    console.log(`   ${index + 1}. ${test.name}: ${test.description} (${test.timeout/1000}s timeout)`);
  });
  console.log('');
  
  // Check if scripts exist
  console.log('🔍 Checking test scripts...\n');
  for (const test of QUICK_TESTS) {
    const scriptPath = path.join(process.cwd(), test.script);
    const exists = fs.existsSync(scriptPath);
    logTest(`Script exists: ${test.script}`, exists ? 'pass' : 'fail');
  }
  
  // Check if .env file exists
  const envPath = path.join(process.cwd(), '.env.local');
  const envExists = fs.existsSync(envPath);
  logTest('Environment file exists', envExists ? 'pass' : 'fail', 
    envExists ? '.env.local found' : '.env.local not found');
  
  if (!envExists) {
    console.log('\n❌ Environment file not found. Please create .env.local');
    process.exit(1);
  }
  
  console.log('');
  
  // Run tests sequentially
  for (const test of QUICK_TESTS) {
    console.log(`\n🔄 Running ${test.name} (${test.timeout/1000}s timeout)`);
    console.log('─'.repeat(40));
    
    try {
      const result = await runScriptWithTimeout(test.script, test.timeout);
      
      if (result.timedOut) {
        logTest(test.name, 'timeout', `Timed out after ${test.timeout/1000} seconds`);
      } else if (result.success) {
        logTest(test.name, 'pass', 'Test passed');
        // Show brief output for successful tests
        const lines = result.output.split('\n').slice(0, 3);
        if (lines.length > 0) {
          console.log(`   Output: ${lines.join(' | ')}`);
        }
      } else {
        logTest(test.name, 'fail', `Exit code: ${result.code}`);
        // Show error output for failed tests
        if (result.errorOutput) {
          const errorLines = result.errorOutput.split('\n').slice(0, 2);
          console.log(`   Error: ${errorLines.join(' | ')}`);
        }
      }
    } catch (error) {
      logTest(test.name, 'fail', error.message);
    }
  }
  
  // Generate summary
  const totalTime = (Date.now() - testResults.startTime) / 1000;
  console.log('\n' + '='.repeat(50));
  console.log('📊 QUICK TEST SUMMARY');
  console.log('='.repeat(50));
  
  console.log(`✅ Passed: ${testResults.passed}`);
  console.log(`❌ Failed: ${testResults.failed}`);
  console.log(`⏰ Timed Out: ${testResults.timedOut}`);
  console.log(`⏱️  Total Time: ${totalTime.toFixed(1)}s`);
  console.log(`📈 Success Rate: ${Math.round((testResults.passed / testResults.total) * 100)}%`);
  
  if (testResults.failed > 0) {
    console.log('\n❌ Failed Tests:');
    testResults.details
      .filter(test => test.status === 'fail')
      .forEach(test => console.log(`   - ${test.name}: ${test.details}`));
  }
  
  if (testResults.timedOut > 0) {
    console.log('\n⏰ Timed Out Tests:');
    testResults.details
      .filter(test => test.status === 'timeout')
      .forEach(test => console.log(`   - ${test.name}: ${test.details}`));
  }
  
  // Generate recommendations
  console.log('\n💡 Quick Test Results:');
  
  if (testResults.failed === 0 && testResults.timedOut === 0) {
    console.log('   ✅ All quick tests passed! Basic functionality is working.');
    console.log('   🚀 You can now run the full test suite: npm run test:optimized');
  } else {
    if (testResults.timedOut > 0) {
      console.log('   ⏰ Some tests timed out. Check:');
      console.log('      - Development server is running (npm run dev)');
      console.log('      - Database connectivity');
      console.log('      - Network connectivity');
    }
    if (testResults.failed > 0) {
      console.log('   🔧 Some tests failed. Check:');
      console.log('      - Environment configuration (.env.local)');
      console.log('      - Database setup');
      console.log('      - API endpoints');
    }
    console.log('   🛠️  Run: npm run dev (in another terminal)');
    console.log('   🔍 Check server logs for errors');
  }
  
  // Exit with appropriate code
  const hasFailures = testResults.failed > 0 || testResults.timedOut > 0;
  process.exit(hasFailures ? 1 : 0);
}

// Handle errors
process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled Promise Rejection:', error);
  process.exit(1);
});

// Run quick tests
runQuickTests().catch(error => {
  console.error('❌ Quick test execution failed:', error);
  process.exit(1);
}); 