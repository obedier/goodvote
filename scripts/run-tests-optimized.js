#!/usr/bin/env node

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Test configuration with timeouts and categories
const TESTS = [
  {
    name: 'Database Tests',
    script: 'scripts/test-database.js',
    description: 'Tests database connectivity, FEC tables, and data integrity',
    timeout: 30000, // 30 seconds
    category: 'essential',
    parallel: false
  },
  {
    name: 'API Tests',
    script: 'scripts/test-api.js',
    description: 'Tests all API endpoints and response formats',
    timeout: 45000, // 45 seconds
    category: 'essential',
    parallel: false
  },
  {
    name: 'Frontend Tests',
    script: 'scripts/test-frontend.js',
    description: 'Tests page functionality, navigation, and accessibility',
    timeout: 60000, // 60 seconds
    category: 'essential',
    parallel: false
  },
  {
    name: 'Campaign Finance Validation',
    script: 'scripts/test-campaign-finance-validation.js',
    description: 'Validates campaign finance calculations against FEC data',
    timeout: 90000, // 90 seconds
    category: 'validation',
    parallel: true
  },
  {
    name: 'Search & Data Exploration',
    script: 'scripts/test-search-functionality.js',
    description: 'Tests global search, autocomplete, and data exploration features',
    timeout: 60000, // 60 seconds
    category: 'features',
    parallel: true
  },
  {
    name: 'Lobbying & Groups',
    script: 'scripts/test-lobbying-features.js',
    description: 'Tests PAC database, organizations, and lobbying features',
    timeout: 60000, // 60 seconds
    category: 'features',
    parallel: true
  },
  {
    name: 'Elections & Outside Spending',
    script: 'scripts/test-elections-features.js',
    description: 'Tests election tracking, outside spending, and Get Local! features',
    timeout: 60000, // 60 seconds
    category: 'features',
    parallel: true
  },
  {
    name: 'Performance & Load Tests',
    script: 'scripts/test-performance.js',
    description: 'Tests API response times and frontend performance',
    timeout: 90000, // 90 seconds
    category: 'performance',
    parallel: true
  }
];

// Test results tracking
const testResults = {
  passed: 0,
  failed: 0,
  timedOut: 0,
  total: 0,
  details: [],
  warnings: [],
  startTime: Date.now()
};

// Utility functions
function logTest(name, status, details = '', isWarning = false) {
  const statusMap = {
    'pass': '✅ PASS',
    'fail': '❌ FAIL',
    'timeout': '⏰ TIMEOUT',
    'warning': '⚠️  WARN'
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
  
  testResults.details.push({ name, status, details, isWarning });
  
  if (isWarning) {
    testResults.warnings.push({ name, details });
  }
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

async function checkPrerequisites() {
  console.log('🔍 Checking Prerequisites...\n');
  
  // Check if scripts exist
  for (const test of TESTS) {
    const scriptPath = path.join(process.cwd(), test.script);
    const exists = fs.existsSync(scriptPath);
    logTest(`Script exists: ${test.script}`, exists ? 'pass' : 'fail');
  }
  
  // Check if .env file exists
  const envPath = path.join(process.cwd(), '.env.local');
  const envExists = fs.existsSync(envPath);
  logTest('Environment file exists', envExists ? 'pass' : 'fail', 
    envExists ? '.env.local found' : '.env.local not found');
  
  // Check if package.json exists
  const packagePath = path.join(process.cwd(), 'package.json');
  const packageExists = fs.existsSync(packagePath);
  logTest('Package.json exists', packageExists ? 'pass' : 'fail');
  
  // Check for required dependencies
  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  const requiredDeps = ['puppeteer', 'node-fetch', 'pg'];
  const missingDeps = requiredDeps.filter(dep => !packageJson.dependencies[dep] && !packageJson.devDependencies[dep]);
  
  if (missingDeps.length > 0) {
    logTest('Required dependencies', 'fail', `Missing: ${missingDeps.join(', ')}`);
  } else {
    logTest('Required dependencies', 'pass', 'All required dependencies installed');
  }
  
  console.log('');
  return testResults.failed === 0;
}

async function runTestsByCategory(category) {
  const categoryTests = TESTS.filter(test => test.category === category);
  console.log(`\n📋 Running ${category} Tests (${categoryTests.length} tests)`);
  console.log('─'.repeat(50));
  
  const results = [];
  
  if (category === 'essential') {
    // Run essential tests sequentially
    for (const test of categoryTests) {
      console.log(`\n🔄 Running ${test.name} (${test.timeout/1000}s timeout)`);
      try {
        const result = await runScriptWithTimeout(test.script, test.timeout);
        
        if (result.timedOut) {
          logTest(test.name, 'timeout', `Timed out after ${test.timeout/1000} seconds`);
        } else if (result.success) {
          logTest(test.name, 'pass', 'All tests passed');
        } else {
          logTest(test.name, 'fail', `Exit code: ${result.code}`);
        }
        
        results.push({ test, result });
      } catch (error) {
        logTest(test.name, 'fail', error.message);
        results.push({ test, result: { success: false, error: error.message } });
      }
    }
  } else {
    // Run other tests in parallel with concurrency limit
    const concurrency = 2; // Limit parallel execution
    const chunks = [];
    for (let i = 0; i < categoryTests.length; i += concurrency) {
      chunks.push(categoryTests.slice(i, i + concurrency));
    }
    
    for (const chunk of chunks) {
      const promises = chunk.map(async (test) => {
        console.log(`🔄 Starting ${test.name} (${test.timeout/1000}s timeout)`);
        try {
          const result = await runScriptWithTimeout(test.script, test.timeout);
          
          if (result.timedOut) {
            logTest(test.name, 'timeout', `Timed out after ${test.timeout/1000} seconds`);
          } else if (result.success) {
            logTest(test.name, 'pass', 'All tests passed');
          } else {
            logTest(test.name, 'fail', `Exit code: ${result.code}`);
          }
          
          return { test, result };
        } catch (error) {
          logTest(test.name, 'fail', error.message);
          return { test, result: { success: false, error: error.message } };
        }
      });
      
      const chunkResults = await Promise.all(promises);
      results.push(...chunkResults);
    }
  }
  
  return results;
}

async function runAllTests() {
  console.log('🧪 Running GoodVote Optimized Test Suite\n');
  console.log('📋 Test Categories:');
  const categories = [...new Set(TESTS.map(test => test.category))];
  categories.forEach((category, index) => {
    const categoryTests = TESTS.filter(test => test.category === category);
    console.log(`   ${index + 1}. ${category.toUpperCase()} (${categoryTests.length} tests)`);
  });
  console.log('');
  
  // Check prerequisites
  const prerequisitesOk = await checkPrerequisites();
  if (!prerequisitesOk) {
    console.log('❌ Prerequisites not met. Please check the failed items above.');
    process.exit(1);
  }
  
  // Run tests by category
  const allResults = [];
  for (const category of categories) {
    const categoryResults = await runTestsByCategory(category);
    allResults.push(...categoryResults);
  }
  
  // Generate summary
  const totalTime = (Date.now() - testResults.startTime) / 1000;
  console.log('\n' + '='.repeat(60));
  console.log('📊 OPTIMIZED TEST SUMMARY');
  console.log('='.repeat(60));
  
  console.log(`✅ Passed: ${testResults.passed}`);
  console.log(`❌ Failed: ${testResults.failed}`);
  console.log(`⏰ Timed Out: ${testResults.timedOut}`);
  console.log(`⚠️  Warnings: ${testResults.warnings.length}`);
  console.log(`⏱️  Total Time: ${totalTime.toFixed(1)}s`);
  console.log(`📈 Success Rate: ${Math.round((testResults.passed / testResults.total) * 100)}%`);
  
  if (testResults.failed > 0) {
    console.log('\n❌ Failed Test Suites:');
    testResults.details
      .filter(test => test.status === 'fail')
      .forEach(test => console.log(`   - ${test.name}: ${test.details}`));
  }
  
  if (testResults.timedOut > 0) {
    console.log('\n⏰ Timed Out Test Suites:');
    testResults.details
      .filter(test => test.status === 'timeout')
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
  
  if (testResults.failed === 0 && testResults.timedOut === 0) {
    console.log('   ✅ All tests passed! The application is ready for deployment.');
    console.log('   🚀 You can now run manual testing on the application.');
  } else {
    if (testResults.timedOut > 0) {
      console.log('   ⏰ Some tests timed out. Consider:');
      console.log('      - Increasing timeout values for slow tests');
      console.log('      - Optimizing database queries');
      console.log('      - Running tests on faster hardware');
    }
    if (testResults.failed > 0) {
      console.log('   🔧 Fix the failed tests before proceeding.');
      console.log('   📖 Check the test output above for specific issues.');
    }
    console.log('   🛠️  Ensure the development server is running (npm run dev).');
    console.log('   🗄️  Verify database connectivity and FEC data availability.');
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

// Run tests
runAllTests().catch(error => {
  console.error('❌ Test execution failed:', error);
  process.exit(1);
}); 