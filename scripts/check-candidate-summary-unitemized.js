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

async function checkCandidateSummaryUnitemized() {
  console.log('🔍 Checking for Unitemized Contributions in Candidate Summary Table\n');
  console.log('=' .repeat(100));
  
  // 1. Check the structure of candidate_summary table
  const structureQuery = `
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns 
    WHERE table_name = 'candidate_summary'
    ORDER BY ordinal_position
  `;
  
  const structureResult = await executeQuery(fecPool, structureQuery);
  
  if (structureResult.success && structureResult.data) {
    console.log(`📊 Candidate Summary Table Structure:`);
    structureResult.data.forEach((column, index) => {
      console.log(`   ${index + 1}. ${column.column_name} (${column.data_type}) - ${column.is_nullable === 'YES' ? 'NULLABLE' : 'NOT NULL'}`);
    });
  }
  
  // 2. Look for unitemized contributions data for Rashida Tlaib
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
  
  // 4. Calculate totals from candidate_summary
  const totalsQuery = `
    SELECT 
      SUM(CASE WHEN cs.unitemized_individual_contributions IS NOT NULL THEN cs.unitemized_individual_contributions ELSE 0 END) as total_unitemized,
      SUM(CASE WHEN cs.individual_contributions IS NOT NULL THEN cs.individual_contributions ELSE 0 END) as total_individual,
      SUM(CASE WHEN cs.total_receipts IS NOT NULL THEN cs.total_receipts ELSE 0 END) as total_receipts,
      COUNT(*) as record_count
    FROM candidate_summary cs
    WHERE cs.cand_id = $1 
    AND cs.file_year = $2
  `;
  
  const totalsResult = await executeQuery(fecPool, totalsQuery, [candidateId, cycle]);
  
  if (totalsResult.success && totalsResult.data && totalsResult.data.length > 0) {
    const data = totalsResult.data[0];
    console.log(`\n📊 Totals from Candidate Summary:`);
    console.log(`   Unitemized Individual Contributions: $${data.total_unitemized?.toLocaleString() || 0}`);
    console.log(`   Total Individual Contributions: $${data.total_individual?.toLocaleString() || 0}`);
    console.log(`   Total Receipts: $${data.total_receipts?.toLocaleString() || 0}`);
    console.log(`   Record Count: ${data.record_count?.toLocaleString() || 0}`);
  }
  
  // 5. Check for any unitemized data across all candidates
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
  
  // 6. Compare with our previous calculations
  console.log(`\n🌐 COMPARISON WITH PREVIOUS CALCULATIONS:`);
  console.log(`   Our Previous Individual Total: $5,455,958`);
  console.log(`   FEC Website Individual Total: $8,097,297.14`);
  console.log(`   Missing Amount: $2,641,339.14`);
  
  // 7. Calculate new total with candidate_summary data
  const newTotalQuery = `
    SELECT 
      SUM(CASE WHEN cs.individual_contributions IS NOT NULL THEN cs.individual_contributions ELSE 0 END) as candidate_summary_individual,
      SUM(CASE WHEN cs.unitemized_individual_contributions IS NOT NULL THEN cs.unitemized_individual_contributions ELSE 0 END) as candidate_summary_unitemized
    FROM candidate_summary cs
    WHERE cs.cand_id = $1 
    AND cs.file_year = $2
  `;
  
  const newTotalResult = await executeQuery(fecPool, newTotalQuery, [candidateId, cycle]);
  
  if (newTotalResult.success && newTotalResult.data && newTotalResult.data.length > 0) {
    const data = newTotalResult.data[0];
    const candidateSummaryIndividual = parseFloat(data.candidate_summary_individual || 0);
    const candidateSummaryUnitemized = parseFloat(data.candidate_summary_unitemized || 0);
    
    console.log(`\n📊 NEW CALCULATION WITH CANDIDATE SUMMARY:`);
    console.log(`   Candidate Summary Individual: $${candidateSummaryIndividual.toLocaleString()}`);
    console.log(`   Candidate Summary Unitemized: $${candidateSummaryUnitemized.toLocaleString()}`);
    
    // Compare with FEC website
    const fecIndividual = 8097297.14;
    const fecUnitemized = 2660970.31;
    
    const individualVariance = ((candidateSummaryIndividual - fecIndividual) / fecIndividual) * 100;
    const unitemizedVariance = ((candidateSummaryUnitemized - fecUnitemized) / fecUnitemized) * 100;
    
    console.log(`\n🔍 VARIANCE ANALYSIS:`);
    console.log(`   Individual Contributions Variance: ${individualVariance.toFixed(1)}%`);
    console.log(`   Unitemized Contributions Variance: ${unitemizedVariance.toFixed(1)}%`);
    
    if (Math.abs(individualVariance) < 10) {
      console.log(`   ✅ EXCELLENT MATCH! Individual contributions variance under 10%`);
    } else if (Math.abs(individualVariance) < 20) {
      console.log(`   ✅ GOOD MATCH! Individual contributions variance under 20%`);
    } else {
      console.log(`   ⚠️  Still significant variance in individual contributions`);
    }
  }
  
  // Close database connection
  await fecPool.end();
  
  console.log(`\n✅ Candidate summary unitemized check completed!`);
}

// Run the check
checkCandidateSummaryUnitemized().catch(console.error); 