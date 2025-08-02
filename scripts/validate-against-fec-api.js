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
const FEC_API_KEY = 'NWrZqWmZx5pMpZTXvj2tmX27nhpNeabYDJGGNc3X';

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

async function getFECAPIData(candidateId, cycle) {
  console.log(`\n🌐 Fetching FEC API data for ${candidateId} (${cycle} cycle)...`);
  
  try {
    // Get candidate financial summary from FEC API
    const url = `https://api.open.fec.gov/v1/candidate/${candidateId}/totals/?api_key=${FEC_API_KEY}&cycle=${cycle}`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (!response.ok) {
      console.log(`   ❌ FEC API Error: ${response.status} - ${data.message || 'Unknown error'}`);
      return null;
    }
    
    if (!data.results || data.results.length === 0) {
      console.log(`   ⚠️  No FEC API data found for ${cycle} cycle`);
      return null;
    }
    
    const result = data.results[0];
    console.log(`   ✅ FEC API Data Retrieved:`);
    console.log(`      Total Receipts: $${result.receipts?.toLocaleString() || 'N/A'}`);
    console.log(`      Total Disbursements: $${result.disbursements?.toLocaleString() || 'N/A'}`);
    console.log(`      Cash on Hand: $${result.cash_on_hand_end_period?.toLocaleString() || 'N/A'}`);
    console.log(`      Individual Contributions: $${result.individual_contributions?.toLocaleString() || 'N/A'}`);
    console.log(`      PAC Contributions: $${result.political_party_committee_contributions?.toLocaleString() || 'N/A'}`);
    
    return result;
  } catch (error) {
    console.log(`   ❌ FEC API Request Failed: ${error.message}`);
    return null;
  }
}

async function getOurDatabaseData(candidateId, cycle) {
  console.log(`\n📊 Getting our database data for ${candidateId} (${cycle} cycle)...`);
  
  // Get individual contributions
  const individualQuery = `
    SELECT 
      SUM(ic.transaction_amt) as total_receipts,
      COUNT(*) as contribution_count,
      COUNT(DISTINCT ic.name || ic.city || ic.state) as unique_contributors
    FROM individual_contributions ic
    JOIN candidate_committee_linkages ccl ON ic.cmte_id = ccl.cmte_id
    WHERE ccl.cand_id = $1 
    AND ccl.cand_election_yr = $2
    AND ic.file_year = $2
    AND ic.transaction_amt > 0
  `;
  
  const individualResult = await executeQuery(fecPool, individualQuery, [candidateId, cycle]);
  
  // Get PAC contributions
  const pacQuery = `
    SELECT 
      SUM(ct.transaction_amt) as total_pac_contributions,
      COUNT(*) as pac_contribution_count
    FROM committee_transactions ct
    JOIN candidate_committee_linkages ccl ON ct.cmte_id = ccl.cmte_id
    WHERE ccl.cand_id = $1 
    AND ccl.cand_election_yr = $2
    AND ct.file_year = $2
    AND ct.transaction_amt > 0
    AND ct.transaction_tp IN ('24A', '24C', '24E', '24F', '24G', '24H', '24I', '24K', '24L', '24M', '24N', '24O', '24P', '24Q', '24R', '24S', '24T', '24U', '24V', '24W', '24X', '24Y', '24Z')
  `;
  
  const pacResult = await executeQuery(fecPool, pacQuery, [candidateId, cycle]);
  
  const individual = individualResult.success && individualResult.data ? individualResult.data[0] : { total_receipts: 0, contribution_count: 0, unique_contributors: 0 };
  const pac = pacResult.success && pacResult.data ? pacResult.data[0] : { total_pac_contributions: 0, pac_contribution_count: 0 };
  
  const totalReceipts = (individual.total_receipts || 0) + (pac.total_pac_contributions || 0);
  
  console.log(`   📊 Our Database Data:`);
  console.log(`      Individual Contributions: $${(individual.total_receipts || 0).toLocaleString()}`);
  console.log(`      PAC Contributions: $${(pac.total_pac_contributions || 0).toLocaleString()}`);
  console.log(`      Total Receipts: $${totalReceipts.toLocaleString()}`);
  console.log(`      Contribution Count: ${(individual.contribution_count || 0).toLocaleString()}`);
  
  return {
    individual_contributions: individual.total_receipts || 0,
    pac_contributions: pac.total_pac_contributions || 0,
    total_receipts: totalReceipts,
    contribution_count: individual.contribution_count || 0,
    unique_contributors: individual.unique_contributors || 0
  };
}

async function compareData(ourData, fecData, cycle) {
  console.log(`\n📈 Comparison Analysis (${cycle} cycle):`);
  console.log('=' .repeat(60));
  
  if (!fecData) {
    console.log(`   ⚠️  No FEC API data available for comparison`);
    return;
  }
  
  const fecReceipts = fecData.receipts || 0;
  const fecIndividual = fecData.individual_contributions || 0;
  const fecPAC = fecData.political_party_committee_contributions || 0;
  
  const ourReceipts = ourData.total_receipts;
  const ourIndividual = ourData.individual_contributions;
  const ourPAC = ourData.pac_contributions;
  
  // Calculate variances
  const receiptsVariance = fecReceipts > 0 ? ((ourReceipts - fecReceipts) / fecReceipts) * 100 : 0;
  const individualVariance = fecIndividual > 0 ? ((ourIndividual - fecIndividual) / fecIndividual) * 100 : 0;
  const pacVariance = fecPAC > 0 ? ((ourPAC - fecPAC) / fecPAC) * 100 : 0;
  
  console.log(`   📊 Receipts Comparison:`);
  console.log(`      FEC API: $${fecReceipts.toLocaleString()}`);
  console.log(`      Our Data: $${ourReceipts.toLocaleString()}`);
  console.log(`      Variance: ${receiptsVariance.toFixed(2)}%`);
  
  console.log(`\n   📊 Individual Contributions:`);
  console.log(`      FEC API: $${fecIndividual.toLocaleString()}`);
  console.log(`      Our Data: $${ourIndividual.toLocaleString()}`);
  console.log(`      Variance: ${individualVariance.toFixed(2)}%`);
  
  console.log(`\n   📊 PAC Contributions:`);
  console.log(`      FEC API: $${fecPAC.toLocaleString()}`);
  console.log(`      Our Data: $${ourPAC.toLocaleString()}`);
  console.log(`      Variance: ${pacVariance.toFixed(2)}%`);
  
  // Assessment
  console.log(`\n   📋 Assessment:`);
  if (Math.abs(receiptsVariance) < 5) {
    console.log(`      ✅ EXCELLENT - Receipts match within 5%`);
  } else if (Math.abs(receiptsVariance) < 15) {
    console.log(`      ✅ GOOD - Receipts match within 15%`);
  } else {
    console.log(`      ⚠️  NEEDS INVESTIGATION - Significant variance in receipts`);
  }
  
  if (Math.abs(individualVariance) < 10) {
    console.log(`      ✅ EXCELLENT - Individual contributions match within 10%`);
  } else if (Math.abs(individualVariance) < 20) {
    console.log(`      ✅ GOOD - Individual contributions match within 20%`);
  } else {
    console.log(`      ⚠️  NEEDS INVESTIGATION - Significant variance in individual contributions`);
  }
}

async function validateRashidaTlaib() {
  console.log('🔍 Validating Rashida Tlaib against FEC API\n');
  console.log('=' .repeat(100));
  
  const candidateId = 'H8MI13250';
  const cycles = [2024, 2022, 2020, 2018];
  
  for (const cycle of cycles) {
    console.log(`\n🎯 ${cycle} Election Cycle:`);
    console.log('=' .repeat(80));
    
    // Get FEC API data
    const fecData = await getFECAPIData(candidateId, cycle);
    
    // Get our database data
    const ourData = await getOurDatabaseData(candidateId, cycle);
    
    // Compare data
    await compareData(ourData, fecData, cycle);
    
    console.log('\n' + '=' .repeat(80));
  }
  
  // Close database connection
  await fecPool.end();
  
  console.log('\n✅ FEC API validation completed!');
}

// Run the validation
validateRashidaTlaib().catch(console.error); 