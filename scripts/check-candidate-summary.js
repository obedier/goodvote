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

async function checkCandidateSummary() {
  console.log('🔍 Checking for Unitemized Contributions in Candidate Summary Table\n');
  console.log('=' .repeat(100));
  
  // 1. Check if candidate_summary table exists
  const candidateSummaryExistsQuery = `
    SELECT 
      COUNT(*) as table_exists
    FROM information_schema.tables 
    WHERE table_name = 'candidate_summary'
  `;
  
  const candidateSummaryExistsResult = await executeQuery(fecPool, candidateSummaryExistsQuery);
  
  if (candidateSummaryExistsResult.success && candidateSummaryExistsResult.data && candidateSummaryExistsResult.data.length > 0) {
    const exists = candidateSummaryExistsResult.data[0].table_exists > 0;
    console.log(`📊 Candidate Summary Table: ${exists ? 'EXISTS' : 'DOES NOT EXIST'}`);
    
    if (exists) {
      // 2. Check the structure of candidate_summary table
      const structureQuery = `
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns 
        WHERE table_name = 'candidate_summary'
        ORDER BY ordinal_position
      `;
      
      const structureResult = await executeQuery(fecPool, structureQuery);
      
      if (structureResult.success && structureResult.data) {
        console.log(`\n📊 Candidate Summary Table Structure:`);
        structureResult.data.forEach((column, index) => {
          console.log(`   ${index + 1}. ${column.column_name} (${column.data_type}) - ${column.is_nullable === 'YES' ? 'NULLABLE' : 'NOT NULL'}`);
        });
      }
      
      // 3. Look for unitemized contributions data for Rashida Tlaib
      const candidateId = 'H8MI13250';
      const cycle = 2024;
      
      const unitemizedQuery = `
        SELECT 
          cs.*
        FROM candidate_summary cs
        WHERE cs.cand_id = $1 
        AND cs.file_year = $2
        ORDER BY cs.file_year DESC, cs.rpt_tp
      `;
      
      const unitemizedResult = await executeQuery(fecPool, unitemizedQuery, [candidateId, cycle]);
      
      if (unitemizedResult.success && unitemizedResult.data) {
        console.log(`\n📊 Candidate Summary Data for Rashida Tlaib (${candidateId}):`);
        unitemizedResult.data.forEach((row, index) => {
          console.log(`\n   ${index + 1}. Report Type: ${row.rpt_tp || 'N/A'}`);
          console.log(`      File Year: ${row.file_year || 'N/A'}`);
          
          // Look for unitemized-related columns
          const unitemizedColumns = [
            'unitemized_individual_contributions',
            'unitemized_contributions',
            'individual_unitemized',
            'unitemized_amount',
            'unitemized_contributions_amt',
            'unitemized_individual',
            'unitemized_individual_contributions_amt'
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
                key.toLowerCase().includes('unitemized')) {
              if (row[key] !== null && row[key] !== undefined) {
                console.log(`      ${key}: ${row[key]}`);
              }
            }
          });
        });
      }
      
      // 4. Check for any unitemized data across all candidates
      const allUnitemizedQuery = `
        SELECT 
          cand_id,
          file_year,
          rpt_tp,
          COUNT(*) as record_count
        FROM candidate_summary cs
        WHERE cs.file_year = 2024
        GROUP BY cand_id, file_year, rpt_tp
        ORDER BY cand_id, file_year DESC
        LIMIT 10
      `;
      
      const allUnitemizedResult = await executeQuery(fecPool, allUnitemizedQuery);
      
      if (allUnitemizedResult.success && allUnitemizedResult.data) {
        console.log(`\n📊 Sample Candidate Summary Records (2024):`);
        allUnitemizedResult.data.forEach((row, index) => {
          console.log(`   ${index + 1}. Candidate: ${row.cand_id}, Year: ${row.file_year}, Report: ${row.rpt_tp}, Records: ${row.record_count}`);
        });
      }
      
      // 5. Check if there are any columns with unitemized data
      const unitemizedColumnsQuery = `
        SELECT column_name
        FROM information_schema.columns 
        WHERE table_name = 'candidate_summary'
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
      
    } else {
      console.log(`\n❌ Candidate Summary Table does not exist`);
      console.log(`   This could be why we're missing unitemized contributions data`);
    }
  }
  
  // 6. Check for any other summary-related tables
  const summaryTablesQuery = `
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name LIKE '%summary%'
    ORDER BY table_name
  `;
  
  const summaryTablesResult = await executeQuery(fecPool, summaryTablesQuery);
  
  if (summaryTablesResult.success && summaryTablesResult.data) {
    console.log(`\n📊 All Summary-Related Tables:`);
    summaryTablesResult.data.forEach((row, index) => {
      console.log(`   ${index + 1}. ${row.table_name}`);
    });
  }
  
  // Close database connection
  await fecPool.end();
  
  console.log(`\n✅ Candidate summary check completed!`);
}

// Run the check
checkCandidateSummary().catch(console.error); 