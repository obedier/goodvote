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

async function exploreHouseSenateData() {
  console.log('🔍 Exploring House Senate Current Campaigns Data\n');
  console.log('=' .repeat(100));
  
  // 1. Check what columns exist in the table
  const columnsQuery = `
    SELECT column_name, data_type
    FROM information_schema.columns 
    WHERE table_name = 'house_senate_current_campaigns'
    ORDER BY ordinal_position
  `;
  
  const columnsResult = await executeQuery(fecPool, columnsQuery);
  
  if (columnsResult.success && columnsResult.data) {
    console.log(`📊 All Columns in House Senate Current Campaigns:`);
    columnsResult.data.forEach((column, index) => {
      console.log(`   ${index + 1}. ${column.column_name} (${column.data_type})`);
    });
  }
  
  // 2. Look for Rashida Tlaib's data
  const candidateId = 'H8MI13250';
  const cycle = 2024;
  
  const candidateQuery = `
    SELECT 
      *
    FROM house_senate_current_campaigns hsc
    WHERE hsc.cand_id = $1 
    AND hsc.file_year = $2
  `;
  
  const candidateResult = await executeQuery(fecPool, candidateQuery, [candidateId, cycle]);
  
  if (candidateResult.success && candidateResult.data) {
    console.log(`\n📊 House Senate Data for Rashida Tlaib (${candidateId}):`);
    candidateResult.data.forEach((row, index) => {
      console.log(`\n   ${index + 1}. Record:`);
      Object.keys(row).forEach(key => {
        if (row[key] !== null && row[key] !== undefined) {
          console.log(`      ${key}: ${row[key]}`);
        }
      });
    });
  }
  
  // 3. Check if there are any contribution-related columns
  const contributionColumnsQuery = `
    SELECT column_name
    FROM information_schema.columns 
    WHERE table_name = 'house_senate_current_campaigns'
    AND (column_name ILIKE '%contribution%' 
         OR column_name ILIKE '%receipt%' 
         OR column_name ILIKE '%amount%'
         OR column_name ILIKE '%total%'
         OR column_name ILIKE '%money%'
         OR column_name ILIKE '%fund%')
    ORDER BY column_name
  `;
  
  const contributionColumnsResult = await executeQuery(fecPool, contributionColumnsQuery);
  
  if (contributionColumnsResult.success && contributionColumnsResult.data) {
    console.log(`\n📊 Contribution-Related Columns:`);
    contributionColumnsResult.data.forEach((column, index) => {
      console.log(`   ${index + 1}. ${column.column_name}`);
    });
  }
  
  // 4. Check sample data from the table
  const sampleQuery = `
    SELECT 
      cand_id,
      cand_name,
      cand_office,
      cand_office_district,
      file_year,
      COUNT(*) as record_count
    FROM house_senate_current_campaigns hsc
    WHERE hsc.file_year = 2024
    GROUP BY cand_id, cand_name, cand_office, cand_office_district, file_year
    ORDER BY cand_name
    LIMIT 10
  `;
  
  const sampleResult = await executeQuery(fecPool, sampleQuery);
  
  if (sampleResult.success && sampleResult.data) {
    console.log(`\n📊 Sample House Senate Records (2024):`);
    sampleResult.data.forEach((row, index) => {
      console.log(`   ${index + 1}. ${row.cand_name} (${row.cand_id}) - ${row.cand_office} ${row.cand_office_district}, Records: ${row.record_count}`);
    });
  }
  
  // 5. Check if this table has any financial data at all
  const financialQuery = `
    SELECT 
      COUNT(*) as total_records,
      COUNT(DISTINCT cand_id) as unique_candidates,
      MIN(file_year) as min_year,
      MAX(file_year) as max_year
    FROM house_senate_current_campaigns hsc
  `;
  
  const financialResult = await executeQuery(fecPool, financialQuery);
  
  if (financialResult.success && financialResult.data && financialResult.data.length > 0) {
    const data = financialResult.data[0];
    console.log(`\n📊 Table Overview:`);
    console.log(`   Total Records: ${data.total_records?.toLocaleString() || 0}`);
    console.log(`   Unique Candidates: ${data.unique_candidates?.toLocaleString() || 0}`);
    console.log(`   Year Range: ${data.min_year || 'N/A'} - ${data.max_year || 'N/A'}`);
  }
  
  // 6. Check if this table might be a lookup table rather than financial data
  console.log(`\n🔍 ANALYSIS:`);
  console.log(`   This appears to be a candidate lookup table, not a financial summary table`);
  console.log(`   It contains candidate information but likely no unitemized contributions data`);
  console.log(`   We need to look for a different table that contains financial summaries`);
  
  // Close database connection
  await fecPool.end();
  
  console.log(`\n✅ House Senate data exploration completed!`);
}

// Run the exploration
exploreHouseSenateData().catch(console.error); 