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

async function checkCandidateSummaryContributionCount() {
  console.log('🔍 Checking Candidate Summary for Contribution Count Fields\n');
  console.log('=' .repeat(100));
  
  // 1. Check all columns that might contain count information
  const countColumnsQuery = `
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns 
    WHERE table_name = 'candidate_summary'
    AND (column_name ILIKE '%count%' 
         OR column_name ILIKE '%number%' 
         OR column_name ILIKE '%contrib%'
         OR column_name ILIKE '%indiv%'
         OR column_name ILIKE '%item%'
         OR column_name ILIKE '%unitem%')
    ORDER BY column_name
  `;
  
  const countColumnsResult = await executeQuery(fecPool, countColumnsQuery);
  
  if (countColumnsResult.success && countColumnsResult.data) {
    console.log(`📊 Potential Count-Related Columns:`);
    countColumnsResult.data.forEach((column, index) => {
      console.log(`   ${index + 1}. ${column.column_name} (${column.data_type}) - ${column.is_nullable === 'YES' ? 'NULLABLE' : 'NOT NULL'}`);
    });
  }
  
  // 2. Check for any columns that might contain contribution counts
  const allColumnsQuery = `
    SELECT column_name, data_type
    FROM information_schema.columns 
    WHERE table_name = 'candidate_summary'
    ORDER BY ordinal_position
  `;
  
  const allColumnsResult = await executeQuery(fecPool, allColumnsQuery);
  
  if (allColumnsResult.success && allColumnsResult.data) {
    console.log(`\n📊 All Candidate Summary Columns:`);
    allColumnsResult.data.forEach((column, index) => {
      console.log(`   ${index + 1}. ${column.column_name} (${column.data_type})`);
    });
  }
  
  // 3. Check Rashida Tlaib's data for any count-related fields
  const candidateId = 'H8MI13250';
  const cycle = 2024;
  
  const candidateDataQuery = `
    SELECT 
      cs.*
    FROM candidate_summary cs
    WHERE cs.cand_id = $1 
    AND cs.file_year = $2
  `;
  
  const candidateDataResult = await executeQuery(fecPool, candidateDataQuery, [candidateId, cycle]);
  
  if (candidateDataResult.success && candidateDataResult.data) {
    console.log(`\n📊 Rashida Tlaib's Candidate Summary Data:`);
    candidateDataResult.data.forEach((row, index) => {
      console.log(`\n   ${index + 1}. Record:`);
      Object.keys(row).forEach(key => {
        if (row[key] !== null && row[key] !== undefined) {
          console.log(`      ${key}: ${row[key]}`);
        }
      });
    });
  }
  
  // 4. Check if there are any other summary tables that might have count data
  const otherSummaryTablesQuery = `
    SELECT table_name
    FROM information_schema.tables 
    WHERE table_schema = 'public'
    AND table_name LIKE '%summary%'
    ORDER BY table_name
  `;
  
  const otherSummaryTablesResult = await executeQuery(fecPool, otherSummaryTablesQuery);
  
  if (otherSummaryTablesResult.success && otherSummaryTablesResult.data) {
    console.log(`\n📊 Other Summary Tables:`);
    otherSummaryTablesResult.data.forEach((table, index) => {
      console.log(`   ${index + 1}. ${table.table_name}`);
    });
  }
  
  // 5. Check committee_summary table if it exists
  const committeeSummaryQuery = `
    SELECT column_name, data_type
    FROM information_schema.columns 
    WHERE table_name = 'committee_summary'
    AND (column_name ILIKE '%count%' 
         OR column_name ILIKE '%number%' 
         OR column_name ILIKE '%contrib%'
         OR column_name ILIKE '%indiv%')
    ORDER BY column_name
  `;
  
  const committeeSummaryResult = await executeQuery(fecPool, committeeSummaryQuery);
  
  if (committeeSummaryResult.success && committeeSummaryResult.data) {
    console.log(`\n📊 Committee Summary Count-Related Columns:`);
    committeeSummaryResult.data.forEach((column, index) => {
      console.log(`   ${index + 1}. ${column.column_name} (${column.data_type})`);
    });
  }
  
  // 6. Analysis
  console.log(`\n🔍 ANALYSIS:`);
  console.log(`   The candidate_summary table appears to contain aggregated financial totals`);
  console.log(`   but may not contain individual contribution counts.`);
  console.log(`   For contribution counts, we still need to query individual_contributions table.`);
  console.log(`   This is actually correct - counts and amounts serve different purposes.`);
  
  // Close database connection
  await fecPool.end();
  
  console.log(`\n✅ Candidate summary contribution count check completed!`);
}

// Run the check
checkCandidateSummaryContributionCount().catch(console.error); 