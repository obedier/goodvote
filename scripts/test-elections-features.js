#!/usr/bin/env node

const fetch = require('node-fetch');

// Configuration
const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

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
    const responseTime = duration < 5000; // 5 seconds max
    
    logTest(`${endpoint}`, isSuccess && responseTime, 
      `Status: ${response.status}, Time: ${duration}ms, Success: ${isSuccess}`);
    
    return { success: isSuccess, responseTime, data };
  } catch (error) {
    logTest(`${endpoint}`, false, error.message);
    return { success: false, error: error.message };
  }
}

async function testElectionsOverview() {
  console.log('\n🗳️ Testing Elections Overview');
  
  // Test elections overview endpoint
  await testEndpoint('/api/elections/overview');
  
  // Test elections overview with filters
  await testEndpoint('/api/elections/overview', { year: '2024' });
  await testEndpoint('/api/elections/overview', { type: 'presidential' });
  await testEndpoint('/api/elections/overview', { type: 'congressional' });
  await testEndpoint('/api/elections/overview', { state: 'CA' });
}

async function testPresidentialElections() {
  console.log('\n🇺🇸 Testing Presidential Elections');
  
  // Test presidential elections endpoint
  await testEndpoint('/api/elections/presidential');
  
  // Test presidential elections with filters
  await testEndpoint('/api/elections/presidential', { year: '2024' });
  await testEndpoint('/api/elections/presidential', { year: '2020' });
  await testEndpoint('/api/elections/presidential', { candidate: 'trump' });
  await testEndpoint('/api/elections/presidential', { party: 'DEM' });
}

async function testCongressionalElections() {
  console.log('\n🏛️ Testing Congressional Elections');
  
  // Test congressional elections endpoint
  await testEndpoint('/api/elections/congressional');
  
  // Test congressional elections with filters
  await testEndpoint('/api/elections/congressional', { year: '2024' });
  await testEndpoint('/api/elections/congressional', { chamber: 'house' });
  await testEndpoint('/api/elections/congressional', { chamber: 'senate' });
  await testEndpoint('/api/elections/congressional', { state: 'CA' });
  await testEndpoint('/api/elections/congressional', { district: '1' });
}

async function testOutsideSpending() {
  console.log('\n💰 Testing Outside Spending');
  
  // Test outside spending endpoint
  await testEndpoint('/api/elections/outside-spending');
  
  // Test outside spending with filters
  await testEndpoint('/api/elections/outside-spending', { year: '2024' });
  await testEndpoint('/api/elections/outside-spending', { state: 'CA' });
  await testEndpoint('/api/elections/outside-spending', { race_type: 'presidential' });
  await testEndpoint('/api/elections/outside-spending', { race_type: 'congressional' });
  await testEndpoint('/api/elections/outside-spending', { min_amount: '1000000' });
  await testEndpoint('/api/elections/outside-spending', { limit: '10' });
}

async function testGetLocalTool() {
  console.log('\n📍 Testing Get Local! Tool');
  
  // Test get local endpoint
  await testEndpoint('/api/elections/get-local');
  
  // Test get local with state
  await testEndpoint('/api/elections/get-local', { state: 'CA' });
  await testEndpoint('/api/elections/get-local', { state: 'NY' });
  await testEndpoint('/api/elections/get-local', { state: 'TX' });
  
  // Test get local with zip code
  await testEndpoint('/api/elections/get-local', { zip: '90210' });
  await testEndpoint('/api/elections/get-local', { zip: '10001' });
  
  // Test get local with filters
  await testEndpoint('/api/elections/get-local', { 
    state: 'CA',
    election_year: '2024'
  });
  
  await testEndpoint('/api/elections/get-local', {
    zip: '90210',
    include_officials: 'true'
  });
}

async function testStateData() {
  console.log('\n🗺️ Testing State Data');
  
  // Test state data endpoint
  await testEndpoint('/api/state-data');
  
  // Test state data with filters
  await testEndpoint('/api/state-data', { state: 'CA' });
  await testEndpoint('/api/state-data', { state: 'NY' });
  await testEndpoint('/api/state-data', { election_year: '2024' });
  await testEndpoint('/api/state-data', { include_officials: 'true' });
  await testEndpoint('/api/state-data', { include_contributions: 'true' });
}

async function testCampaignFinanceByRace() {
  console.log('\n📊 Testing Campaign Finance by Race');
  
  // Test race-specific campaign finance
  await testEndpoint('/api/elections/race-finance', { 
    race_id: 'CA-SEN-2024' 
  });
  
  await testEndpoint('/api/elections/race-finance', {
    state: 'CA',
    office: 'senate',
    year: '2024'
  });
  
  await testEndpoint('/api/elections/race-finance', {
    state: 'CA',
    office: 'house',
    district: '1',
    year: '2024'
  });
}

async function testElectionAnalytics() {
  console.log('\n📈 Testing Election Analytics');
  
  // Test election analytics
  await testEndpoint('/api/elections/analytics', { year: '2024' });
  await testEndpoint('/api/elections/analytics', { 
    year: '2024',
    type: 'fundraising_totals'
  });
  
  await testEndpoint('/api/elections/analytics', {
    year: '2024',
    type: 'outside_spending'
  });
  
  await testEndpoint('/api/elections/analytics', {
    year: '2024',
    type: 'contribution_analysis'
  });
}

async function testOutsideSpendingBreakdown() {
  console.log('\n🔍 Testing Outside Spending Breakdown');
  
  // Test outside spending categories
  await testEndpoint('/api/elections/outside-spending', {
    year: '2024',
    category: 'media'
  });
  
  await testEndpoint('/api/elections/outside-spending', {
    year: '2024',
    category: 'digital'
  });
  
  await testEndpoint('/api/elections/outside-spending', {
    year: '2024',
    category: 'consulting'
  });
  
  // Test outside spending by committee
  await testEndpoint('/api/elections/outside-spending', {
    year: '2024',
    committee_id: 'C00123456'
  });
}

async function testErrorHandling() {
  console.log('\n🚨 Testing Error Handling');
  
  // Test invalid election parameters
  await testEndpoint('/api/elections/overview', { year: 'invalid' });
  await testEndpoint('/api/elections/presidential', { year: '9999' });
  
  // Test invalid state data
  await testEndpoint('/api/state-data', { state: 'INVALID_STATE' });
  await testEndpoint('/api/elections/get-local', { state: 'INVALID_STATE' });
  
  // Test invalid outside spending parameters
  await testEndpoint('/api/elections/outside-spending', { min_amount: 'invalid' });
  await testEndpoint('/api/elections/outside-spending', { category: 'invalid_category' });
}

async function testPerformance() {
  console.log('\n⚡ Testing Performance');
  
  const performanceTests = [
    { endpoint: '/api/elections/overview', params: { year: '2024' } },
    { endpoint: '/api/elections/presidential', params: { year: '2024' } },
    { endpoint: '/api/elections/congressional', params: { year: '2024' } },
    { endpoint: '/api/elections/outside-spending', params: { year: '2024' } },
    { endpoint: '/api/elections/get-local', params: { state: 'CA' } },
    { endpoint: '/api/state-data', params: { state: 'CA' } }
  ];
  
  for (const test of performanceTests) {
    const startTime = Date.now();
    const result = await testEndpoint(test.endpoint, test.params);
    const duration = Date.now() - startTime;
    
    const isFast = duration < 3000; // 3 seconds max
    logTest(`${test.endpoint} Performance`, isFast, `Response time: ${duration}ms`);
  }
}

async function testDataCompleteness() {
  console.log('\n📋 Testing Data Completeness');
  
  // Test that election data includes required fields
  const electionResult = await testEndpoint('/api/elections/overview', { year: '2024' });
  if (electionResult.success && electionResult.data) {
    const hasRequiredFields = electionResult.data.total_raised !== undefined;
    logTest('Election Data Structure', hasRequiredFields,
      hasRequiredFields ? 'Election data includes required fields' : 'Election data missing required fields');
  }
  
  // Test that outside spending data includes required fields
  const outsideSpendingResult = await testEndpoint('/api/elections/outside-spending', { year: '2024' });
  if (outsideSpendingResult.success && outsideSpendingResult.data) {
    const hasRequiredFields = outsideSpendingResult.data.total_spending !== undefined;
    logTest('Outside Spending Data Structure', hasRequiredFields,
      hasRequiredFields ? 'Outside spending data includes required fields' : 'Outside spending data missing required fields');
  }
}

async function runAllTests() {
  console.log('🗳️ Testing Elections & Outside Spending Features');
  console.log('='.repeat(50));
  
  try {
    await testElectionsOverview();
    await testPresidentialElections();
    await testCongressionalElections();
    await testOutsideSpending();
    await testGetLocalTool();
    await testStateData();
    await testCampaignFinanceByRace();
    await testElectionAnalytics();
    await testOutsideSpendingBreakdown();
    await testErrorHandling();
    await testPerformance();
    await testDataCompleteness();
    
    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('📊 ELECTIONS & OUTSIDE SPENDING TEST SUMMARY');
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
    
    // Known issues
    console.log('\n🔧 Known Issues to Address:');
    console.log('   - State data API test failing (400 error for invalid parameters) - expected behavior');
    console.log('   - Some election data may be limited to available FEC data');
    
    // Exit with appropriate code
    process.exit(testResults.failed > 0 ? 1 : 0);
    
  } catch (error) {
    console.error('❌ Test execution failed:', error);
    process.exit(1);
  }
}

// Handle errors
process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled Promise Rejection:', error);
  process.exit(1);
});

// Run tests
runAllTests(); 