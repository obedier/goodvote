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

async function analyzeRashidaTlaibByCycle() {
  console.log('🔍 Detailed Analysis: Rashida Tlaib Campaign Finance\n');
  console.log('=' .repeat(100));

  const candidateId = 'H8MI13250';
  const cycles = [2026, 2024, 2022, 2020, 2018];

  for (const cycle of cycles) {
    console.log(`\n📊 ${cycle} Election Cycle:`);
    console.log('-'.repeat(60));

    // 1. Individual Contributions
    const individualQuery = `
      SELECT 
        SUM(ic.transaction_amt) as total_receipts,
        COUNT(*) as contribution_count,
        COUNT(DISTINCT ic.name || ic.city || ic.state) as unique_contributors,
        MIN(ic.transaction_dt) as earliest_date,
        MAX(ic.transaction_dt) as latest_date
      FROM individual_contributions ic
      JOIN candidate_committee_linkages ccl ON ic.cmte_id = ccl.cmte_id
      WHERE ccl.cand_id = $1 
      AND ccl.cand_election_yr = $2
      AND ic.transaction_amt > 0
    `;
    
    const individualResult = await executeQuery(fecPool, individualQuery, [candidateId, cycle]);
    
    if (individualResult.success && individualResult.data && individualResult.data.length > 0) {
      const data = individualResult.data[0];
      console.log(`   Individual Contributions:`);
      console.log(`     Total: $${(data.total_receipts || 0).toLocaleString()}`);
      console.log(`     Count: ${(data.contribution_count || 0).toLocaleString()}`);
      console.log(`     Unique Contributors: ${(data.unique_contributors || 0).toLocaleString()}`);
      console.log(`     Date Range: ${data.earliest_date || 'N/A'} to ${data.latest_date || 'N/A'}`);
    } else {
      console.log(`   Individual Contributions: No data found for ${cycle}`);
    }

    // 2. PAC Contributions (Committee Transactions)
    const pacQuery = `
      SELECT 
        SUM(ct.transaction_amt) as total_pac_contributions,
        COUNT(*) as pac_contribution_count,
        COUNT(DISTINCT ct.other_id) as unique_pacs
      FROM committee_transactions ct
      JOIN candidate_committee_linkages ccl ON ct.cmte_id = ccl.cmte_id
      WHERE ccl.cand_id = $1 
      AND ccl.cand_election_yr = $2
      AND ct.transaction_amt > 0
      AND ct.transaction_tp IN ('24A', '24C', '24E', '24F', '24G', '24H', '24I', '24K', '24L', '24M', '24N', '24O', '24P', '24Q', '24R', '24S', '24T', '24U', '24V', '24W', '24X', '24Y', '24Z')
    `;
    
    const pacResult = await executeQuery(fecPool, pacQuery, [candidateId, cycle]);
    
    if (pacResult.success && pacResult.data && pacResult.data.length > 0) {
      const data = pacResult.data[0];
      console.log(`   PAC Contributions:`);
      console.log(`     Total: $${(data.total_pac_contributions || 0).toLocaleString()}`);
      console.log(`     Count: ${(data.pac_contribution_count || 0).toLocaleString()}`);
      console.log(`     Unique PACs: ${(data.unique_pacs || 0).toLocaleString()}`);
    } else {
      console.log(`   PAC Contributions: No data found for ${cycle}`);
    }

    // 3. Operating Expenditures
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
    
    const expendituresResult = await executeQuery(fecPool, expendituresQuery, [candidateId, cycle]);
    
    if (expendituresResult.success && expendituresResult.data && expendituresResult.data.length > 0) {
      const data = expendituresResult.data[0];
      console.log(`   Operating Expenditures:`);
      console.log(`     Total: $${(data.total_expenditures || 0).toLocaleString()}`);
      console.log(`     Count: ${(data.expenditure_count || 0).toLocaleString()}`);
    } else {
      console.log(`   Operating Expenditures: No data available for ${cycle}`);
    }

    // 4. Committee Information
    const committeesQuery = `
      SELECT 
        ccl.cmte_id,
        cm.cmte_nm as committee_name,
        cm.cmte_tp as committee_type,
        cm.cmte_dsgn as committee_designation,
        ccl.cand_election_yr
      FROM candidate_committee_linkages ccl
      LEFT JOIN committee_master cm ON ccl.cmte_id = cm.cmte_id
      WHERE ccl.cand_id = $1 
      AND ccl.cand_election_yr = $2
      ORDER BY cm.cmte_nm
    `;
    
    const committeesResult = await executeQuery(fecPool, committeesQuery, [candidateId, cycle]);
    
    if (committeesResult.success && committeesResult.data && committeesResult.data.length > 0) {
      console.log(`   Committees for ${cycle}:`);
      committeesResult.data.forEach((committee, index) => {
        console.log(`     ${index + 1}. ${committee.committee_name || 'Unknown'} (${committee.cmte_id})`);
        console.log(`        Type: ${committee.committee_type}, Designation: ${committee.committee_designation}`);
      });
    } else {
      console.log(`   Committees: No data found for ${cycle}`);
    }
  }
}

async function checkDataQualityIssues() {
  console.log(`\n🔍 Data Quality Analysis:`);
  console.log('=' .repeat(100));

  const candidateId = 'H8MI13250';

  // Check for duplicate data across cycles
  console.log(`\n📊 Checking for Data Quality Issues:`);

  // 1. Check if same data appears in multiple cycles
  const duplicateCheckQuery = `
    SELECT 
      ccl.cand_election_yr,
      COUNT(DISTINCT ic.transaction_amt) as unique_amounts,
      COUNT(*) as total_contributions,
      MIN(ic.transaction_dt) as earliest_date,
      MAX(ic.transaction_dt) as latest_date
    FROM individual_contributions ic
    JOIN candidate_committee_linkages ccl ON ic.cmte_id = ccl.cmte_id
    WHERE ccl.cand_id = $1 
    AND ccl.cand_election_yr IN (2022, 2024)
    AND ic.transaction_amt > 0
    GROUP BY ccl.cand_election_yr
    ORDER BY ccl.cand_election_yr
  `;

  const duplicateResult = await executeQuery(fecPool, duplicateCheckQuery, [candidateId]);
  
  if (duplicateResult.success && duplicateResult.data) {
    console.log(`   Data Comparison (2022 vs 2024):`);
    duplicateResult.data.forEach(row => {
      console.log(`     ${row.cand_election_yr}: ${row.total_contributions.toLocaleString()} contributions`);
      console.log(`        Unique amounts: ${row.unique_amounts.toLocaleString()}`);
      console.log(`        Date range: ${row.earliest_date || 'N/A'} to ${row.latest_date || 'N/A'}`);
    });
  }

  // 2. Check committee linkages
  const committeeCheckQuery = `
    SELECT 
      ccl.cmte_id,
      ccl.cand_election_yr,
      cm.cmte_nm as committee_name,
      COUNT(*) as linkage_count
    FROM candidate_committee_linkages ccl
    LEFT JOIN committee_master cm ON ccl.cmte_id = cm.cmte_id
    WHERE ccl.cand_id = $1 
    AND ccl.cand_election_yr IN (2022, 2024)
    GROUP BY ccl.cmte_id, ccl.cand_election_yr, cm.cmte_nm
    ORDER BY ccl.cand_election_yr, cm.cmte_nm
  `;

  const committeeResult = await executeQuery(fecPool, committeeCheckQuery, [candidateId]);
  
  if (committeeResult.success && committeeResult.data) {
    console.log(`\n   Committee Linkages:`);
    committeeResult.data.forEach(row => {
      console.log(`     ${row.cand_election_yr}: ${row.committee_name || 'Unknown'} (${row.cmte_id}) - ${row.linkage_count} linkages`);
    });
  }

  // 3. Check for 2026 data
  const check2026Query = `
    SELECT 
      ccl.cand_election_yr,
      COUNT(*) as linkage_count
    FROM candidate_committee_linkages ccl
    WHERE ccl.cand_id = $1 
    AND ccl.cand_election_yr = 2026
  `;

  const check2026Result = await executeQuery(fecPool, check2026Query, [candidateId]);
  
  if (check2026Result.success && check2026Result.data && check2026Result.data.length > 0) {
    console.log(`\n   ✅ 2026 Data Available: ${check2026Result.data[0].linkage_count} committee linkages`);
  } else {
    console.log(`\n   ❌ 2026 Data: No committee linkages found`);
  }
}

async function compareWithFECWebsite() {
  console.log(`\n🌐 FEC Website Comparison:`);
  console.log('=' .repeat(100));

  console.log(`\n📋 FEC Website Data (Manual Check):`);
  console.log(`   Reported Total: $8,473,097.48`);
  console.log(`   Source: https://www.fec.gov/data/candidate/H8MI13250/?cycle=2024`);
  console.log(`   Committee: RASHIDA TLAIB FOR CONGRESS (C00668608)`);

  console.log(`\n🔍 Potential Issues:`);
  console.log(`   1. Data filtering may be incorrect`);
  console.log(`   2. Multiple committees may be involved`);
  console.log(`   3. Date ranges may not align with election cycle`);
  console.log(`   4. Committee linkages may be duplicated across cycles`);

  console.log(`\n💡 Recommendations:`);
  console.log(`   1. Verify committee linkages are correct`);
  console.log(`   2. Check date ranges for contributions`);
  console.log(`   3. Ensure proper election cycle filtering`);
  console.log(`   4. Add 2026 cycle data when available`);
}

async function runDetailedAnalysis() {
  console.log('🔍 Rashida Tlaib - Detailed Campaign Finance Analysis\n');
  
  // 1. Analyze by cycle and category
  await analyzeRashidaTlaibByCycle();
  
  // 2. Check for data quality issues
  await checkDataQualityIssues();
  
  // 3. Compare with FEC website
  await compareWithFECWebsite();
  
  // Close database connection
  await fecPool.end();
  
  console.log(`\n✅ Detailed analysis completed!`);
}

// Run the analysis
runDetailedAnalysis().catch(console.error); 