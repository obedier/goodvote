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
  '/api/state-data',
  '/api/search',
  '/api/search/suggestions',
  '/api/donors',
  '/api/contributors',
  '/api/lobbying/overview',
  '/api/lobbying/organizations',
  '/api/lobbying/revolving-door',
  '/api/lobbying/foreign',
  '/api/elections/overview',
  '/api/elections/presidential',
  '/api/elections/congressional',
  '/api/elections/outside-spending',
  '/api/elections/get-local',
  '/api/politicians',
  '/api/candidates'
];

// Test results tracking
const testResults = {
  passed: 0,
  failed: 0,
  warnings: 0,
  errors: [],
  details: []
};

// Utility functions
function logTest(name, passed, details = '', isWarning = false) {
  const status = passed ? '✅ PASS' : '❌ FAIL';
  const warningStatus = isWarning ? '⚠️  WARN' : '';
  console.log(`${status}${warningStatus} ${name}`);
  if (details) console.log(`   ${details}`);
  
  if (passed) {
    testResults.passed++;
  } else if (isWarning) {
    testResults.warnings++;
  } else {
    testResults.failed++;
  }
  
  testResults.details.push({ name, passed, details, isWarning });
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

async function testCongressAPI() {
  console.log('\n🏛️ Testing Congress API');
  
  // Test basic congress endpoint
  await testEndpoint('/api/congress');
  
  // Test with filters
  await testEndpoint('/api/congress', { party: 'DEM' });
  await testEndpoint('/api/congress', { chamber: 'H' });
  await testEndpoint('/api/congress', { state: 'CA' });
  await testEndpoint('/api/congress', { election_year: '2024' });
  await testEndpoint('/api/congress', { limit: '10' });
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
  await testEndpoint('/api/contributions', { candidate_id: 'H8MI13250' }); // Rashida Tlaib
  await testEndpoint('/api/contributions', { committee_id: 'C00123456' });
}

async function testExpendituresAPI() {
  console.log('\n📊 Testing Expenditures API');
  
  // Test basic expenditures endpoint
  await testEndpoint('/api/expenditures');
  
  // Test with filters
  await testEndpoint('/api/expenditures', { election_year: '2024' });
  await testEndpoint('/api/expenditures', { min_amount: '10000' });
  await testEndpoint('/api/expenditures', { limit: '10' });
  await testEndpoint('/api/expenditures', { category: 'media' });
  await testEndpoint('/api/expenditures', { category: 'digital' });
  await testEndpoint('/api/expenditures', { category: 'consulting' });
}

async function testPACsAPI() {
  console.log('\n🏛️ Testing PACs API');
  
  // Test basic PACs endpoint
  await testEndpoint('/api/pacs');
  
  // Test with filters
  await testEndpoint('/api/pacs', { election_year: '2024' });
  await testEndpoint('/api/pacs', { state: 'CA' });
  await testEndpoint('/api/pacs', { party: 'DEM' });
  await testEndpoint('/api/pacs', { min_receipts: '1000000' });
  await testEndpoint('/api/pacs', { limit: '10' });
  
  // Test PAC financial data (known issue)
  const pacFinancialResult = await testEndpoint('/api/pacs', { 
    committee_id: 'C00123456',
    include_financials: 'true'
  });
  
  if (pacFinancialResult.success && pacFinancialResult.data) {
    const hasFinancialData = pacFinancialResult.data.receipts !== null && 
                            pacFinancialResult.data.disbursements !== null;
    logTest('PAC Financial Data', hasFinancialData, 
      hasFinancialData ? 'PAC financial data available' : 'PAC financial data missing (known issue)');
  }
}

async function testFECOverviewAPI() {
  console.log('\n📋 Testing FEC Overview API');
  
  // Test FEC overview endpoint
  await testEndpoint('/api/fec-overview');
  
  // Test with filters
  await testEndpoint('/api/fec-overview', { election_year: '2024' });
  await testEndpoint('/api/fec-overview', { table: 'candidates' });
  await testEndpoint('/api/fec-overview', { table: 'committees' });
  await testEndpoint('/api/fec-overview', { table: 'contributions' });
}

async function testStateDataAPI() {
  console.log('\n🗺️ Testing State Data API');
  
  // Test state data endpoint
  await testEndpoint('/api/state-data');
  
  // Test with valid states
  await testEndpoint('/api/state-data', { state: 'CA' });
  await testEndpoint('/api/state-data', { state: 'NY' });
  await testEndpoint('/api/state-data', { state: 'TX' });
  
  // Test with invalid state (expected to fail)
  const invalidStateResult = await testEndpoint('/api/state-data', { state: 'INVALID_STATE' });
  if (!invalidStateResult.success) {
    logTest('State Data Error Handling', true, 'Correctly rejected invalid state parameter');
  }
}

async function testSearchAPI() {
  console.log('\n🔍 Testing Search API');
  
  // Test basic search endpoint
  await testEndpoint('/api/search');
  
  // Test search with queries
  await testEndpoint('/api/search', { q: 'trump' });
  await testEndpoint('/api/search', { q: 'biden' });
  await testEndpoint('/api/search', { q: 'microsoft' });
  
  // Test search with filters
  await testEndpoint('/api/search', { q: 'trump', type: 'politicians' });
  await testEndpoint('/api/search', { q: 'microsoft', type: 'organizations' });
  await testEndpoint('/api/search', { q: 'california', type: 'state' });
}

async function testSearchSuggestionsAPI() {
  console.log('\n💡 Testing Search Suggestions API');
  
  // Test suggestions endpoint
  await testEndpoint('/api/search/suggestions');
  
  // Test suggestions with query
  await testEndpoint('/api/search/suggestions', { q: 'tr' });
  await testEndpoint('/api/search/suggestions', { q: 'bi' });
  await testEndpoint('/api/search/suggestions', { q: 'micro' });
  
  // Test popular searches
  await testEndpoint('/api/search/suggestions', { popular: 'true' });
}

async function testDonorsAPI() {
  console.log('\n💰 Testing Donors API');
  
  // Test basic donors endpoint
  await testEndpoint('/api/donors');
  
  // Test donors with filters
  await testEndpoint('/api/donors', { name: 'smith' });
  await testEndpoint('/api/donors', { employer: 'microsoft' });
  await testEndpoint('/api/donors', { state: 'CA' });
  await testEndpoint('/api/donors', { min_amount: '1000' });
  await testEndpoint('/api/donors', { max_amount: '5000' });
  await testEndpoint('/api/donors', { election_year: '2024' });
  
  // Test donor lookup with multiple filters
  await testEndpoint('/api/donors', { 
    name: 'smith', 
    state: 'CA', 
    min_amount: '1000',
    election_year: '2024'
  });
}

async function testContributorsAPI() {
  console.log('\n👥 Testing Contributors API');
  
  // Test basic contributors endpoint
  await testEndpoint('/api/contributors');
  
  // Test contributors with filters
  await testEndpoint('/api/contributors', { candidate_id: 'H8MI13250' }); // Rashida Tlaib
  await testEndpoint('/api/contributors', { committee_id: 'C00123456' });
  await testEndpoint('/api/contributors', { election_year: '2024' });
  await testEndpoint('/api/contributors', { min_amount: '1000' });
  await testEndpoint('/api/contributors', { limit: '10' });
}

async function testLobbyingAPIs() {
  console.log('\n🏛️ Testing Lobbying APIs');
  
  // Test lobbying overview
  await testEndpoint('/api/lobbying/overview');
  await testEndpoint('/api/lobbying/overview', { year: '2024' });
  await testEndpoint('/api/lobbying/overview', { sector: 'defense' });
  
  // Test organizations
  await testEndpoint('/api/lobbying/organizations');
  await testEndpoint('/api/lobbying/organizations', { name: 'microsoft' });
  await testEndpoint('/api/lobbying/organizations', { sector: 'technology' });
  
  // Test revolving door
  await testEndpoint('/api/lobbying/revolving-door');
  await testEndpoint('/api/lobbying/revolving-door', { name: 'smith' });
  await testEndpoint('/api/lobbying/revolving-door', { former_office: 'congress' });
  
  // Test foreign lobby
  await testEndpoint('/api/lobbying/foreign');
  await testEndpoint('/api/lobbying/foreign', { country: 'china' });
  await testEndpoint('/api/lobbying/foreign', { year: '2024' });
}

async function testElectionsAPIs() {
  console.log('\n🗳️ Testing Elections APIs');
  
  // Test elections overview
  await testEndpoint('/api/elections/overview');
  await testEndpoint('/api/elections/overview', { year: '2024' });
  await testEndpoint('/api/elections/overview', { type: 'presidential' });
  
  // Test presidential elections
  await testEndpoint('/api/elections/presidential');
  await testEndpoint('/api/elections/presidential', { year: '2024' });
  await testEndpoint('/api/elections/presidential', { candidate: 'trump' });
  
  // Test congressional elections
  await testEndpoint('/api/elections/congressional');
  await testEndpoint('/api/elections/congressional', { year: '2024' });
  await testEndpoint('/api/elections/congressional', { chamber: 'house' });
  
  // Test outside spending
  await testEndpoint('/api/elections/outside-spending');
  await testEndpoint('/api/elections/outside-spending', { year: '2024' });
  await testEndpoint('/api/elections/outside-spending', { state: 'CA' });
  
  // Test get local tool
  await testEndpoint('/api/elections/get-local');
  await testEndpoint('/api/elections/get-local', { state: 'CA' });
  await testEndpoint('/api/elections/get-local', { zip: '90210' });
}

async function testPoliticiansAPI() {
  console.log('\n👤 Testing Politicians API');
  
  // Test politicians endpoint
  await testEndpoint('/api/politicians');
  
  // Test individual politician
  await testEndpoint('/api/politicians/H8MI13250'); // Rashida Tlaib
}

async function testCandidatesAPI() {
  console.log('\n🏃 Testing Candidates API');
  
  // Test candidates endpoint
  await testEndpoint('/api/candidates');
  
  // Test individual candidate
  await testEndpoint('/api/candidates/H8MI13250'); // Rashida Tlaib
  
  // Test candidates with filters
  await testEndpoint('/api/candidates', { election_year: '2024' });
  await testEndpoint('/api/candidates', { state: 'CA' });
  await testEndpoint('/api/candidates', { office: 'house' });
}

async function testErrorHandling() {
  console.log('\n🚨 Testing Error Handling');
  
  // Test invalid parameters
  await testEndpoint('/api/congress', { invalid_param: 'test' });
  await testEndpoint('/api/contributions', { min_amount: 'invalid' });
  await testEndpoint('/api/expenditures', { election_year: 'invalid' });
  
  // Test empty queries
  await testEndpoint('/api/search', { q: '' });
  await testEndpoint('/api/search/suggestions', { q: '' });
  
  // Test very long queries
  const longQuery = 'a'.repeat(1000);
  await testEndpoint('/api/search', { q: longQuery });
  
  // Test non-existent data
  await testEndpoint('/api/candidates', { candidate_id: 'NONEXISTENT' });
  await testEndpoint('/api/pacs', { committee_id: 'NONEXISTENT' });
}

async function testResponseFormat() {
  console.log('\n📋 Testing Response Format');
  
  // Test that responses have expected structure
  const congressResult = await testEndpoint('/api/congress', { limit: '1' });
  if (congressResult.success && congressResult.data) {
    const hasExpectedStructure = congressResult.data.congress && 
                                Array.isArray(congressResult.data.congress);
    logTest('Congress Response Format', hasExpectedStructure,
      hasExpectedStructure ? 'Response has expected structure' : 'Response missing expected structure');
  }
  
  const searchResult = await testEndpoint('/api/search', { q: 'trump', limit: '1' });
  if (searchResult.success && searchResult.data) {
    const hasExpectedStructure = searchResult.data.results !== undefined;
    logTest('Search Response Format', hasExpectedStructure,
      hasExpectedStructure ? 'Response has expected structure' : 'Response missing expected structure');
  }
}

async function testPerformance() {
  console.log('\n⚡ Testing Performance');
  
  const performanceTests = [
    { endpoint: '/api/congress', params: {} },
    { endpoint: '/api/contributions', params: { limit: '100' } },
    { endpoint: '/api/expenditures', params: { limit: '100' } },
    { endpoint: '/api/search', params: { q: 'trump' } },
    { endpoint: '/api/fec-overview', params: {} },
    { endpoint: '/api/pacs', params: { election_year: '2024' } }
  ];
  
  for (const test of performanceTests) {
    const startTime = Date.now();
    const result = await testEndpoint(test.endpoint, test.params);
    const duration = Date.now() - startTime;
    
    const isFast = duration < 3000; // 3 seconds max
    logTest(`${test.endpoint} Performance`, isFast, `Response time: ${duration}ms`);
  }
}

async function runAllTests() {
  console.log('🧪 Testing All API Endpoints');
  console.log('='.repeat(50));
  
  try {
    await testCongressAPI();
    await testContributionsAPI();
    await testExpendituresAPI();
    await testPACsAPI();
    await testFECOverviewAPI();
    await testStateDataAPI();
    await testSearchAPI();
    await testSearchSuggestionsAPI();
    await testDonorsAPI();
    await testContributorsAPI();
    await testLobbyingAPIs();
    await testElectionsAPIs();
    await testPoliticiansAPI();
    await testCandidatesAPI();
    await testErrorHandling();
    await testResponseFormat();
    await testPerformance();
    
    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('📊 API TEST SUMMARY');
    console.log('='.repeat(50));
    
    console.log(`✅ Passed: ${testResults.passed}`);
    console.log(`⚠️  Warnings: ${testResults.warnings}`);
    console.log(`❌ Failed: ${testResults.failed}`);
    console.log(`📈 Success Rate: ${Math.round((testResults.passed / (testResults.passed + testResults.failed)) * 100)}%`);
    
    if (testResults.failed > 0) {
      console.log('\n❌ Failed Tests:');
      testResults.details
        .filter(test => !test.passed && !test.isWarning)
        .forEach(test => console.log(`   - ${test.name}: ${test.details}`));
    }
    
    if (testResults.warnings > 0) {
      console.log('\n⚠️  Warnings:');
      testResults.details
        .filter(test => test.isWarning)
        .forEach(test => console.log(`   - ${test.name}: ${test.details}`));
    }
    
    // Known issues
    console.log('\n🔧 Known Issues to Address:');
    console.log('   - State data API test failing (400 error for invalid parameters) - expected behavior');
    console.log('   - Donor API returning errors (needs debugging)');
    console.log('   - PAC financial data (receipt/disbursement amounts may be null)');
    console.log('   - Some endpoints may return mock data (ready for real data integration)');
    
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