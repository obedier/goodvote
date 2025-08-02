const { Pool } = require('pg');

// Database configurations
const fecConfig = {
  host: process.env.FEC_DB_HOST || process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.FEC_DB_PORT || process.env.DB_PORT || '5432'),
  database: process.env.FEC_DB_NAME || 'fec_complete',
  user: process.env.FEC_DB_USER || process.env.DB_USER || 'osamabedier',
  password: process.env.FEC_DB_PASSWORD || process.env.DB_PASSWORD || '',
  max: 3,
  min: 0,
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 3000,
  acquireTimeoutMillis: 3000,
};

const fecPool = new Pool(fecConfig);

async function executeQuery(pool, query, params = []) {
  let client = null;
  try {
    client = await pool.connect();
    const result = await client.query(query, params);
    return { success: true, data: result.rows };
  } catch (error) {
    console.error('Query error:', error.message);
    return { success: false, error: error.message };
  } finally {
    if (client) client.release();
  }
}

// Test cases for campaign finance validation
const testCases = [
  {
    name: 'Rashida Tlaib',
    cand_id: 'H8MI13250',
    person_id: 'P259F2D0E',
    expected_receipts_2024: 22000000,
    expected_contributors_2024: 10000,
    tolerance_receipts: 0.15, // 15% tolerance
    tolerance_contributors: 0.20, // 20% tolerance
  },
  {
    name: 'Adam Schiff',
    cand_id: 'H0CA27085',
    person_id: 'P8CC09196',
    expected_receipts_2024: 12000000,
    expected_contributors_2024: 2000,
    tolerance_receipts: 0.15,
    tolerance_contributors: 0.20,
  }
];

async function testCampaignFinanceCalculation(candidate) {
  console.log(`\n🧪 Testing: ${candidate.name}`);
  
  // Get our FEC data for 2024
  const query = `
    SELECT 
      SUM(ic.transaction_amt) as total_receipts,
      COUNT(DISTINCT ic.name || ic.city || ic.state) as unique_contributors
    FROM individual_contributions ic
    JOIN candidate_committee_linkages ccl ON ic.cmte_id = ccl.cmte_id
    WHERE ccl.cand_id = $1 
    AND ccl.cand_election_yr = 2024
    AND ic.transaction_amt > 0
  `;
  
  const result = await executeQuery(fecPool, query, [candidate.cand_id]);
  
  if (!result.success || !result.data || result.data.length === 0) {
    return {
      test: candidate.name,
      status: 'FAILED',
      error: 'No data found',
      details: result.error || 'No results'
    };
  }
  
  const data = result.data[0];
  const actualReceipts = data.total_receipts || 0;
  const actualContributors = data.unique_contributors || 0;
  
  // Calculate variances
  const receiptsVariance = Math.abs(actualReceipts - candidate.expected_receipts_2024) / candidate.expected_receipts_2024;
  const contributorsVariance = Math.abs(actualContributors - candidate.expected_contributors_2024) / candidate.expected_contributors_2024;
  
  // Determine test status
  const receiptsPass = receiptsVariance <= candidate.tolerance_receipts;
  const contributorsPass = contributorsVariance <= candidate.tolerance_contributors;
  const overallPass = receiptsPass && contributorsPass;
  
  return {
    test: candidate.name,
    status: overallPass ? 'PASSED' : 'FAILED',
    actual_receipts: actualReceipts,
    expected_receipts: candidate.expected_receipts_2024,
    receipts_variance: receiptsVariance,
    receipts_pass: receiptsPass,
    actual_contributors: actualContributors,
    expected_contributors: candidate.expected_contributors_2024,
    contributors_variance: contributorsVariance,
    contributors_pass: contributorsPass,
    details: {
      receipts_tolerance: candidate.tolerance_receipts,
      contributors_tolerance: candidate.tolerance_contributors
    }
  };
}

async function testFrontendAPIEndpoint(personId) {
  console.log(`\n🌐 Testing Frontend API for ${personId}`);
  
  try {
    const response = await fetch(`http://localhost:3000/api/politicians/${personId}`);
    const data = await response.json();
    
    if (!data.success) {
      return {
        test: 'Frontend API',
        status: 'FAILED',
        error: data.error || 'API returned error',
        details: data
      };
    }
    
    const campaignFinance = data.data.campaign_finance;
    const topContributors = data.data.top_contributors;
    
    // Validate required fields exist
    const requiredFields = ['total_receipts', 'total_disbursements', 'cash_on_hand', 'contribution_count', 'avg_contribution'];
    const missingFields = requiredFields.filter(field => !campaignFinance[field]);
    
    if (missingFields.length > 0) {
      return {
        test: 'Frontend API',
        status: 'FAILED',
        error: `Missing required fields: ${missingFields.join(', ')}`,
        details: campaignFinance
      };
    }
    
    // Validate data types
    const receipts = parseInt(campaignFinance.total_receipts);
    const disbursements = parseInt(campaignFinance.total_disbursements);
    const cashOnHand = parseInt(campaignFinance.cash_on_hand);
    
    if (isNaN(receipts) || isNaN(disbursements) || isNaN(cashOnHand)) {
      return {
        test: 'Frontend API',
        status: 'FAILED',
        error: 'Invalid numeric values in campaign finance data',
        details: campaignFinance
      };
    }
    
    // Validate top contributors
    if (!Array.isArray(topContributors) || topContributors.length === 0) {
      return {
        test: 'Frontend API',
        status: 'FAILED',
        error: 'Top contributors array is missing or empty',
        details: { topContributors }
      };
    }
    
    return {
      test: 'Frontend API',
      status: 'PASSED',
      actual_receipts: receipts,
      actual_disbursements: disbursements,
      actual_cash_on_hand: cashOnHand,
      top_contributors_count: topContributors.length,
      details: {
        campaign_finance: campaignFinance,
        top_contributors: topContributors.slice(0, 3) // Show first 3
      }
    };
    
  } catch (error) {
    return {
      test: 'Frontend API',
      status: 'FAILED',
      error: `API request failed: ${error.message}`,
      details: error
    };
  }
}

async function testMultiCycleData(candidate) {
  console.log(`\n📅 Testing Multi-Cycle Data for ${candidate.name}`);
  
  const cycles = [2024, 2022, 2020, 2018];
  const results = [];
  
  for (const cycle of cycles) {
    const query = `
      SELECT 
        SUM(ic.transaction_amt) as total_receipts,
        COUNT(*) as contribution_count,
        COUNT(DISTINCT ic.name || ic.city || ic.state) as unique_contributors
      FROM individual_contributions ic
      JOIN candidate_committee_linkages ccl ON ic.cmte_id = ccl.cmte_id
      WHERE ccl.cand_id = $1 
      AND ccl.cand_election_yr = $2
      AND ic.transaction_amt > 0
    `;
    
    const result = await executeQuery(fecPool, query, [candidate.cand_id, cycle]);
    
    if (result.success && result.data && result.data.length > 0) {
      const data = result.data[0];
      results.push({
        cycle,
        total_receipts: data.total_receipts || 0,
        contribution_count: data.contribution_count || 0,
        unique_contributors: data.unique_contributors || 0,
        status: 'PASSED'
      });
    } else {
      results.push({
        cycle,
        status: 'FAILED',
        error: result.error || 'No data found'
      });
    }
  }
  
  return {
    test: `Multi-Cycle Data (${candidate.name})`,
    status: results.every(r => r.status === 'PASSED') ? 'PASSED' : 'FAILED',
    cycles: results
  };
}

async function testDisbursementsData() {
  console.log(`\n💰 Testing Disbursements Data`);
  
  // Check what years have operating_expenditures data
  const yearsQuery = `
    SELECT DISTINCT file_year 
    FROM operating_expenditures 
    ORDER BY file_year DESC 
    LIMIT 5
  `;
  
  const yearsResult = await executeQuery(fecPool, yearsQuery);
  
  if (!yearsResult.success || !yearsResult.data) {
    return {
      test: 'Disbursements Data',
      status: 'FAILED',
      error: 'Cannot query operating_expenditures table',
      details: yearsResult.error
    };
  }
  
  const availableYears = yearsResult.data.map(row => row.file_year);
  
  return {
    test: 'Disbursements Data',
    status: 'PASSED',
    available_years: availableYears,
    latest_year: availableYears[0] || 'None',
    details: {
      message: availableYears.length > 0 
        ? `Operating expenditures data available for years: ${availableYears.join(', ')}`
        : 'No operating expenditures data available'
    }
  };
}

async function runCampaignFinanceTestSuite() {
  console.log('🧪 Campaign Finance Validation Test Suite\n');
  
  const results = [];
  
  // Test 1: Campaign finance calculations
  for (const candidate of testCases) {
    const result = await testCampaignFinanceCalculation(candidate);
    results.push(result);
  }
  
  // Test 2: Frontend API
  const frontendResult = await testFrontendAPIEndpoint('P259F2D0E');
  results.push(frontendResult);
  
  // Test 3: Multi-cycle data
  const multiCycleResult = await testMultiCycleData(testCases[0]);
  results.push(multiCycleResult);
  
  // Test 4: Disbursements data
  const disbursementsResult = await testDisbursementsData();
  results.push(disbursementsResult);
  
  // Summary
  const passed = results.filter(r => r.status === 'PASSED').length;
  const total = results.length;
  
  console.log(`\n📊 Test Results Summary:`);
  console.log(`   Passed: ${passed}/${total}`);
  console.log(`   Success Rate: ${((passed / total) * 100).toFixed(1)}%`);
  
  console.log(`\n📋 Detailed Results:`);
  results.forEach(result => {
    const status = result.status === 'PASSED' ? '✅' : '❌';
    console.log(`   ${status} ${result.test}: ${result.status}`);
    
    if (result.status === 'FAILED') {
      console.log(`      Error: ${result.error}`);
    }
    
    if (result.actual_receipts) {
      console.log(`      Receipts: $${result.actual_receipts.toLocaleString()}`);
      console.log(`      Variance: ${(result.receipts_variance * 100).toFixed(1)}%`);
    }
  });
  
  // Close database connection
  await fecPool.end();
  
  return {
    total_tests: total,
    passed_tests: passed,
    failed_tests: total - passed,
    success_rate: (passed / total) * 100,
    results: results
  };
}

// Run the test suite
runCampaignFinanceTestSuite().then(summary => {
  console.log(`\n✅ Campaign Finance Test Suite completed!`);
  console.log(`   Success Rate: ${summary.success_rate.toFixed(1)}%`);
  
  // Exit with appropriate code for CI/CD
  process.exit(summary.failed_tests > 0 ? 1 : 0);
}).catch(error => {
  console.error('❌ Test suite failed:', error);
  process.exit(1);
}); 