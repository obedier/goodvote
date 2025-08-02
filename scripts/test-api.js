#!/usr/bin/env node

const fetch = require('node-fetch');

// Configuration
const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';
const API_ENDPOINTS = [
  '/api/congress',
  '/api/contributions',
  '/api/expenditures',
  '/api/pacs',
  '/api/fec-overview',
  '/api/state-data'
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

async function testEndpoint(endpoint, params = {}) {
  try {
    const url = new URL(endpoint, BASE_URL);
    Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));
    
    const startTime = Date.now();
    const response = await fetch(url.toString());
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    const data = await response.json();
    
    const isSuccess = response.ok && data.success !== false;
    const responseTime = duration < 3000; // 3 seconds max
    
    logTest(`${endpoint}`, isSuccess && responseTime, 
      `Status: ${response.status}, Time: ${duration}ms, Success: ${isSuccess}`);
    
    return { success: isSuccess, responseTime, data };
  } catch (error) {
    logTest(`${endpoint}`, false, error.message);
    return { success: false, error: error.message };
  }
}

async function testCongressAPI() {
  console.log('\n🏛️ Testing Congress API');
  
  // Test basic congress endpoint
  await testEndpoint('/api/congress');
  
  // Test with filters
  await testEndpoint('/api/congress', { party: 'DEM' });
  await testEndpoint('/api/congress', { chamber: 'H' });
  await testEndpoint('/api/congress', { state: 'CA' });
}

async function testContributionsAPI() {
  console.log('\n💰 Testing Contributions API');
  
  // Test basic contributions endpoint
  await testEndpoint('/api/contributions');
  
  // Test with filters
  await testEndpoint('/api/contributions', { election_year: '2024' });
  await testEndpoint('/api/contributions', { min_amount: '1000' });
  await testEndpoint('/api/contributions', { max_amount: '5000' });
  await testEndpoint('/api/contributions', { limit: '10' });
}

async function testExpendituresAPI() {
  console.log('\n📊 Testing Expenditures API');
  
  // Test basic expenditures endpoint
  await testEndpoint('/api/expenditures');
  
  // Test with filters
  await testEndpoint('/api/expenditures', { election_year: '2024' });
  await testEndpoint('/api/expenditures', { min_amount: '10000' });
  await testEndpoint('/api/expenditures', { limit: '10' });
}

async function testPACsAPI() {
  console.log('\n🏢 Testing PACs API');
  
  // Test basic PACs endpoint
  await testEndpoint('/api/pacs');
  
  // Test with filters
  await testEndpoint('/api/pacs', { election_year: '2024' });
  await testEndpoint('/api/pacs', { min_receipts: '1000000' });
  await testEndpoint('/api/pacs', { limit: '10' });
  
  // Test top PACs action
  await testEndpoint('/api/pacs', { action: 'top_pacs', limit: '10' });
}

async function testFECOverviewAPI() {
  console.log('\n📈 Testing FEC Overview API');
  
  // Test basic overview
  await testEndpoint('/api/fec-overview');
  
  // Test with different years
  await testEndpoint('/api/fec-overview', { election_year: '2024' });
  await testEndpoint('/api/fec-overview', { election_year: '2022' });
  await testEndpoint('/api/fec-overview', { election_year: '2020' });
}

async function testStateDataAPI() {
  console.log('\n🗺️ Testing State Data API');
  
  // Test with different states
  await testEndpoint('/api/state-data', { state: 'CA' });
  await testEndpoint('/api/state-data', { state: 'TX' });
  await testEndpoint('/api/state-data', { state: 'NY' });
  
  // Test with ZIP codes
  await testEndpoint('/api/state-data', { zip_code: '90210' });
  await testEndpoint('/api/state-data', { zip_code: '10001' });
  
  // Test with election year
  await testEndpoint('/api/state-data', { state: 'CA', election_year: '2024' });
}

async function testErrorHandling() {
  console.log('\n⚠️ Testing Error Handling');
  
  // Test invalid parameters
  await testEndpoint('/api/congress', { party: 'INVALID' });
  await testEndpoint('/api/contributions', { election_year: '9999' });
  await testEndpoint('/api/state-data', { state: 'XX' });
  
  // Test missing required parameters
  await testEndpoint('/api/state-data');
}

async function testResponseFormat() {
  console.log('\n📋 Testing Response Format');
  
  const endpoints = [
    '/api/congress',
    '/api/contributions',
    '/api/pacs',
    '/api/fec-overview'
  ];
  
  for (const endpoint of endpoints) {
    try {
      const response = await fetch(`${BASE_URL}${endpoint}`);
      const data = await response.json();
      
      // Check for required fields
      const hasData = data.data !== undefined;
      const hasSuccess = data.success !== undefined;
      
      logTest(`${endpoint} Response Format`, hasData && hasSuccess, 
        `Has data: ${hasData}, Has success: ${hasSuccess}`);
    } catch (error) {
      logTest(`${endpoint} Response Format`, false, error.message);
    }
  }
}

async function testPerformance() {
  console.log('\n⚡ Testing Performance');
  
  const performanceTests = [
    { endpoint: '/api/congress', maxTime: 1000 },
    { endpoint: '/api/contributions', maxTime: 2000 },
    { endpoint: '/api/pacs', maxTime: 2000 },
    { endpoint: '/api/fec-overview', maxTime: 10000 },
    { endpoint: '/api/state-data?state=CA', maxTime: 3000 }
  ];
  
  for (const test of performanceTests) {
    try {
      const startTime = Date.now();
      const response = await fetch(`${BASE_URL}${test.endpoint}`);
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      const isFast = duration < test.maxTime;
      logTest(`${test.endpoint} Performance`, isFast, 
        `${duration}ms (max: ${test.maxTime}ms)`);
    } catch (error) {
      logTest(`${test.endpoint} Performance`, false, error.message);
    }
  }
}

async function runAllTests() {
  console.log('🧪 Running GoodVote API Tests');
  console.log(`📍 Base URL: ${BASE_URL}\n`);
  
  // Check if server is running
  try {
    const response = await fetch(BASE_URL);
    if (!response.ok) {
      throw new Error(`Server not responding: ${response.status}`);
    }
    logTest('Server Availability', true, 'Server is running and responding');
  } catch (error) {
    logTest('Server Availability', false, error.message);
    console.log('\n❌ Server is not running. Please start the development server with: npm run dev');
    process.exit(1);
  }
  
  // Run API tests
  await testCongressAPI();
  await testContributionsAPI();
  await testExpendituresAPI();
  await testPACsAPI();
  await testFECOverviewAPI();
  await testStateDataAPI();
  await testErrorHandling();
  await testResponseFormat();
  await testPerformance();
  
  // Summary
  console.log('\n📊 Test Summary');
  console.log(`✅ Passed: ${testResults.passed}`);
  console.log(`❌ Failed: ${testResults.failed}`);
  console.log(`📈 Success Rate: ${Math.round((testResults.passed / (testResults.passed + testResults.failed)) * 100)}%`);
  
  if (testResults.failed > 0) {
    console.log('\n❌ Failed Tests:');
    testResults.details
      .filter(test => !test.passed)
      .forEach(test => console.log(`   - ${test.name}: ${test.details}`));
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