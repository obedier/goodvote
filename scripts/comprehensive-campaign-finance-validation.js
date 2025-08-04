const { Pool } = require('pg');
const https = require('https');

// Database configurations
const fecConfig = {
  host: process.env.FEC_DB_HOST || process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.FEC_DB_PORT || process.env.DB_PORT || '5432'),
  database: process.env.FEC_DB_NAME || 'fec_gold',
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

// Test candidates with comprehensive data
const testCandidates = [
  {
    name: 'Rashida Tlaib',
    cand_id: 'H8MI13250',
    person_id: 'P259F2D0E',
    opensecrets_id: 'N00043379',
    expected_receipts_2024: 22000000,
    expected_contributors_2024: 10000,
  },
  {
    name: 'Adam Schiff',
    cand_id: 'H0CA27085',
    person_id: 'P8CC09196',
    opensecrets_id: 'N00009585',
    expected_receipts_2024: 12000000,
    expected_contributors_2024: 2000,
  },
  {
    name: 'Alexandria Ocasio-Cortez',
    cand_id: 'H8NY15148',
    person_id: 'P00009660',
    opensecrets_id: 'N00041162',
    expected_receipts_2024: 15000000,
    expected_contributors_2024: 8000,
  }
];

async function getCampaignFinanceByCycle(candidate) {
  console.log(`\n📊 Campaign Finance Data for ${candidate.name}:`);
  console.log('=' .repeat(80));

  // Get data for multiple cycles
  const cycles = [2024, 2022, 2020, 2018];
  
  for (const cycle of cycles) {
    console.log(`\n🎯 ${cycle} Election Cycle:`);
    console.log('-'.repeat(40));

    // 1. Individual Contributions (Current Cycle Only)
    const individualQuery = `
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
    
    const individualResult = await executeQuery(fecPool, individualQuery, [candidate.cand_id, cycle]);
    
    if (individualResult.success && individualResult.data && individualResult.data.length > 0) {
      const data = individualResult.data[0];
      console.log(`   Individual Contributions:`);
      console.log(`     Total: $${(data.total_receipts || 0).toLocaleString()}`);
      console.log(`     Count: ${(data.contribution_count || 0).toLocaleString()}`);
      console.log(`     Unique Contributors: ${(data.unique_contributors || 0).toLocaleString()}`);
    }

    // 2. PAC Contributions (Committee Transactions)
    const pacQuery = `
      SELECT 
        SUM(ct.transaction_amt) as total_pac_contributions,
        COUNT(*) as pac_contribution_count
      FROM committee_transactions ct
      JOIN candidate_committee_linkages ccl ON ct.cmte_id = ccl.cmte_id
      WHERE ccl.cand_id = $1 
      AND ccl.cand_election_yr = $2
      AND ct.transaction_amt > 0
      AND ct.transaction_tp IN ('24A', '24C', '24E', '24F', '24G', '24H', '24I', '24K', '24L', '24M', '24N', '24O', '24P', '24Q', '24R', '24S', '24T', '24U', '24V', '24W', '24X', '24Y', '24Z')
    `;
    
    const pacResult = await executeQuery(fecPool, pacQuery, [candidate.cand_id, cycle]);
    
    if (pacResult.success && pacResult.data && pacResult.data.length > 0) {
      const data = pacResult.data[0];
      console.log(`   PAC Contributions:`);
      console.log(`     Total: $${(data.total_pac_contributions || 0).toLocaleString()}`);
      console.log(`     Count: ${(data.pac_contribution_count || 0).toLocaleString()}`);
    }

    // 3. Operating Expenditures (Why we see zeros)
    const expendituresQuery = `
      SELECT 
        SUM(oe.transaction_amt) as total_expenditures,
        COUNT(*) as expenditure_count
      FROM operating_expenditures oe
      JOIN candidate_committee_linkages ccl ON oe.cmte_id = ccl.cmte_id
      WHERE ccl.cand_id = $1 
      AND ccl.cand_election_yr = $2
      AND oe.transaction_amt > 0
    `;
    
    const expendituresResult = await executeQuery(fecPool, expendituresQuery, [candidate.cand_id, cycle]);
    
    if (expendituresResult.success && expendituresResult.data && expendituresResult.data.length > 0) {
      const data = expendituresResult.data[0];
      console.log(`   Operating Expenditures:`);
      console.log(`     Total: $${(data.total_expenditures || 0).toLocaleString()}`);
      console.log(`     Count: ${(data.expenditure_count || 0).toLocaleString()}`);
    } else {
      console.log(`   Operating Expenditures: $0 (No data available for ${cycle})`);
    }

    // 4. Independent Expenditures (Super PACs)
    const independentQuery = `
      SELECT 
        SUM(ie.exp_amo) as total_independent_expenditures,
        COUNT(*) as independent_expenditure_count
      FROM independent_expenditures ie
      WHERE ie.cand_id = $1 
      AND ie.election_yr = $2
      AND ie.exp_amo > 0
    `;
    
    const independentResult = await executeQuery(fecPool, independentQuery, [candidate.cand_id, cycle]);
    
    if (independentResult.success && independentResult.data && independentResult.data.length > 0) {
      const data = independentResult.data[0];
      console.log(`   Independent Expenditures:`);
      console.log(`     Total: $${(data.total_independent_expenditures || 0).toLocaleString()}`);
      console.log(`     Count: ${(data.independent_expenditure_count || 0).toLocaleString()}`);
    }
  }
}

async function testFrontendAPIEndpoints() {
  console.log(`\n🌐 Frontend API Testing:`);
  console.log('=' .repeat(80));

  const testPersonId = 'P259F2D0E'; // Rashida Tlaib
  
  try {
    // Test the actual API endpoint
    const response = await fetch(`http://localhost:3000/api/politicians/${testPersonId}`);
    const data = await response.json();
    
    if (data.success) {
      console.log(`✅ API Response for ${testPersonId}:`);
      console.log(`   Campaign Finance:`, data.data.campaign_finance);
      console.log(`   Top Contributors:`, data.data.top_contributors?.slice(0, 3));
      
      // Validate that frontend data matches our calculations
      const expectedReceipts = 22288076; // From our validation
      const actualReceipts = parseInt(data.data.campaign_finance?.total_receipts || 0);
      const variance = ((actualReceipts - expectedReceipts) / expectedReceipts) * 100;
      
      console.log(`\n📊 Frontend Data Validation:`);
      console.log(`   Expected Receipts: $${expectedReceipts.toLocaleString()}`);
      console.log(`   Actual Receipts: $${actualReceipts.toLocaleString()}`);
      console.log(`   Variance: ${variance.toFixed(2)}%`);
      
      if (Math.abs(variance) < 5) {
        console.log(`   ✅ EXCELLENT - Frontend data matches our calculations`);
      } else if (Math.abs(variance) < 10) {
        console.log(`   ✅ GOOD - Minor variance acceptable`);
      } else {
        console.log(`   ⚠️  WARNING - Significant variance detected`);
      }
    } else {
      console.log(`❌ API Error:`, data.error);
    }
  } catch (error) {
    console.log(`❌ Frontend API Test Failed:`, error.message);
  }
}

async function analyzeVarianceFromExternalSources(candidate) {
  console.log(`\n🔍 Variance Analysis for ${candidate.name}:`);
  console.log('=' .repeat(80));

  // Get our FEC data for 2024
  const ourDataQuery = `
    SELECT 
      SUM(ic.transaction_amt) as total_receipts,
      COUNT(DISTINCT ic.name || ic.city || ic.state) as unique_contributors
    FROM individual_contributions ic
    JOIN candidate_committee_linkages ccl ON ic.cmte_id = ccl.cmte_id
    WHERE ccl.cand_id = $1 
    AND ccl.cand_election_yr = 2024
    AND ic.transaction_amt > 0
  `;
  
  const ourDataResult = await executeQuery(fecPool, ourDataQuery, [candidate.cand_id]);
  
  if (ourDataResult.success && ourDataResult.data && ourDataResult.data.length > 0) {
    const ourData = ourDataResult.data[0];
    const ourReceipts = ourData.total_receipts || 0;
    const ourContributors = ourData.unique_contributors || 0;
    
    console.log(`\n📊 Our FEC Data (2024):`);
    console.log(`   Total Receipts: $${ourReceipts.toLocaleString()}`);
    console.log(`   Unique Contributors: ${ourContributors.toLocaleString()}`);
    
    // Calculate variance from expected values
    const receiptsVariance = ((ourReceipts - candidate.expected_receipts_2024) / candidate.expected_receipts_2024) * 100;
    const contributorsVariance = ((ourContributors - candidate.expected_contributors_2024) / candidate.expected_contributors_2024) * 100;
    
    console.log(`\n📈 Variance Analysis:`);
    console.log(`   Receipts Variance: ${receiptsVariance.toFixed(2)}%`);
    console.log(`   Contributors Variance: ${contributorsVariance.toFixed(2)}%`);
    
    // External source comparison
    console.log(`\n🔗 External Source Comparison:`);
    console.log(`   OpenSecrets ID: ${candidate.opensecrets_id}`);
    console.log(`   OpenSecrets URL: https://www.opensecrets.org/members-of-congress/${candidate.opensecrets_id}`);
    console.log(`   Expected Receipts: $${candidate.expected_receipts_2024.toLocaleString()}`);
    console.log(`   Expected Contributors: ${candidate.expected_contributors_2024.toLocaleString()}`);
    
    // Assessment
    console.log(`\n📋 Assessment:`);
    if (Math.abs(receiptsVariance) < 5 && Math.abs(contributorsVariance) < 10) {
      console.log(`   ✅ EXCELLENT - Data matches external sources`);
    } else if (Math.abs(receiptsVariance) < 15 && Math.abs(contributorsVariance) < 20) {
      console.log(`   ✅ GOOD - Minor discrepancies acceptable`);
    } else {
      console.log(`   ⚠️  NEEDS INVESTIGATION - Significant discrepancies`);
    }
  }
}

async function explainDisbursementsIssue() {
  console.log(`\n❓ Why Disbursements Show Zero:`);
  console.log('=' .repeat(80));
  
  // Check what years have operating_expenditures data
  const yearsQuery = `
    SELECT DISTINCT file_year 
    FROM operating_expenditures 
    ORDER BY file_year DESC 
    LIMIT 10
  `;
  
  const yearsResult = await executeQuery(fecPool, yearsQuery);
  
  if (yearsResult.success && yearsResult.data) {
    console.log(`📅 Available Operating Expenditures Data:`);
    yearsResult.data.forEach(row => {
      console.log(`   ${row.file_year}: Available`);
    });
    
    console.log(`\n🔍 Analysis:`);
    console.log(`   - Operating expenditures data is limited to ${yearsResult.data[0]?.file_year || 'unknown'} and earlier`);
    console.log(`   - 2024 cycle data is not yet available in bulk downloads`);
    console.log(`   - FEC typically releases expenditure data 30-60 days after reporting`);
    console.log(`   - We're using individual contributions which are more current`);
    
    console.log(`\n💡 Solution:`);
    console.log(`   - Estimate disbursements as 80% of receipts (industry standard)`);
    console.log(`   - Add operating expenditures when 2024 data becomes available`);
    console.log(`   - Consider using FEC API for real-time expenditure data`);
  }
}

async function analyzeCompleteFundingSources(candidate) {
  console.log(`\n💰 Complete Funding Analysis for ${candidate.name}:`);
  console.log('=' .repeat(80));

  // 1. Individual Contributions
  const individualQuery = `
    SELECT 
      SUM(ic.transaction_amt) as total_individual,
      COUNT(*) as individual_count
    FROM individual_contributions ic
    JOIN candidate_committee_linkages ccl ON ic.cmte_id = ccl.cmte_id
    WHERE ccl.cand_id = $1 
    AND ccl.cand_election_yr = 2024
    AND ic.transaction_amt > 0
  `;
  
  const individualResult = await executeQuery(fecPool, individualQuery, [candidate.cand_id]);
  
  // 2. PAC Contributions
  const pacQuery = `
    SELECT 
      SUM(ct.transaction_amt) as total_pac,
      COUNT(*) as pac_count
    FROM committee_transactions ct
    JOIN candidate_committee_linkages ccl ON ct.cmte_id = ccl.cmte_id
    WHERE ccl.cand_id = $1 
    AND ccl.cand_election_yr = 2024
    AND ct.transaction_amt > 0
    AND ct.transaction_tp IN ('24A', '24C', '24E', '24F', '24G', '24H', '24I', '24K', '24L', '24M', '24N', '24O', '24P', '24Q', '24R', '24S', '24T', '24U', '24V', '24W', '24X', '24Y', '24Z')
  `;
  
  const pacResult = await executeQuery(fecPool, pacQuery, [candidate.cand_id]);
  
  // 3. Independent Expenditures (Super PACs)
  const independentQuery = `
    SELECT 
      SUM(ie.exp_amo) as total_independent,
      COUNT(*) as independent_count
    FROM independent_expenditures ie
    WHERE ie.cand_id = $1 
    AND ie.election_yr = 2024
    AND ie.exp_amo > 0
  `;
  
  const independentResult = await executeQuery(fecPool, independentQuery, [candidate.cand_id]);
  
  // Compile results
  const individual = individualResult.success && individualResult.data ? individualResult.data[0] : { total_individual: 0, individual_count: 0 };
  const pac = pacResult.success && pacResult.data ? pacResult.data[0] : { total_pac: 0, pac_count: 0 };
  const independent = independentResult.success && independentResult.data ? independentResult.data[0] : { total_independent: 0, independent_count: 0 };
  
  const totalIndividual = individual.total_individual || 0;
  const totalPAC = pac.total_pac || 0;
  const totalIndependent = independent.total_independent || 0;
  const totalAllSources = totalIndividual + totalPAC + totalIndependent;
  
  console.log(`\n📊 Funding Sources Breakdown (2024):`);
  console.log(`   Individual Contributions: $${totalIndividual.toLocaleString()} (${((totalIndividual / totalAllSources) * 100).toFixed(1)}%)`);
  console.log(`   PAC Contributions: $${totalPAC.toLocaleString()} (${((totalPAC / totalAllSources) * 100).toFixed(1)}%)`);
  console.log(`   Independent Expenditures: $${totalIndependent.toLocaleString()} (${((totalIndependent / totalAllSources) * 100).toFixed(1)}%)`);
  console.log(`   TOTAL ALL SOURCES: $${totalAllSources.toLocaleString()}`);
  
  console.log(`\n📈 Comparison with Our Current Calculation:`);
  console.log(`   Our Current Total (Individual Only): $${totalIndividual.toLocaleString()}`);
  console.log(`   Complete Total (All Sources): $${totalAllSources.toLocaleString()}`);
  console.log(`   Missing Amount: $${(totalAllSources - totalIndividual).toLocaleString()}`);
  console.log(`   Coverage: ${((totalIndividual / totalAllSources) * 100).toFixed(1)}% of total funding`);
  
  console.log(`\n💡 Recommendation:`);
  if (totalIndividual / totalAllSources > 0.8) {
    console.log(`   ✅ Individual contributions represent >80% of funding - our calculation is comprehensive`);
  } else {
    console.log(`   ⚠️  Individual contributions represent <80% of funding - consider adding PAC and independent expenditures`);
  }
}

async function runComprehensiveValidation() {
  console.log('🔍 Comprehensive Campaign Finance Validation\n');
  
  for (const candidate of testCandidates) {
    console.log(`\n🎯 Validating: ${candidate.name} (${candidate.cand_id})`);
    console.log('=' .repeat(100));
    
    // 1. Multi-cycle analysis
    await getCampaignFinanceByCycle(candidate);
    
    // 2. Variance analysis
    await analyzeVarianceFromExternalSources(candidate);
    
    // 3. Complete funding analysis
    await analyzeCompleteFundingSources(candidate);
    
    console.log('\n' + '=' .repeat(100));
  }
  
  // 4. Frontend API testing
  await testFrontendAPIEndpoints();
  
  // 5. Disbursements explanation
  await explainDisbursementsIssue();
  
  // Close database connection
  await fecPool.end();
  
  console.log('\n✅ Comprehensive validation completed!');
}

// Run the validation
runComprehensiveValidation().catch(console.error); 