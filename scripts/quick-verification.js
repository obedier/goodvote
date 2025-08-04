#!/usr/bin/env node

const fetch = require('node-fetch');

// Configuration
const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

// Essential endpoints to test
const ESSENTIAL_ENDPOINTS = [
  '/api/congress',
  '/api/contributions',
  '/api/expenditures',
  '/api/search',
  '/api/fec-overview',
  '/api/pacs',
  '/api/state-data'
];

// Test results tracking
const testResults = {
  passed: 0,
  failed: 0,
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
    const responseTime = duration < 5000; // 5 seconds max
    
    logTest(`${endpoint}`, isSuccess && responseTime, 
      `Status: ${response.status}, Time: ${duration}ms, Success: ${isSuccess}`);
    
    return { success: isSuccess, responseTime, data };
  } catch (error) {
    logTest(`${endpoint}`, false, error.message);
    return { success: false, error: error.message };
  }
}

async function testServerAvailability() {
  console.log('🔍 Testing Server Availability');
  
  try {
    const response = await fetch(BASE_URL);
    if (response.ok) {
      logTest('Server is running', true, `Server responding at ${BASE_URL}`);
      return true;
    } else {
      logTest('Server is running', false, `Server returned status ${response.status}`);
      return false;
    }
  } catch (error) {
    logTest('Server is running', false, error.message);
    return false;
  }
}

async function testEssentialAPIs() {
  console.log('\n🧪 Testing Essential APIs');
  
  for (const endpoint of ESSENTIAL_ENDPOINTS) {
    await testEndpoint(endpoint);
  }
}

async function testSearchFunctionality() {
  console.log('\n🔍 Testing Search Functionality');
  
  // Test basic search
  await testEndpoint('/api/search', { q: 'trump' });
  
  // Test search suggestions
  await testEndpoint('/api/search/suggestions', { q: 'tr' });
  
  // Test popular searches
  await testEndpoint('/api/search/suggestions', { popular: 'true' });
}

async function testDataIntegrity() {
  console.log('\n📊 Testing Data Integrity');
  
  // Test that congress data has expected structure
  const congressResult = await testEndpoint('/api/congress', { limit: '1' });
  if (congressResult.success && congressResult.data && congressResult.data.data) {
    const hasData = Array.isArray(congressResult.data.data) && congressResult.data.data.length > 0;
    logTest('Congress Data Structure', hasData, 
      hasData ? 'Congress data has expected structure' : 'Congress data missing expected structure');
  }
  
  // Test that contributions data has expected structure (empty array is valid)
  const contributionsResult = await testEndpoint('/api/contributions', { limit: '1' });
  if (contributionsResult.success && contributionsResult.data && contributionsResult.data.data) {
    const hasData = Array.isArray(contributionsResult.data.data);
    logTest('Contributions Data Structure', hasData,
      hasData ? 'Contributions data has expected structure (empty array is valid)' : 'Contributions data missing expected structure');
  }
  
  // Test that search returns results
  const searchResult = await testEndpoint('/api/search', { q: 'trump', limit: '1' });
  if (searchResult.success && searchResult.data && searchResult.data.data) {
    const hasResults = Array.isArray(searchResult.data.data) && searchResult.data.data.length > 0;
    logTest('Search Results Structure', hasResults,
      hasResults ? 'Search returns expected structure' : 'Search missing expected structure');
  }
}

async function testPerformance() {
  console.log('\n⚡ Testing Performance');
  
  const performanceTests = [
    { endpoint: '/api/congress', params: {} },
    { endpoint: '/api/search', params: { q: 'trump' } },
    { endpoint: '/api/fec-overview', params: {} }
  ];
  
  for (const test of performanceTests) {
    const startTime = Date.now();
    const result = await testEndpoint(test.endpoint, test.params);
    const duration = Date.now() - startTime;
    
    const isFast = duration < 3000; // 3 seconds max
    logTest(`${test.endpoint} Performance`, isFast, `Response time: ${duration}ms`);
  }
}

async function testKnownIssues() {
  console.log('\n🔧 Testing Known Issues');
  
  // Test state data API with invalid parameter (should return 400)
  const invalidStateResult = await testEndpoint('/api/state-data', { state: 'INVALID_STATE' });
  if (!invalidStateResult.success) {
    logTest('State Data Error Handling', true, 'Correctly rejected invalid state parameter (expected behavior)');
  }
  
  // Test PAC financial data (may have null values)
  const pacResult = await testEndpoint('/api/pacs', { 
    committee_id: 'C00123456',
    include_financials: 'true'
  });
  if (pacResult.success && pacResult.data) {
    const hasFinancialData = pacResult.data.receipts !== null && 
                            pacResult.data.disbursements !== null;
    logTest('PAC Financial Data', hasFinancialData, 
      hasFinancialData ? 'PAC financial data available' : 'PAC financial data missing (known issue)');
  }
}

async function runQuickVerification() {
  console.log('🚀 GoodVote Quick Verification');
  console.log('='.repeat(50));
  console.log(`📍 Testing against: ${BASE_URL}`);
  console.log('');
  
  try {
    // Test server availability first
    const serverOk = await testServerAvailability();
    if (!serverOk) {
      console.log('\n❌ Server is not running. Please start the development server with: npm run dev');
      process.exit(1);
    }
    
    // Run essential tests
    await testEssentialAPIs();
    await testSearchFunctionality();
    await testDataIntegrity();
    await testPerformance();
    await testKnownIssues();
    
    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('📊 QUICK VERIFICATION SUMMARY');
    console.log('='.repeat(50));
    
    console.log(`✅ Passed: ${testResults.passed}`);
    console.log(`❌ Failed: ${testResults.failed}`);
    console.log(`📈 Success Rate: ${Math.round((testResults.passed / (testResults.passed + testResults.failed)) * 100)}%`);
    
    if (testResults.failed > 0) {
      console.log('\n❌ Failed Tests:');
      testResults.details
        .filter(test => !test.passed)
        .forEach(test => console.log(`   - ${test.name}: ${test.details}`));
    }
    
    // Recommendations
    console.log('\n💡 Recommendations:');
    
    if (testResults.failed === 0) {
      console.log('   ✅ All essential tests passed! Ready for manual testing.');
      console.log('   📋 Use the manual test checklist: scripts/manual-test-checklist.md');
      console.log('   🧪 Run full test suite: npm run test:all');
    } else if (testResults.failed <= 2) {
      console.log('   ⚠️  Minor issues detected. Proceed with manual testing but note the issues.');
      console.log('   🔧 Fix the failed tests before deployment.');
    } else {
      console.log('   ❌ Multiple issues detected. Fix the failed tests before proceeding.');
      console.log('   🛠️  Check server logs and database connectivity.');
    }
    
    // Known issues reminder
    console.log('\n🔧 Known Issues to Expect:');
    console.log('   - State data API returns 400 for invalid parameters (expected)');
    console.log('   - PAC financial data may have null values (known issue)');
    console.log('   - Some endpoints may return mock data (ready for real data)');
    console.log('   - Frontend pages may have JavaScript hydration issues (APIs working)');
    
    // Exit with appropriate code
    process.exit(testResults.failed > 2 ? 1 : 0);
    
  } catch (error) {
    console.error('❌ Quick verification failed:', error);
    process.exit(1);
  }
}

// Handle errors
process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled Promise Rejection:', error);
  process.exit(1);
});

// Run verification
runQuickVerification(); 