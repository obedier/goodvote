#!/usr/bin/env node

const { Pool } = require('pg');
require('dotenv').config();

// Database configurations
const goodvoteConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'goodvote',
  user: process.env.DB_USER || 'osamabedier',
  password: process.env.DB_PASSWORD || '',
};

const fecCompleteConfig = {
  host: process.env.FEC_DB_HOST || process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.FEC_DB_PORT || process.env.DB_PORT || '5432'),
  database: process.env.FEC_DB_NAME || 'fec_gold',
  user: process.env.FEC_DB_USER || process.env.DB_USER || 'osamabedier',
  password: process.env.FEC_DB_PASSWORD || process.env.DB_PASSWORD || '',
};

const goodvotePool = new Pool(goodvoteConfig);
const fecCompletePool = new Pool(fecCompleteConfig);

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

async function testDatabaseConnection() {
  try {
    // Test goodvote database
    const goodvoteClient = await goodvotePool.connect();
    const goodvoteResult = await goodvoteClient.query('SELECT NOW()');
    goodvoteClient.release();
    
    // Test fec_gold database
    const fecClient = await fecCompletePool.connect();
    const fecResult = await fecClient.query('SELECT NOW()');
    fecClient.release();
    
    logTest('Database Connection', true, `Connected to goodvote and fec_gold databases`);
    return true;
  } catch (error) {
    logTest('Database Connection', false, error.message);
    return false;
  }
}

async function testEssentialTables() {
  const essentialTables = [
    'candidate_master',
    'committee_master', 
    'individual_contributions'
  ];
  
  let allTablesExist = true;
  
  for (const table of essentialTables) {
    try {
      const client = await fecCompletePool.connect();
      const result = await client.query(`SELECT COUNT(*) FROM ${table} LIMIT 1`);
      client.release();
      
      const exists = result.rowCount > 0;
      logTest(`Essential Table: ${table}`, exists, `${result.rows[0].count} records found`);
      
      if (!exists) allTablesExist = false;
    } catch (error) {
      logTest(`Essential Table: ${table}`, false, error.message);
      allTablesExist = false;
    }
  }
  
  return allTablesExist;
}

async function testBasicQueries() {
  try {
    // Test a simple query
    const client = await fecCompletePool.connect();
    const result = await client.query('SELECT COUNT(*) FROM candidate_master WHERE file_year = 2024 LIMIT 1');
    client.release();
    
    const count = parseInt(result.rows[0].count);
    logTest('Basic Query Test', count > 0, `${count} candidates found for 2024`);
    
    return count > 0;
  } catch (error) {
    logTest('Basic Query Test', false, error.message);
    return false;
  }
}

async function runFastTests() {
  console.log('🔍 Running Fast Database Tests\n');
  
  // Test database connections
  const connectionOk = await testDatabaseConnection();
  if (!connectionOk) {
    console.log('\n❌ Database connection failed. Check your .env.local configuration.');
    process.exit(1);
  }
  
  // Test essential tables
  await testEssentialTables();
  
  // Test basic queries
  await testBasicQueries();
  
  // Summary
  console.log('\n' + '='.repeat(40));
  console.log('📊 FAST DATABASE TEST SUMMARY');
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
  
  // Cleanup
  await goodvotePool.end();
  await fecCompletePool.end();
  
  process.exit(testResults.failed > 0 ? 1 : 0);
}

// Handle errors
process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled Promise Rejection:', error);
  process.exit(1);
});

// Run tests
runFastTests().catch(error => {
  console.error('❌ Database test execution failed:', error);
  process.exit(1);
}); 