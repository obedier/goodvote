const { Pool } = require('pg');

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

async function investigateTransactionTypes() {
  console.log('🔍 Investigating Transaction Types in Database\n');
  console.log('=' .repeat(80));
  
  const candidateId = 'H8MI13250';
  const cycle = 2024;
  
  // 1. Check individual_contributions transaction types
  const individualTypesQuery = `
    SELECT 
      ic.transaction_tp,
      COUNT(*) as count,
      SUM(ic.transaction_amt) as total_amount
    FROM individual_contributions ic
    JOIN (
      SELECT DISTINCT cmte_id, cand_id, cand_election_yr 
      FROM candidate_committee_linkages 
      WHERE cand_id = $1 AND cand_election_yr = $2
    ) ccl ON ic.cmte_id = ccl.cmte_id
    WHERE ic.file_year = $2
    AND ic.transaction_amt > 0
    GROUP BY ic.transaction_tp
    ORDER BY total_amount DESC
  `;
  
  const individualTypesResult = await executeQuery(fecPool, individualTypesQuery, [candidateId, cycle]);
  
  if (individualTypesResult.success && individualTypesResult.data) {
    console.log(`📊 Individual Contributions Transaction Types:`);
    individualTypesResult.data.forEach((row, index) => {
      console.log(`   ${index + 1}. Type ${row.transaction_tp}: $${row.total_amount?.toLocaleString() || 0} (${row.count} transactions)`);
    });
  }
  
  // 2. Check committee_transactions table exists and has data
  const committeeExistsQuery = `
    SELECT 
      COUNT(*) as table_exists
    FROM information_schema.tables 
    WHERE table_name = 'committee_transactions'
  `;
  
  const committeeExistsResult = await executeQuery(fecPool, committeeExistsQuery);
  
  if (committeeExistsResult.success && committeeExistsResult.data && committeeExistsResult.data.length > 0) {
    const exists = committeeExistsResult.data[0].table_exists > 0;
    console.log(`\n📊 Committee Transactions Table: ${exists ? 'EXISTS' : 'DOES NOT EXIST'}`);
    
    if (exists) {
      // Check committee transaction types
      const committeeTypesQuery = `
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
      
      const committeeTypesResult = await executeQuery(fecPool, committeeTypesQuery, [candidateId, cycle]);
      
      if (committeeTypesResult.success && committeeTypesResult.data) {
        console.log(`\n📊 Committee Transactions Types:`);
        committeeTypesResult.data.forEach((row, index) => {
          console.log(`   ${index + 1}. Type ${row.transaction_tp}: $${row.total_amount?.toLocaleString() || 0} (${row.count} transactions)`);
        });
      }
    }
  }
  
  // 3. Check operating_expenditures table
  const expendituresExistsQuery = `
    SELECT 
      COUNT(*) as table_exists
    FROM information_schema.tables 
    WHERE table_name = 'operating_expenditures'
  `;
  
  const expendituresExistsResult = await executeQuery(fecPool, expendituresExistsQuery);
  
  if (expendituresExistsResult.success && expendituresExistsResult.data && expendituresExistsResult.data.length > 0) {
    const exists = expendituresExistsResult.data[0].table_exists > 0;
    console.log(`\n📊 Operating Expenditures Table: ${exists ? 'EXISTS' : 'DOES NOT EXIST'}`);
    
    if (exists) {
      const expendituresQuery = `
        SELECT 
          COUNT(*) as count,
          SUM(oe.transaction_amt) as total_amount
        FROM operating_expenditures oe
        JOIN (
          SELECT DISTINCT cmte_id, cand_id, cand_election_yr 
          FROM candidate_committee_linkages 
          WHERE cand_id = $1 AND cand_election_yr = $2
        ) ccl ON oe.cmte_id = ccl.cmte_id
        WHERE oe.file_year = $2
        AND oe.transaction_amt > 0
      `;
      
      const expendituresResult = await executeQuery(fecPool, expendituresQuery, [candidateId, cycle]);
      
      if (expendituresResult.success && expendituresResult.data && expendituresResult.data.length > 0) {
        const data = expendituresResult.data[0];
        console.log(`   Total Expenditures: $${data.total_amount?.toLocaleString() || 0} (${data.count} transactions)`);
      }
    }
  }
  
  // 4. Check what tables we have
  const tablesQuery = `
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name LIKE '%transaction%' 
    OR table_name LIKE '%contribution%'
    OR table_name LIKE '%expenditure%'
    ORDER BY table_name
  `;
  
  const tablesResult = await executeQuery(fecPool, tablesQuery);
  
  if (tablesResult.success && tablesResult.data) {
    console.log(`\n📊 Available Transaction-Related Tables:`);
    tablesResult.data.forEach((row, index) => {
      console.log(`   ${index + 1}. ${row.table_name}`);
    });
  }
  
  // Close database connection
  await fecPool.end();
  
  console.log(`\n✅ Transaction types investigation completed!`);
}

// Run the investigation
investigateTransactionTypes().catch(console.error); 