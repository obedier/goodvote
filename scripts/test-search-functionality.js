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
    const responseTime = duration < 5000; // 5 seconds max for search
    
    logTest(`${endpoint}`, isSuccess && responseTime, 
      `Status: ${response.status}, Time: ${duration}ms, Success: ${isSuccess}`);
    
    return { success: isSuccess, responseTime, data };
  } catch (error) {
    logTest(`${endpoint}`, false, error.message);
    return { success: false, error: error.message };
  }
}

async function testGlobalSearch() {
  console.log('\n🔍 Testing Global Search Functionality');
  
  // Test basic search endpoint
  await testEndpoint('/api/search');
  
  // Test search with query parameters
  await testEndpoint('/api/search', { q: 'trump' });
  await testEndpoint('/api/search', { q: 'biden' });
  await testEndpoint('/api/search', { q: 'microsoft' });
  
  // Test search with filters
  await testEndpoint('/api/search', { q: 'trump', type: 'politicians' });
  await testEndpoint('/api/search', { q: 'microsoft', type: 'organizations' });
  await testEndpoint('/api/search', { q: 'california', type: 'state' });
}

async function testSearchSuggestions() {
  console.log('\n💡 Testing Search Suggestions');
  
  // Test suggestions endpoint
  await testEndpoint('/api/search/suggestions');
  
  // Test suggestions with query
  await testEndpoint('/api/search/suggestions', { q: 'tr' });
  await testEndpoint('/api/search/suggestions', { q: 'bi' });
  await testEndpoint('/api/search/suggestions', { q: 'micro' });
  
  // Test popular searches
  await testEndpoint('/api/search/suggestions', { popular: 'true' });
}

async function testDonorLookup() {
  console.log('\n💰 Testing Donor Lookup');
  
  // Test basic donor endpoint
  await testEndpoint('/api/donors');
  
  // Test donor search with filters
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

async function testAdvancedFilters() {
  console.log('\n🔧 Testing Advanced Filters');
  
  // Test contribution search with advanced filters
  await testEndpoint('/api/contributions', { 
    election_year: '2024',
    min_amount: '1000',
    max_amount: '5000',
    state: 'CA',
    party: 'DEM'
  });
  
  // Test expenditure search with advanced filters
  await testEndpoint('/api/expenditures', {
    election_year: '2024',
    min_amount: '10000',
    category: 'media',
    state: 'CA'
  });
  
  // Test search with type filters
  await testEndpoint('/api/search', {
    q: 'trump',
    type: 'politicians',
    election_year: '2024'
  });
}

async function testDataExport() {
  console.log('\n📊 Testing Data Export Functionality');
  
  // Test export parameters
  await testEndpoint('/api/contributions', { 
    export: 'csv',
    limit: '100'
  });
  
  await testEndpoint('/api/expenditures', {
    export: 'json',
    limit: '50'
  });
  
  await testEndpoint('/api/search', {
    q: 'trump',
    export: 'csv',
    limit: '100'
  });
}

async function testErrorHandling() {
  console.log('\n🚨 Testing Error Handling');
  
  // Test invalid search parameters
  await testEndpoint('/api/search', { invalid_param: 'test' });
  
  // Test empty search
  await testEndpoint('/api/search', { q: '' });
  
  // Test very long search query
  const longQuery = 'a'.repeat(1000);
  await testEndpoint('/api/search', { q: longQuery });
  
  // Test invalid filters
  await testEndpoint('/api/donors', { min_amount: 'invalid' });
  await testEndpoint('/api/contributions', { election_year: 'invalid' });
}

async function testPerformance() {
  console.log('\n⚡ Testing Search Performance');
  
  const performanceTests = [
    { endpoint: '/api/search', params: { q: 'trump' } },
    { endpoint: '/api/search/suggestions', params: { q: 'tr' } },
    { endpoint: '/api/donors', params: { name: 'smith' } },
    { endpoint: '/api/contributors', params: { election_year: '2024' } }
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
  console.log('🔍 Testing Search & Data Exploration Features');
  console.log('='.repeat(50));
  
  try {
    await testGlobalSearch();
    await testSearchSuggestions();
    await testDonorLookup();
    await testContributorsAPI();
    await testAdvancedFilters();
    await testDataExport();
    await testErrorHandling();
    await testPerformance();
    
    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('📊 SEARCH & DATA EXPLORATION TEST SUMMARY');
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