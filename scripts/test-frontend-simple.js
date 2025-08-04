#!/usr/bin/env node

const puppeteer = require('puppeteer');

// Test configuration
const BASE_URL = 'http://localhost:3000';
const TEST_PAGES = [
  '/',
  '/politicians/congress',
  '/lobbying/pacs'
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

async function testServerAvailability() {
  try {
    const browser = await puppeteer.launch({ 
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    
    await page.goto(BASE_URL, { waitUntil: 'networkidle0', timeout: 10000 });
    const title = await page.title();
    await browser.close();
    
    const hasTitle = title && title.includes('GoodVote');
    logTest('Server Availability', hasTitle, `Title: "${title}"`);
    return hasTitle;
  } catch (error) {
    logTest('Server Availability', false, error.message);
    return false;
  }
}

async function testPageLoad(pagePath) {
  try {
    const browser = await puppeteer.launch({ 
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    
    const startTime = Date.now();
    await page.goto(`${BASE_URL}${pagePath}`, { waitUntil: 'networkidle0', timeout: 10000 });
    const loadTime = Date.now() - startTime;
    const title = await page.title();
    await browser.close();
    
    const hasTitle = title && title.includes('GoodVote');
    logTest(`Page Load: ${pagePath}`, hasTitle, `Title: "${title}", Time: ${loadTime}ms`);
    return hasTitle;
  } catch (error) {
    logTest(`Page Load: ${pagePath}`, false, error.message);
    return false;
  }
}

async function runSimpleFrontendTests() {
  console.log('🌐 Running Simple Frontend Tests\n');
  
  // Test server availability
  const serverOk = await testServerAvailability();
  if (!serverOk) {
    console.log('\n❌ Server not available. Make sure the development server is running: npm run dev');
    process.exit(1);
  }
  
  // Test page loads
  for (const pagePath of TEST_PAGES) {
    await testPageLoad(pagePath);
  }
  
  // Summary
  console.log('\n' + '='.repeat(40));
  console.log('📊 SIMPLE FRONTEND TEST SUMMARY');
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
runSimpleFrontendTests().catch(error => {
  console.error('❌ Frontend test execution failed:', error);
  process.exit(1);
}); 