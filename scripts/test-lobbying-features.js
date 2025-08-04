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

async function testPACsAPI() {
  console.log('\n🏛️ Testing PACs API');
  
  // Test basic PACs endpoint
  await testEndpoint('/api/pacs');
  
  // Test PACs with filters
  await testEndpoint('/api/pacs', { election_year: '2024' });
  await testEndpoint('/api/pacs', { state: 'CA' });
  await testEndpoint('/api/pacs', { party: 'DEM' });
  await testEndpoint('/api/pacs', { min_receipts: '1000000' });
  await testEndpoint('/api/pacs', { max_receipts: '5000000' });
  await testEndpoint('/api/pacs', { limit: '10' });
  
  // Test PAC search
  await testEndpoint('/api/pacs', { name: 'democratic' });
  await testEndpoint('/api/pacs', { committee_id: 'C00123456' });
}

async function testLobbyingOverview() {
  console.log('\n📊 Testing Lobbying Overview');
  
  // Test lobbying overview endpoint
  await testEndpoint('/api/lobbying/overview');
  
  // Test lobbying overview with filters
  await testEndpoint('/api/lobbying/overview', { year: '2024' });
  await testEndpoint('/api/lobbying/overview', { sector: 'defense' });
  await testEndpoint('/api/lobbying/overview', { state: 'CA' });
}

async function testOrganizationsAPI() {
  console.log('\n🏢 Testing Organizations API');
  
  // Test organizations endpoint
  await testEndpoint('/api/lobbying/organizations');
  
  // Test organizations with filters
  await testEndpoint('/api/lobbying/organizations', { name: 'microsoft' });
  await testEndpoint('/api/lobbying/organizations', { sector: 'technology' });
  await testEndpoint('/api/lobbying/organizations', { state: 'WA' });
  await testEndpoint('/api/lobbying/organizations', { min_spending: '1000000' });
  await testEndpoint('/api/lobbying/organizations', { limit: '10' });
}

async function testRevolvingDoorAPI() {
  console.log('\n🚪 Testing Revolving Door API');
  
  // Test revolving door endpoint
  await testEndpoint('/api/lobbying/revolving-door');
  
  // Test revolving door with filters
  await testEndpoint('/api/lobbying/revolving-door', { name: 'smith' });
  await testEndpoint('/api/lobbying/revolving-door', { former_office: 'congress' });
  await testEndpoint('/api/lobbying/revolving-door', { current_employer: 'lobbying' });
  await testEndpoint('/api/lobbying/revolving-door', { state: 'DC' });
  await testEndpoint('/api/lobbying/revolving-door', { limit: '10' });
}

async function testForeignLobbyAPI() {
  console.log('\n🌍 Testing Foreign Lobby API');
  
  // Test foreign lobby endpoint
  await testEndpoint('/api/lobbying/foreign');
  
  // Test foreign lobby with filters
  await testEndpoint('/api/lobbying/foreign', { country: 'china' });
  await testEndpoint('/api/lobbying/foreign', { client: 'foreign' });
  await testEndpoint('/api/lobbying/foreign', { min_spending: '100000' });
  await testEndpoint('/api/lobbying/foreign', { year: '2024' });
  await testEndpoint('/api/lobbying/foreign', { limit: '10' });
}

async function testPACFinancialData() {
  console.log('\n💰 Testing PAC Financial Data');
  
  // Test PAC financial details
  await testEndpoint('/api/pacs', { 
    committee_id: 'C00123456',
    include_financials: 'true'
  });
  
  // Test PAC receipts and disbursements
  await testEndpoint('/api/pacs', {
    election_year: '2024',
    include_receipts: 'true'
  });
  
  await testEndpoint('/api/pacs', {
    election_year: '2024',
    include_disbursements: 'true'
  });
  
  // Test PAC contribution analysis
  await testEndpoint('/api/pacs', {
    committee_id: 'C00123456',
    include_contributions: 'true'
  });
}

async function testLobbyingDataIntegration() {
  console.log('\n🔗 Testing Lobbying Data Integration');
  
  // Test cross-references between PACs and organizations
  await testEndpoint('/api/pacs', {
    organization_id: 'O00123456',
    election_year: '2024'
  });
  
  // Test lobbying spending by sector
  await testEndpoint('/api/lobbying/overview', {
    sector: 'defense',
    year: '2024',
    include_details: 'true'
  });
  
  // Test organization lobbying history
  await testEndpoint('/api/lobbying/organizations', {
    name: 'microsoft',
    include_history: 'true'
  });
}

async function testErrorHandling() {
  console.log('\n🚨 Testing Error Handling');
  
  // Test invalid PAC parameters
  await testEndpoint('/api/pacs', { invalid_param: 'test' });
  await testEndpoint('/api/pacs', { min_receipts: 'invalid' });
  
  // Test invalid lobbying parameters
  await testEndpoint('/api/lobbying/overview', { year: 'invalid' });
  await testEndpoint('/api/lobbying/organizations', { min_spending: 'invalid' });
  
  // Test non-existent data
  await testEndpoint('/api/pacs', { committee_id: 'NONEXISTENT' });
  await testEndpoint('/api/lobbying/organizations', { name: 'NONEXISTENT_ORG' });
}

async function testPerformance() {
  console.log('\n⚡ Testing Performance');
  
  const performanceTests = [
    { endpoint: '/api/pacs', params: { election_year: '2024' } },
    { endpoint: '/api/lobbying/overview', params: { year: '2024' } },
    { endpoint: '/api/lobbying/organizations', params: { limit: '10' } },
    { endpoint: '/api/lobbying/revolving-door', params: { limit: '10' } },
    { endpoint: '/api/lobbying/foreign', params: { year: '2024' } }
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
  
  // Test that PAC data includes required fields
  const pacResult = await testEndpoint('/api/pacs', { limit: '1' });
  if (pacResult.success && pacResult.data) {
    const hasRequiredFields = pacResult.data.pacs && 
                             Array.isArray(pacResult.data.pacs) && 
                             pacResult.data.pacs.length > 0;
    logTest('PAC Data Structure', hasRequiredFields, 
      hasRequiredFields ? 'PAC data includes required fields' : 'PAC data missing required fields');
  }
  
  // Test that lobbying overview includes required fields
  const lobbyingResult = await testEndpoint('/api/lobbying/overview');
  if (lobbyingResult.success && lobbyingResult.data) {
    const hasRequiredFields = lobbyingResult.data.total_spending !== undefined;
    logTest('Lobbying Overview Structure', hasRequiredFields,
      hasRequiredFields ? 'Lobbying overview includes required fields' : 'Lobbying overview missing required fields');
  }
}

async function runAllTests() {
  console.log('🏛️ Testing Lobbying & Groups Features');
  console.log('='.repeat(50));
  
  try {
    await testPACsAPI();
    await testLobbyingOverview();
    await testOrganizationsAPI();
    await testRevolvingDoorAPI();
    await testForeignLobbyAPI();
    await testPACFinancialData();
    await testLobbyingDataIntegration();
    await testErrorHandling();
    await testPerformance();
    await testDataCompleteness();
    
    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('📊 LOBBYING & GROUPS TEST SUMMARY');
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
    console.log('   - PAC financial data (receipt/disbursement amounts may be null)');
    console.log('   - Some lobbying data may be mock data (ready for real data integration)');
    
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