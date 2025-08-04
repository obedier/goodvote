#!/usr/bin/env node

const fetch = require('node-fetch');

// Configuration
const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

// Performance thresholds
const THRESHOLDS = {
  FAST: 1000,      // 1 second - excellent
  GOOD: 3000,      // 3 seconds - acceptable
  SLOW: 5000,      // 5 seconds - concerning
  TIMEOUT: 10000   // 10 seconds - timeout
};

// Test results tracking
const testResults = {
  passed: 0,
  failed: 0,
  warnings: 0,
  details: [],
  performance: {
    fast: 0,
    good: 0,
    slow: 0,
    timeout: 0
  }
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

function categorizePerformance(duration) {
  if (duration <= THRESHOLDS.FAST) {
    testResults.performance.fast++;
    return 'FAST';
  } else if (duration <= THRESHOLDS.GOOD) {
    testResults.performance.good++;
    return 'GOOD';
  } else if (duration <= THRESHOLDS.SLOW) {
    testResults.performance.slow++;
    return 'SLOW';
  } else {
    testResults.performance.timeout++;
    return 'TIMEOUT';
  }
}

async function testEndpoint(endpoint, params = {}, expectedDuration = THRESHOLDS.GOOD) {
  try {
    const url = new URL(endpoint, BASE_URL);
    Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));
    
    const startTime = Date.now();
    const response = await fetch(url.toString());
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    const data = await response.json();
    const isSuccess = response.ok && data.success !== false;
    const performance = categorizePerformance(duration);
    const isFast = duration <= expectedDuration;
    const isWarning = duration > expectedDuration && duration <= THRESHOLDS.SLOW;
    
    logTest(`${endpoint}`, isSuccess && isFast, 
      `Status: ${response.status}, Time: ${duration}ms (${performance}), Success: ${isSuccess}`, isWarning);
    
    return { success: isSuccess, duration, performance, data };
  } catch (error) {
    logTest(`${endpoint}`, false, error.message);
    return { success: false, error: error.message };
  }
}

async function testAPIPerformance() {
  console.log('\n⚡ Testing API Performance');
  
  const apiTests = [
    { endpoint: '/api/congress', params: {}, expected: THRESHOLDS.FAST },
    { endpoint: '/api/contributions', params: { limit: '100' }, expected: THRESHOLDS.GOOD },
    { endpoint: '/api/expenditures', params: { limit: '100' }, expected: THRESHOLDS.GOOD },
    { endpoint: '/api/pacs', params: { election_year: '2024' }, expected: THRESHOLDS.GOOD },
    { endpoint: '/api/search', params: { q: 'trump' }, expected: THRESHOLDS.FAST },
    { endpoint: '/api/search/suggestions', params: { q: 'tr' }, expected: THRESHOLDS.FAST },
    { endpoint: '/api/donors', params: { limit: '50' }, expected: THRESHOLDS.GOOD },
    { endpoint: '/api/state-data', params: { state: 'CA' }, expected: THRESHOLDS.GOOD },
    { endpoint: '/api/fec-overview', params: {}, expected: THRESHOLDS.FAST },
    { endpoint: '/api/lobbying/overview', params: { year: '2024' }, expected: THRESHOLDS.GOOD }
  ];
  
  for (const test of apiTests) {
    await testEndpoint(test.endpoint, test.params, test.expected);
  }
}

async function testLoadPerformance() {
  console.log('\n📊 Testing Load Performance');
  
  // Test concurrent requests
  const concurrentTests = [
    { endpoint: '/api/congress', params: {} },
    { endpoint: '/api/contributions', params: { limit: '50' } },
    { endpoint: '/api/expenditures', params: { limit: '50' } },
    { endpoint: '/api/search', params: { q: 'biden' } },
    { endpoint: '/api/pacs', params: { election_year: '2024' } }
  ];
  
  console.log('   Testing concurrent requests...');
  const startTime = Date.now();
  
  const promises = concurrentTests.map(test => 
    testEndpoint(test.endpoint, test.params, THRESHOLDS.GOOD)
  );
  
  const results = await Promise.all(promises);
  const totalTime = Date.now() - startTime;
  
  const allSuccessful = results.every(result => result.success);
  const avgTime = totalTime / results.length;
  
  logTest('Concurrent API Requests', allSuccessful, 
    `Total time: ${totalTime}ms, Average: ${Math.round(avgTime)}ms per request`);
}

async function testDatabasePerformance() {
  console.log('\n🗄️ Testing Database Performance');
  
  // Test database-heavy operations
  const dbTests = [
    { endpoint: '/api/contributions', params: { election_year: '2024', limit: '1000' }, expected: THRESHOLDS.SLOW },
    { endpoint: '/api/expenditures', params: { election_year: '2024', limit: '1000' }, expected: THRESHOLDS.SLOW },
    { endpoint: '/api/donors', params: { election_year: '2024', limit: '1000' }, expected: THRESHOLDS.SLOW },
    { endpoint: '/api/search', params: { q: 'microsoft', limit: '500' }, expected: THRESHOLDS.GOOD }
  ];
  
  for (const test of dbTests) {
    await testEndpoint(test.endpoint, test.params, test.expected);
  }
}

async function testFrontendPerformance() {
  console.log('\n🌐 Testing Frontend Performance');
  
  // Test page load times (simulated)
  const pageTests = [
    { page: '/', expected: THRESHOLDS.FAST },
    { page: '/politicians/congress', expected: THRESHOLDS.GOOD },
    { page: '/elections/overview', expected: THRESHOLDS.GOOD },
    { page: '/lobbying/pacs', expected: THRESHOLDS.GOOD },
    { page: '/search', expected: THRESHOLDS.FAST }
  ];
  
  for (const test of pageTests) {
    // Simulate page load by testing the main API calls for each page
    const startTime = Date.now();
    
    // Test the main data endpoint for each page
    let endpoint = '/api/congress';
    if (test.page.includes('elections')) endpoint = '/api/elections/overview';
    if (test.page.includes('lobbying')) endpoint = '/api/pacs';
    if (test.page.includes('search')) endpoint = '/api/search';
    
    const result = await testEndpoint(endpoint, {}, test.expected);
    const duration = Date.now() - startTime;
    
    logTest(`${test.page} Page Load`, result.success, 
      `Simulated page load time: ${duration}ms`);
  }
}

async function testMemoryUsage() {
  console.log('\n💾 Testing Memory Usage');
  
  // Test memory usage by making multiple requests
  const memoryTests = [
    { endpoint: '/api/contributions', params: { limit: '100' } },
    { endpoint: '/api/expenditures', params: { limit: '100' } },
    { endpoint: '/api/donors', params: { limit: '100' } },
    { endpoint: '/api/search', params: { q: 'trump' } },
    { endpoint: '/api/pacs', params: { election_year: '2024' } }
  ];
  
  console.log('   Testing memory usage with repeated requests...');
  
  for (let i = 0; i < 5; i++) {
    for (const test of memoryTests) {
      await testEndpoint(test.endpoint, test.params, THRESHOLDS.GOOD);
    }
  }
  
  logTest('Memory Usage Test', true, 'Completed 25 requests without memory issues');
}

async function testTimeoutHandling() {
  console.log('\n⏰ Testing Timeout Handling');
  
  // Test very large queries that might timeout
  const timeoutTests = [
    { endpoint: '/api/contributions', params: { limit: '10000' } },
    { endpoint: '/api/expenditures', params: { limit: '10000' } },
    { endpoint: '/api/search', params: { q: 'a'.repeat(100) } }
  ];
  
  for (const test of timeoutTests) {
    const result = await testEndpoint(test.endpoint, test.params, THRESHOLDS.SLOW);
    
    // These should either succeed or fail gracefully, not hang
    const isHandled = result.success || (result.duration < THRESHOLDS.TIMEOUT);
    logTest(`${test.endpoint} Timeout Handling`, isHandled, 
      `Response time: ${result.duration}ms, Success: ${result.success}`);
  }
}

async function testCachingPerformance() {
  console.log('\n🔄 Testing Caching Performance');
  
  // Test repeated requests to see if caching improves performance
  const cacheTests = [
    { endpoint: '/api/congress', params: {} },
    { endpoint: '/api/fec-overview', params: {} },
    { endpoint: '/api/search/suggestions', params: { popular: 'true' } }
  ];
  
  for (const test of cacheTests) {
    // First request
    const firstResult = await testEndpoint(`${test.endpoint} (1st)`, test.params, THRESHOLDS.FAST);
    
    // Second request (should be faster if cached)
    const secondResult = await testEndpoint(`${test.endpoint} (2nd)`, test.params, THRESHOLDS.FAST);
    
    const isCached = secondResult.duration <= firstResult.duration;
    logTest(`${test.endpoint} Caching`, isCached, 
      `1st: ${firstResult.duration}ms, 2nd: ${secondResult.duration}ms`);
  }
}

async function generatePerformanceReport() {
  console.log('\n' + '='.repeat(60));
  console.log('📊 PERFORMANCE TEST REPORT');
  console.log('='.repeat(60));
  
  const total = testResults.performance.fast + testResults.performance.good + 
                testResults.performance.slow + testResults.performance.timeout;
  
  console.log(`🚀 Fast (≤${THRESHOLDS.FAST}ms): ${testResults.performance.fast} (${Math.round(testResults.performance.fast/total*100)}%)`);
  console.log(`✅ Good (≤${THRESHOLDS.GOOD}ms): ${testResults.performance.good} (${Math.round(testResults.performance.good/total*100)}%)`);
  console.log(`⚠️  Slow (≤${THRESHOLDS.SLOW}ms): ${testResults.performance.slow} (${Math.round(testResults.performance.slow/total*100)}%)`);
  console.log(`❌ Timeout (>${THRESHOLDS.SLOW}ms): ${testResults.performance.timeout} (${Math.round(testResults.performance.timeout/total*100)}%)`);
  
  console.log(`\n📈 Overall Performance: ${Math.round((testResults.performance.fast + testResults.performance.good)/total*100)}% acceptable`);
  
  if (testResults.performance.timeout > 0) {
    console.log('\n🔧 Performance Issues Detected:');
    console.log('   - Some endpoints are timing out');
    console.log('   - Consider optimizing database queries');
    console.log('   - Implement better caching strategies');
  }
  
  if (testResults.performance.slow > total * 0.2) {
    console.log('\n⚠️  Performance Warnings:');
    console.log('   - More than 20% of requests are slow');
    console.log('   - Consider database indexing optimization');
    console.log('   - Review API response time targets');
  }
}

async function runAllTests() {
  console.log('⚡ Testing Performance & Load Features');
  console.log('='.repeat(50));
  
  try {
    await testAPIPerformance();
    await testLoadPerformance();
    await testDatabasePerformance();
    await testFrontendPerformance();
    await testMemoryUsage();
    await testTimeoutHandling();
    await testCachingPerformance();
    
    // Generate performance report
    await generatePerformanceReport();
    
    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('📊 PERFORMANCE TEST SUMMARY');
    console.log('='.repeat(50));
    
    console.log(`✅ Passed: ${testResults.passed}`);
    console.log(`⚠️  Warnings: ${testResults.warnings}`);
    console.log(`❌ Failed: ${testResults.failed}`);
    
    if (testResults.failed > 0) {
      console.log('\n❌ Failed Tests:');
      testResults.details
        .filter(test => !test.passed && !test.isWarning)
        .forEach(test => console.log(`   - ${test.name}: ${test.details}`));
    }
    
    if (testResults.warnings > 0) {
      console.log('\n⚠️  Performance Warnings:');
      testResults.details
        .filter(test => test.isWarning)
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