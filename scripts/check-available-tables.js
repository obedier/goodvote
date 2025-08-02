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

async function checkAvailableTables() {
  console.log('🔍 Checking Available Tables for Additional Metrics\n');
  console.log('=' .repeat(100));
  
  // 1. List all tables
  const allTablesQuery = `
    SELECT table_name
    FROM information_schema.tables 
    WHERE table_schema = 'public'
    ORDER BY table_name
  `;
  
  const allTablesResult = await executeQuery(fecPool, allTablesQuery);
  
  if (allTablesResult.success && allTablesResult.data) {
    console.log(`📊 All Available Tables (${allTablesResult.data.length} total):`);
    allTablesResult.data.forEach((table, index) => {
      console.log(`   ${index + 1}. ${table.table_name}`);
    });
  }
  
  // 2. Check for independent expenditure related tables
  const independentTablesQuery = `
    SELECT table_name
    FROM information_schema.tables 
    WHERE table_schema = 'public'
    AND (table_name ILIKE '%independent%' 
         OR table_name ILIKE '%expenditure%'
         OR table_name ILIKE '%outside%'
         OR table_name ILIKE '%super%')
    ORDER BY table_name
  `;
  
  const independentTablesResult = await executeQuery(fecPool, independentTablesQuery);
  
  if (independentTablesResult.success && independentTablesResult.data) {
    console.log(`\n📊 Independent Expenditure Related Tables:`);
    if (independentTablesResult.data.length > 0) {
      independentTablesResult.data.forEach((table, index) => {
        console.log(`   ${index + 1}. ${table.table_name}`);
      });
    } else {
      console.log(`   No independent expenditure tables found`);
    }
  }
  
  // 3. Check for PAC related tables
  const pacTablesQuery = `
    SELECT table_name
    FROM information_schema.tables 
    WHERE table_schema = 'public'
    AND (table_name ILIKE '%pac%' 
         OR table_name ILIKE '%committee%')
    ORDER BY table_name
  `;
  
  const pacTablesResult = await executeQuery(fecPool, pacTablesQuery);
  
  if (pacTablesResult.success && pacTablesResult.data) {
    console.log(`\n📊 PAC/Committee Related Tables:`);
    pacTablesResult.data.forEach((table, index) => {
      console.log(`   ${index + 1}. ${table.table_name}`);
    });
  }
  
  // 4. Check for debt/loan related tables
  const debtTablesQuery = `
    SELECT table_name
    FROM information_schema.tables 
    WHERE table_schema = 'public'
    AND (table_name ILIKE '%debt%' 
         OR table_name ILIKE '%loan%'
         OR table_name ILIKE '%owe%')
    ORDER BY table_name
  `;
  
  const debtTablesResult = await executeQuery(fecPool, debtTablesQuery);
  
  if (debtTablesResult.success && debtTablesResult.data) {
    console.log(`\n📊 Debt/Loan Related Tables:`);
    if (debtTablesResult.data.length > 0) {
      debtTablesResult.data.forEach((table, index) => {
        console.log(`   ${index + 1}. ${table.table_name}`);
      });
    } else {
      console.log(`   No debt/loan tables found`);
    }
  }
  
  // 5. Check committee_candidate_contributions table structure
  const committeeContributionsQuery = `
    SELECT column_name, data_type
    FROM information_schema.columns 
    WHERE table_name = 'committee_candidate_contributions'
    ORDER BY ordinal_position
  `;
  
  const committeeContributionsResult = await executeQuery(fecPool, committeeContributionsQuery);
  
  if (committeeContributionsResult.success && committeeContributionsResult.data) {
    console.log(`\n📊 Committee Candidate Contributions Table Structure:`);
    committeeContributionsResult.data.forEach((column, index) => {
      console.log(`   ${index + 1}. ${column.column_name} (${column.data_type})`);
    });
  }
  
  // 6. Check pac_summary table structure
  const pacSummaryQuery = `
    SELECT column_name, data_type
    FROM information_schema.columns 
    WHERE table_name = 'pac_summary'
    ORDER BY ordinal_position
  `;
  
  const pacSummaryResult = await executeQuery(fecPool, pacSummaryQuery);
  
  if (pacSummaryResult.success && pacSummaryResult.data) {
    console.log(`\n📊 PAC Summary Table Structure:`);
    pacSummaryResult.data.forEach((column, index) => {
      console.log(`   ${index + 1}. ${column.column_name} (${column.data_type})`);
    });
  }
  
  // 7. Test committee_candidate_contributions data for Rashida Tlaib
  const candidateId = 'H8MI13250';
  const cycle = 2024;
  
  const testCommitteeContributionsQuery = `
    SELECT 
      cc.cmte_id,
      cc.transaction_amt,
      cc.transaction_tp,
      cc.transaction_dt,
      cm.cmte_nm,
      cm.cmte_tp
    FROM committee_candidate_contributions cc
    LEFT JOIN committee_master cm ON cc.cmte_id = cm.cmte_id
    WHERE cc.cand_id = $1 
    AND cc.file_year = $2
    AND cc.transaction_amt > 0
    ORDER BY cc.transaction_amt DESC
    LIMIT 5
  `;
  
  const testCommitteeContributionsResult = await executeQuery(fecPool, testCommitteeContributionsQuery, [candidateId, cycle]);
  
  if (testCommitteeContributionsResult.success && testCommitteeContributionsResult.data) {
    console.log(`\n📊 Sample Committee Candidate Contributions for Rashida Tlaib:`);
    testCommitteeContributionsResult.data.forEach((contribution, index) => {
      console.log(`\n   ${index + 1}. Committee: ${contribution.cmte_nm || 'Unknown'} (${contribution.cmte_id})`);
      console.log(`      Amount: $${contribution.transaction_amt?.toLocaleString() || 0}`);
      console.log(`      Type: ${contribution.transaction_tp || 'Unknown'}`);
      console.log(`      Date: ${contribution.transaction_dt || 'Unknown'}`);
      console.log(`      Committee Type: ${contribution.cmte_tp || 'Unknown'}`);
    });
  }
  
  // Close database connection
  await fecPool.end();
  
  console.log(`\n✅ Available tables check completed!`);
}

// Run the check
checkAvailableTables().catch(console.error); 