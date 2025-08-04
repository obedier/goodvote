#!/usr/bin/env node

const fetch = require('node-fetch');

// Test configuration
const BASE_URL = 'http://localhost:3000';
const ESSENTIAL_ENDPOINTS = [
  '/api/congress',
  '/api/contributions',
  '/api/politicians/FL-04-119'
];

// Test results tracking
const testResults = {
  passed: 0,
  failed: 0,
  errors: [],
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
  
  testResults.details.push({ name, passed, details });
}

async function testEndpoint(endpoint) {
  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 5000 // 5 second timeout
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (data.success === true || data.data) {
      return true;
    } else {
      throw new Error('Invalid response format');
    }
  } catch (error) {
    throw error;
  }
}

async function testEssentialEndpoints() {
  console.log('🔍 Testing Essential API Endpoints\n');
  
  for (const endpoint of ESSENTIAL_ENDPOINTS) {
    try {
      const success = await testEndpoint(endpoint);
      logTest(`API Endpoint: ${endpoint}`, success, 'Response received');
    } catch (error) {
      logTest(`API Endpoint: ${endpoint}`, false, error.message);
    }
  }
}

async function testServerHealth() {
  try {
    const response = await fetch(`${BASE_URL}/api/congress?limit=1`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 3000 // 3 second timeout
    });
    
    if (response.ok) {
      const data = await response.json();
      const hasData = data.data && Array.isArray(data.data) && data.data.length > 0;
      logTest('Server Health Check', hasData, 'Server responding with data');
      return hasData;
    } else {
      logTest('Server Health Check', false, `HTTP ${response.status}`);
      return false;
    }
  } catch (error) {
    logTest('Server Health Check', false, error.message);
    return false;
  }
}

async function runFastAPITests() {
  console.log('🚀 Running Fast API Tests\n');
  
  // Test server health first
  const serverOk = await testServerHealth();
  if (!serverOk) {
    console.log('\n❌ Server health check failed. Make sure the development server is running: npm run dev');
    process.exit(1);
  }
  
  // Test essential endpoints
  await testEssentialEndpoints();
  
  // Summary
  console.log('\n' + '='.repeat(40));
  console.log('📊 FAST API TEST SUMMARY');
  console.log('='.repeat(40));
  
  console.log(`✅ Passed: ${testResults.passed}`);
  console.log(`❌ Failed: ${testResults.failed}`);
  console.log(`📈 Success Rate: ${Math.round((testResults.passed / (testResults.passed + testResults.failed)) * 100)}%`);
  
  if (testResults.failed > 0) {
    console.log('\n❌ Failed Tests:');
    testResults.details
      .filter(test => !test.passed)
      .forEach(test => console.log(`   - ${test.name}: ${test.details}`));
  }
  
  process.exit(testResults.failed > 0 ? 1 : 0);
}

// Handle errors
process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled Promise Rejection:', error);
  process.exit(1);
});

// Run tests
runFastAPITests().catch(error => {
  console.error('❌ API test execution failed:', error);
  process.exit(1);
}); 