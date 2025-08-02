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

async function getFECAPI2024Data() {
  console.log('🌐 Getting FEC API data for 2024...');
  
  try {
    const url = `https://api.open.fec.gov/v1/candidate/H8MI13250/totals/?api_key=${FEC_API_KEY}&cycle=2024`;
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.results && data.results.length > 0) {
      const result = data.results[0];
      console.log('   ✅ FEC API 2024 Data:');
      console.log(`      Total Receipts: $${result.contributions?.toLocaleString() || 'N/A'}`);
      console.log(`      Individual Contributions: $${result.individual_contributions?.toLocaleString() || 'N/A'}`);
      console.log(`      PAC Contributions: $${result.political_party_committee_contributions?.toLocaleString() || 'N/A'}`);
      console.log(`      Disbursements: $${result.disbursements?.toLocaleString() || 'N/A'}`);
      console.log(`      Coverage: ${result.coverage_start_date} to ${result.coverage_end_date}`);
      return result;
    }
  } catch (error) {
    console.log(`   ❌ FEC API Error: ${error.message}`);
  }
  return null;
}

async function investigateCommitteeLinkages() {
  console.log('\n🔍 Investigating Committee Linkages for 2024...');
  
  const candidateId = 'H8MI13250';
  
  // 1. Check all committee linkages for this candidate
  const linkagesQuery = `
    SELECT 
      ccl.cmte_id,
      ccl.cand_election_yr,
      cm.cmte_nm as committee_name,
      cm.cmte_tp as committee_type,
      cm.cmte_dsgn as committee_designation
    FROM candidate_committee_linkages ccl
    LEFT JOIN committee_master cm ON ccl.cmte_id = cm.cmte_id
    WHERE ccl.cand_id = $1 
    AND ccl.cand_election_yr = 2024
    ORDER BY cm.cmte_nm
  `;
  
  const linkagesResult = await executeQuery(fecPool, linkagesQuery, [candidateId]);
  
  if (linkagesResult.success && linkagesResult.data) {
    console.log(`   📊 Found ${linkagesResult.data.length} committee linkages for 2024:`);
    linkagesResult.data.forEach((linkage, index) => {
      console.log(`      ${index + 1}. ${linkage.committee_name || 'Unknown'} (${linkage.cmte_id})`);
      console.log(`         Type: ${linkage.committee_type}, Designation: ${linkage.committee_designation}`);
    });
  }
  
  return linkagesResult.data || [];
}

async function investigateIndividualContributions(committees) {
  console.log('\n🔍 Investigating Individual Contributions...');
  
  const candidateId = 'H8MI13250';
  
  // 1. Check total contributions without any filters
  const totalQuery = `
    SELECT 
      COUNT(*) as total_count,
      SUM(ic.transaction_amt) as total_amount
    FROM individual_contributions ic
    WHERE ic.file_year = 2024
  `;
  
  const totalResult = await executeQuery(fecPool, totalQuery);
  
  if (totalResult.success && totalResult.data) {
    const data = totalResult.data[0];
    console.log(`   📊 Total 2024 contributions in database:`);
    console.log(`      Count: ${data.total_count?.toLocaleString() || 0}`);
    console.log(`      Amount: $${data.total_amount?.toLocaleString() || 0}`);
  }
  
  // 2. Check contributions for each committee
  for (const committee of committees) {
    const committeeQuery = `
      SELECT 
        COUNT(*) as contribution_count,
        SUM(ic.transaction_amt) as total_amount,
        MIN(ic.transaction_dt) as earliest_date,
        MAX(ic.transaction_dt) as latest_date
      FROM individual_contributions ic
      WHERE ic.cmte_id = $1 
      AND ic.file_year = 2024
      AND ic.transaction_amt > 0
    `;
    
    const committeeResult = await executeQuery(fecPool, committeeQuery, [committee.cmte_id]);
    
    if (committeeResult.success && committeeResult.data && committeeResult.data.length > 0) {
      const data = committeeResult.data[0];
      console.log(`\n   📊 Committee: ${committee.committee_name} (${committee.cmte_id})`);
      console.log(`      Contributions: ${data.contribution_count?.toLocaleString() || 0}`);
      console.log(`      Amount: $${data.total_amount?.toLocaleString() || 0}`);
      console.log(`      Date Range: ${data.earliest_date || 'N/A'} to ${data.latest_date || 'N/A'}`);
    }
  }
  
  // 3. Check our current query logic
  const ourQuery = `
    SELECT 
      SUM(ic.transaction_amt) as total_receipts,
      COUNT(*) as contribution_count,
      COUNT(DISTINCT ic.name || ic.city || ic.state) as unique_contributors
    FROM individual_contributions ic
    JOIN candidate_committee_linkages ccl ON ic.cmte_id = ccl.cmte_id
    WHERE ccl.cand_id = $1 
    AND ccl.cand_election_yr = 2024
    AND ic.file_year = 2024
    AND ic.transaction_amt > 0
  `;
  
  const ourResult = await executeQuery(fecPool, ourQuery, [candidateId]);
  
  if (ourResult.success && ourResult.data && ourResult.data.length > 0) {
    const data = ourResult.data[0];
    console.log(`\n   📊 Our Current Query Result:`);
    console.log(`      Total Receipts: $${data.total_receipts?.toLocaleString() || 0}`);
    console.log(`      Contribution Count: ${data.contribution_count?.toLocaleString() || 0}`);
    console.log(`      Unique Contributors: ${data.unique_contributors?.toLocaleString() || 0}`);
  }
}

async function investigateDataQuality() {
  console.log('\n🔍 Investigating Data Quality Issues...');
  
  const candidateId = 'H8MI13250';
  
  // 1. Check for duplicate committee linkages
  const duplicateQuery = `
    SELECT 
      ccl.cmte_id,
      COUNT(*) as linkage_count
    FROM candidate_committee_linkages ccl
    WHERE ccl.cand_id = $1 
    AND ccl.cand_election_yr = 2024
    GROUP BY ccl.cmte_id
    HAVING COUNT(*) > 1
  `;
  
  const duplicateResult = await executeQuery(fecPool, duplicateQuery, [candidateId]);
  
  if (duplicateResult.success && duplicateResult.data && duplicateResult.data.length > 0) {
    console.log(`   ⚠️  Found duplicate committee linkages:`);
    duplicateResult.data.forEach(row => {
      console.log(`      Committee ${row.cmte_id}: ${row.linkage_count} linkages`);
    });
  } else {
    console.log(`   ✅ No duplicate committee linkages found`);
  }
  
  // 2. Check contribution date ranges
  const dateQuery = `
    SELECT 
      MIN(ic.transaction_dt) as earliest_date,
      MAX(ic.transaction_dt) as latest_date,
      COUNT(DISTINCT ic.transaction_dt) as unique_dates
    FROM individual_contributions ic
    JOIN candidate_committee_linkages ccl ON ic.cmte_id = ccl.cmte_id
    WHERE ccl.cand_id = $1 
    AND ccl.cand_election_yr = 2024
    AND ic.file_year = 2024
    AND ic.transaction_amt > 0
  `;
  
  const dateResult = await executeQuery(fecPool, dateQuery, [candidateId]);
  
  if (dateResult.success && dateResult.data && dateResult.data.length > 0) {
    const data = dateResult.data[0];
    console.log(`\n   📅 Contribution Date Analysis:`);
    console.log(`      Earliest Date: ${data.earliest_date || 'N/A'}`);
    console.log(`      Latest Date: ${data.latest_date || 'N/A'}`);
    console.log(`      Unique Dates: ${data.unique_dates || 0}`);
  }
  
  // 3. Check for negative or zero amounts
  const amountQuery = `
    SELECT 
      COUNT(*) as total_contributions,
      COUNT(CASE WHEN ic.transaction_amt <= 0 THEN 1 END) as zero_or_negative,
      COUNT(CASE WHEN ic.transaction_amt > 0 THEN 1 END) as positive_amounts,
      MIN(ic.transaction_amt) as min_amount,
      MAX(ic.transaction_amt) as max_amount
    FROM individual_contributions ic
    JOIN candidate_committee_linkages ccl ON ic.cmte_id = ccl.cmte_id
    WHERE ccl.cand_id = $1 
    AND ccl.cand_election_yr = 2024
    AND ic.file_year = 2024
  `;
  
  const amountResult = await executeQuery(fecPool, amountQuery, [candidateId]);
  
  if (amountResult.success && amountResult.data && amountResult.data.length > 0) {
    const data = amountResult.data[0];
    console.log(`\n   💰 Amount Analysis:`);
    console.log(`      Total Contributions: ${data.total_contributions?.toLocaleString() || 0}`);
    console.log(`      Zero/Negative: ${data.zero_or_negative?.toLocaleString() || 0}`);
    console.log(`      Positive Amounts: ${data.positive_amounts?.toLocaleString() || 0}`);
    console.log(`      Min Amount: $${data.min_amount?.toLocaleString() || 0}`);
    console.log(`      Max Amount: $${data.max_amount?.toLocaleString() || 0}`);
  }
}

async function testAlternativeQueries() {
  console.log('\n🔍 Testing Alternative Query Approaches...');
  
  const candidateId = 'H8MI13250';
  
  // 1. Test without committee linkage join (direct committee query)
  const directQuery = `
    SELECT 
      SUM(ic.transaction_amt) as total_receipts,
      COUNT(*) as contribution_count
    FROM individual_contributions ic
    WHERE ic.cmte_id = 'C00668608'
    AND ic.file_year = 2024
    AND ic.transaction_amt > 0
  `;
  
  const directResult = await executeQuery(fecPool, directQuery);
  
  if (directResult.success && directResult.data && directResult.data.length > 0) {
    const data = directResult.data[0];
    console.log(`   📊 Direct Committee Query (C00668608):`);
    console.log(`      Total Receipts: $${data.total_receipts?.toLocaleString() || 0}`);
    console.log(`      Contribution Count: ${data.contribution_count?.toLocaleString() || 0}`);
  }
  
  // 2. Test with different date filtering
  const dateFilterQuery = `
    SELECT 
      SUM(ic.transaction_amt) as total_receipts,
      COUNT(*) as contribution_count
    FROM individual_contributions ic
    JOIN candidate_committee_linkages ccl ON ic.cmte_id = ccl.cmte_id
    WHERE ccl.cand_id = $1 
    AND ccl.cand_election_yr = 2024
    AND ic.file_year = 2024
    AND ic.transaction_amt > 0
    AND ic.transaction_dt >= '20230101'
    AND ic.transaction_dt <= '20241231'
  `;
  
  const dateFilterResult = await executeQuery(fecPool, dateFilterQuery, [candidateId]);
  
  if (dateFilterResult.success && dateFilterResult.data && dateFilterResult.data.length > 0) {
    const data = dateFilterResult.data[0];
    console.log(`\n   📊 Date Filtered Query (2023-2024):`);
    console.log(`      Total Receipts: $${data.total_receipts?.toLocaleString() || 0}`);
    console.log(`      Contribution Count: ${data.contribution_count?.toLocaleString() || 0}`);
  }
}

async function runDebugInvestigation() {
  console.log('🔍 Debugging 2024 Data Issues\n');
  console.log('=' .repeat(100));
  
  // 1. Get FEC API baseline
  const fecData = await getFECAPI2024Data();
  
  // 2. Investigate committee linkages
  const committees = await investigateCommitteeLinkages();
  
  // 3. Investigate individual contributions
  await investigateIndividualContributions(committees);
  
  // 4. Investigate data quality issues
  await investigateDataQuality();
  
  // 5. Test alternative queries
  await testAlternativeQueries();
  
  // Close database connection
  await fecPool.end();
  
  console.log('\n✅ Debug investigation completed!');
}

// Run the investigation
runDebugInvestigation().catch(console.error); 