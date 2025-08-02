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

async function investigatePACSummary() {
  console.log('🔍 Investigating PAC Summary and Other Potential Sources\n');
  console.log('=' .repeat(100));
  
  const candidateId = 'H8MI13250';
  const cycle = 2024;
  
  // 1. Check PAC summary table structure and data
  const pacSummaryQuery = `
    SELECT 
      ps.*,
      cm.cmte_nm as committee_name
    FROM pac_summary ps
    JOIN (
      SELECT DISTINCT cmte_id, cand_id, cand_election_yr 
      FROM candidate_committee_linkages 
      WHERE cand_id = $1 AND cand_election_yr = $2
    ) ccl ON ps.cmte_id = ccl.cmte_id
    LEFT JOIN committee_master cm ON ps.cmte_id = cm.cmte_id
    WHERE ps.file_year = $2
    ORDER BY cm.cmte_nm
  `;
  
  const pacSummaryResult = await executeQuery(fecPool, pacSummaryQuery, [candidateId, cycle]);
  
  if (pacSummaryResult.success && pacSummaryResult.data) {
    console.log(`📊 PAC Summary Data:`);
    pacSummaryResult.data.forEach((row, index) => {
      console.log(`\n   ${index + 1}. Committee: ${row.committee_name || 'Unknown'} (${row.cmte_id})`);
      console.log(`      File Year: ${row.file_year}`);
      // Show all columns to understand the structure
      Object.keys(row).forEach(key => {
        if (key !== 'committee_name' && row[key] !== null) {
          console.log(`      ${key}: ${row[key]}`);
        }
      });
    });
  }
  
  // 2. Check committee_candidate_contributions table
  const committeeContributionsQuery = `
    SELECT 
      ccc.*,
      cm.cmte_nm as committee_name
    FROM committee_candidate_contributions ccc
    JOIN (
      SELECT DISTINCT cmte_id, cand_id, cand_election_yr 
      FROM candidate_committee_linkages 
      WHERE cand_id = $1 AND cand_election_yr = $2
    ) ccl ON ccc.cmte_id = ccl.cmte_id
    LEFT JOIN committee_master cm ON ccc.cmte_id = cm.cmte_id
    WHERE ccc.file_year = $2
    ORDER BY cm.cmte_nm
  `;
  
  const committeeContributionsResult = await executeQuery(fecPool, committeeContributionsQuery, [candidateId, cycle]);
  
  if (committeeContributionsResult.success && committeeContributionsResult.data) {
    console.log(`\n📊 Committee Candidate Contributions Data:`);
    committeeContributionsResult.data.forEach((row, index) => {
      console.log(`\n   ${index + 1}. Committee: ${row.committee_name || 'Unknown'} (${row.cmte_id})`);
      console.log(`      File Year: ${row.file_year}`);
      // Show all columns to understand the structure
      Object.keys(row).forEach(key => {
        if (key !== 'committee_name' && row[key] !== null) {
          console.log(`      ${key}: ${row[key]}`);
        }
      });
    });
  }
  
  // 3. Check if there are any unitemized contributions in individual_contributions
  const unitemizedQuery = `
    SELECT 
      ic.transaction_tp,
      COUNT(*) as count,
      SUM(ic.transaction_amt) as total_amount,
      MIN(ic.transaction_amt) as min_amount,
      MAX(ic.transaction_amt) as max_amount
    FROM individual_contributions ic
    JOIN (
      SELECT DISTINCT cmte_id, cand_id, cand_election_yr 
      FROM candidate_committee_linkages 
      WHERE cand_id = $1 AND cand_election_yr = $2
    ) ccl ON ic.cmte_id = ccl.cmte_id
    WHERE ic.file_year = $2
    AND ic.transaction_amt > 0
    AND ic.transaction_amt <= 200  -- Unitemized contributions are typically under $200
    GROUP BY ic.transaction_tp
    ORDER BY total_amount DESC
  `;
  
  const unitemizedResult = await executeQuery(fecPool, unitemizedQuery, [candidateId, cycle]);
  
  if (unitemizedResult.success && unitemizedResult.data) {
    console.log(`\n📊 Potential Unitemized Contributions (≤$200):`);
    unitemizedResult.data.forEach((row, index) => {
      console.log(`   ${index + 1}. Type ${row.transaction_tp}: $${row.total_amount?.toLocaleString() || 0} (${row.count} transactions, $${row.min_amount}-$${row.max_amount})`);
    });
  }
  
  // 4. Check committee_transactions for any summary-like data
  const committeeTransactionsQuery = `
    SELECT 
      ct.transaction_tp,
      COUNT(*) as count,
      SUM(ct.transaction_amt) as total_amount
    FROM committee_transactions ct
    JOIN (
      SELECT DISTINCT cmte_id, cand_id, cand_election_yr 
      FROM candidate_committee_linkages 
      WHERE cand_id = $1 AND cand_election_yr = $2
    ) ccl ON ct.cmte_id = ccl.cmte_id
    WHERE ct.file_year = $2
    AND ct.transaction_amt > 0
    GROUP BY ct.transaction_tp
    ORDER BY total_amount DESC
    LIMIT 10
  `;
  
  const committeeTransactionsResult = await executeQuery(fecPool, committeeTransactionsQuery, [candidateId, cycle]);
  
  if (committeeTransactionsResult.success && committeeTransactionsResult.data) {
    console.log(`\n📊 Committee Transactions Types:`);
    committeeTransactionsResult.data.forEach((row, index) => {
      console.log(`   ${index + 1}. Type ${row.transaction_tp}: $${row.total_amount?.toLocaleString() || 0} (${row.count} transactions)`);
    });
  }
  
  // 5. Check what other tables might contain summary data
  const allTablesQuery = `
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    ORDER BY table_name
  `;
  
  const allTablesResult = await executeQuery(fecPool, allTablesQuery);
  
  if (allTablesResult.success && allTablesResult.data) {
    console.log(`\n📊 All Available Tables:`);
    allTablesResult.data.forEach((row, index) => {
      console.log(`   ${index + 1}. ${row.table_name}`);
    });
  }
  
  // Close database connection
  await fecPool.end();
  
  console.log(`\n✅ PAC summary investigation completed!`);
}

// Run the investigation
investigatePACSummary().catch(console.error); 