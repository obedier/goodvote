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

async function checkHouseSenateUnitemized() {
  console.log('🔍 Checking for Unitemized Contributions in House Senate Current Campaigns\n');
  console.log('=' .repeat(100));
  
  // 1. Check the structure of house_senate_current_campaigns table
  const structureQuery = `
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns 
    WHERE table_name = 'house_senate_current_campaigns'
    ORDER BY ordinal_position
  `;
  
  const structureResult = await executeQuery(fecPool, structureQuery);
  
  if (structureResult.success && structureResult.data) {
    console.log(`📊 House Senate Current Campaigns Table Structure:`);
    structureResult.data.forEach((column, index) => {
      console.log(`   ${index + 1}. ${column.column_name} (${column.data_type}) - ${column.is_nullable === 'YES' ? 'NULLABLE' : 'NOT NULL'}`);
    });
  }
  
  // 2. Look for unitemized contributions data for Rashida Tlaib
  const candidateId = 'H8MI13250';
  const cycle = 2024;
  
  const unitemizedQuery = `
    SELECT 
      hsc.*
    FROM house_senate_current_campaigns hsc
    WHERE hsc.cand_id = $1 
    AND hsc.file_year = $2
    ORDER BY hsc.file_year DESC, hsc.rpt_tp
  `;
  
  const unitemizedResult = await executeQuery(fecPool, unitemizedQuery, [candidateId, cycle]);
  
  if (unitemizedResult.success && unitemizedResult.data) {
    console.log(`\n📊 House Senate Data for Rashida Tlaib (${candidateId}):`);
    unitemizedResult.data.forEach((row, index) => {
      console.log(`\n   ${index + 1}. Report Type: ${row.rpt_tp || 'N/A'}`);
      console.log(`      File Year: ${row.file_year || 'N/A'}`);
      console.log(`      Committee ID: ${row.cmte_id || 'N/A'}`);
      
      // Look for unitemized-related columns
      const unitemizedColumns = [
        'unitemized_individual_contributions',
        'unitemized_contributions',
        'individual_unitemized',
        'unitemized_amount',
        'unitemized_contributions_amt',
        'unitemized_individual',
        'unitemized_individual_contributions_amt',
        'unitemized_individual_contributions_per',
        'unitemized_individual_contributions_ytd'
      ];
      
      unitemizedColumns.forEach(col => {
        if (row[col] !== null && row[col] !== undefined) {
          console.log(`      ${col}: $${row[col]?.toLocaleString() || 0}`);
        }
      });
      
      // Also show all columns that might contain contribution data
      Object.keys(row).forEach(key => {
        if (key.toLowerCase().includes('contribution') || 
            key.toLowerCase().includes('receipt') ||
            key.toLowerCase().includes('individual') ||
            key.toLowerCase().includes('unitemized') ||
            key.toLowerCase().includes('total')) {
          if (row[key] !== null && row[key] !== undefined) {
            console.log(`      ${key}: ${row[key]}`);
          }
        }
      });
    });
  }
  
  // 3. Check if there are any columns with unitemized data
  const unitemizedColumnsQuery = `
    SELECT column_name
    FROM information_schema.columns 
    WHERE table_name = 'house_senate_current_campaigns'
    AND (column_name ILIKE '%unitemized%' OR column_name ILIKE '%individual%')
    ORDER BY column_name
  `;
  
  const unitemizedColumnsResult = await executeQuery(fecPool, unitemizedColumnsQuery);
  
  if (unitemizedColumnsResult.success && unitemizedColumnsResult.data) {
    console.log(`\n📊 Columns with Unitemized/Individual Data:`);
    unitemizedColumnsResult.data.forEach((column, index) => {
      console.log(`   ${index + 1}. ${column.column_name}`);
    });
  }
  
  // 4. Check for any unitemized data across all candidates
  const allUnitemizedQuery = `
    SELECT 
      cand_id,
      file_year,
      rpt_tp,
      COUNT(*) as record_count
    FROM house_senate_current_campaigns hsc
    WHERE hsc.file_year = 2024
    GROUP BY cand_id, file_year, rpt_tp
    ORDER BY cand_id, file_year DESC
    LIMIT 10
  `;
  
  const allUnitemizedResult = await executeQuery(fecPool, allUnitemizedQuery);
  
  if (allUnitemizedResult.success && allUnitemizedResult.data) {
    console.log(`\n📊 Sample House Senate Records (2024):`);
    allUnitemizedResult.data.forEach((row, index) => {
      console.log(`   ${index + 1}. Candidate: ${row.cand_id}, Year: ${row.file_year}, Report: ${row.rpt_tp}, Records: ${row.record_count}`);
    });
  }
  
  // 5. Calculate totals from house_senate_current_campaigns
  const totalsQuery = `
    SELECT 
      SUM(CASE WHEN hsc.unitemized_individual_contributions IS NOT NULL THEN hsc.unitemized_individual_contributions ELSE 0 END) as total_unitemized,
      SUM(CASE WHEN hsc.individual_contributions IS NOT NULL THEN hsc.individual_contributions ELSE 0 END) as total_individual,
      SUM(CASE WHEN hsc.total_receipts IS NOT NULL THEN hsc.total_receipts ELSE 0 END) as total_receipts,
      COUNT(*) as record_count
    FROM house_senate_current_campaigns hsc
    WHERE hsc.cand_id = $1 
    AND hsc.file_year = $2
  `;
  
  const totalsResult = await executeQuery(fecPool, totalsQuery, [candidateId, cycle]);
  
  if (totalsResult.success && totalsResult.data && totalsResult.data.length > 0) {
    const data = totalsResult.data[0];
    console.log(`\n📊 Totals from House Senate Current Campaigns:`);
    console.log(`   Unitemized Individual Contributions: $${data.total_unitemized?.toLocaleString() || 0}`);
    console.log(`   Total Individual Contributions: $${data.total_individual?.toLocaleString() || 0}`);
    console.log(`   Total Receipts: $${data.total_receipts?.toLocaleString() || 0}`);
    console.log(`   Record Count: ${data.record_count?.toLocaleString() || 0}`);
  }
  
  // 6. Compare with our previous calculations
  console.log(`\n🌐 COMPARISON WITH PREVIOUS CALCULATIONS:`);
  console.log(`   Our Previous Individual Total: $5,455,958`);
  console.log(`   FEC Website Individual Total: $8,097,297.14`);
  console.log(`   Missing Amount: $2,641,339.14`);
  
  // Close database connection
  await fecPool.end();
  
  console.log(`\n✅ House Senate unitemized check completed!`);
}

// Run the check
checkHouseSenateUnitemized().catch(console.error); 