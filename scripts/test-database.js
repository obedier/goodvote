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

async function testFECTables() {
  const fecTables = [
    'candidate_master',
    'committee_master', 
    'individual_contributions',
    'operating_expenditures',
    'committee_transactions',
    'pac_summary',
    'house_senate_current_campaigns',
    'candidate_committee_linkages'
  ];
  
  let allTablesExist = true;
  
  for (const table of fecTables) {
    try {
      const client = await fecCompletePool.connect();
      const result = await client.query(`SELECT COUNT(*) FROM ${table} LIMIT 1`);
      client.release();
      
      const exists = result.rowCount > 0;
      logTest(`FEC Table: ${table}`, exists, `${result.rows[0].count} records found`);
      
      if (!exists) allTablesExist = false;
    } catch (error) {
      logTest(`FEC Table: ${table}`, false, error.message);
      allTablesExist = false;
    }
  }
  
  return allTablesExist;
}

async function testPersonMapping() {
  try {
    const client = await goodvotePool.connect();
    
    // Test persons table
    const personsResult = await client.query('SELECT COUNT(*) FROM persons LIMIT 1');
    const personsExist = personsResult.rowCount > 0;
    logTest('Person Mapping: persons table', personsExist, `${personsResult.rows[0].count} persons found`);
    
    // Test person_candidates table
    const personCandidatesResult = await client.query('SELECT COUNT(*) FROM person_candidates LIMIT 1');
    const personCandidatesExist = personCandidatesResult.rowCount > 0;
    logTest('Person Mapping: person_candidates table', personCandidatesExist, `${personCandidatesResult.rows[0].count} mappings found`);
    
    client.release();
    return personsExist && personCandidatesExist;
  } catch (error) {
    logTest('Person Mapping', false, error.message);
    return false;
  }
}

async function testQueryPerformance() {
  const queries = [
    {
      name: 'Congress Members Query',
      sql: 'SELECT COUNT(*) FROM persons WHERE current_office IN (\'H\', \'S\')',
      expectedTime: 1000, // 1 second
      useFEC: false
    },
    {
      name: 'Contributions Query',
      sql: 'SELECT COUNT(*) FROM individual_contributions WHERE file_year = 2024 LIMIT 1000',
      expectedTime: 120000, // 2 minutes (large dataset)
      useFEC: true
    },
    {
      name: 'PACs Query',
      sql: 'SELECT COUNT(*) FROM pac_summary WHERE file_year = 2024',
      expectedTime: 1000, // 1 second
      useFEC: true
    }
  ];
  
  let allQueriesFast = true;
  
  for (const query of queries) {
    try {
      const startTime = Date.now();
      const pool = query.useFEC ? fecCompletePool : goodvotePool;
      const client = await pool.connect();
      const result = await client.query(query.sql);
      const endTime = Date.now();
      const duration = endTime - startTime;
      client.release();
      
      const isFast = duration < query.expectedTime;
      logTest(query.name, isFast, `${duration}ms (expected < ${query.expectedTime}ms)`);
      
      if (!isFast) allQueriesFast = false;
    } catch (error) {
      logTest(query.name, false, error.message);
      allQueriesFast = false;
    }
  }
  
  return allQueriesFast;
}

async function testDataIntegrity() {
  try {
    const client = await fecCompletePool.connect();
    
    // Test for valid election years
    const electionYearsResult = await client.query(`
      SELECT DISTINCT file_year 
      FROM individual_contributions 
      WHERE file_year IS NOT NULL 
      ORDER BY file_year DESC 
      LIMIT 5
    `);
    
    const hasValidYears = electionYearsResult.rows.length > 0;
    const years = electionYearsResult.rows.map(row => row.file_year).join(', ');
    logTest('Data Integrity: Valid Election Years', hasValidYears, `Found years: ${years}`);
    
    // Test for valid contribution amounts
    const contributionsResult = await client.query(`
      SELECT COUNT(*) as total, 
             COUNT(CASE WHEN transaction_amt > 0 THEN 1 END) as positive,
             COUNT(CASE WHEN transaction_amt <= 0 THEN 1 END) as zero_or_negative
      FROM individual_contributions 
      WHERE file_year = 2024 
      LIMIT 1000
    `);
    
    const row = contributionsResult.rows[0];
    const hasValidAmounts = row.positive > 0 && (row.zero_or_negative / row.total) < 0.1; // Allow up to 10% zero/negative amounts
    logTest('Data Integrity: Valid Contribution Amounts', hasValidAmounts, 
      `${row.positive} positive amounts, ${row.zero_or_negative} zero/negative amounts (${Math.round((row.zero_or_negative / row.total) * 100)}%)`);
    
    client.release();
    return hasValidYears && hasValidAmounts;
  } catch (error) {
    logTest('Data Integrity', false, error.message);
    return false;
  }
}

async function runAllTests() {
  console.log('🧪 Running GoodVote Database Tests\n');
  
  // Run tests
  await testDatabaseConnection();
  await testFECTables();
  await testPersonMapping();
  await testQueryPerformance();
  await testDataIntegrity();
  
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