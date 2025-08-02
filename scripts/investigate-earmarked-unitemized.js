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

async function investigateEarmarkedUnitemized() {
  console.log('🔍 Investigating Earmarked Unitemized Contributions\n');
  console.log('=' .repeat(100));
  
  const candidateId = 'H8MI13250';
  const cycle = 2024;
  
  // 1. Check earmarked contributions by amount range
  const earmarkedQuery = `
    SELECT 
      CASE 
        WHEN ic.transaction_amt <= 200 THEN 'Unitemized (≤$200)'
        WHEN ic.transaction_amt <= 1000 THEN 'Small ($201-$1000)'
        WHEN ic.transaction_amt <= 5000 THEN 'Medium ($1001-$5000)'
        ELSE 'Large (>$5000)'
      END as amount_range,
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
    AND ic.transaction_tp = '15E'
    GROUP BY 
      CASE 
        WHEN ic.transaction_amt <= 200 THEN 'Unitemized (≤$200)'
        WHEN ic.transaction_amt <= 1000 THEN 'Small ($201-$1000)'
        WHEN ic.transaction_amt <= 5000 THEN 'Medium ($1001-$5000)'
        ELSE 'Large (>$5000)'
      END
    ORDER BY 
      CASE 
        WHEN ic.transaction_amt <= 200 THEN 1
        WHEN ic.transaction_amt <= 1000 THEN 2
        WHEN ic.transaction_amt <= 5000 THEN 3
        ELSE 4
      END
  `;
  
  const earmarkedResult = await executeQuery(fecPool, earmarkedQuery, [candidateId, cycle]);
  
  if (earmarkedResult.success && earmarkedResult.data) {
    console.log(`📊 Earmarked Contributions (Type 15E) by Amount Range:`);
    earmarkedResult.data.forEach((row, index) => {
      console.log(`   ${index + 1}. ${row.amount_range}: $${row.total_amount?.toLocaleString() || 0} (${row.count} transactions, $${row.min_amount}-$${row.max_amount})`);
    });
  }
  
  // 2. Check if earmarked contributions should be included in individual contributions
  // According to FEC, earmarked contributions ARE individual contributions
  const totalIndividualQuery = `
    SELECT 
      SUM(CASE WHEN ic.transaction_tp = '15' THEN ic.transaction_amt ELSE 0 END) as regular_individual,
      SUM(CASE WHEN ic.transaction_tp = '15E' THEN ic.transaction_amt ELSE 0 END) as earmarked_individual,
      SUM(CASE WHEN ic.transaction_tp IN ('15', '15E') THEN ic.transaction_amt ELSE 0 END) as total_individual
    FROM individual_contributions ic
    JOIN (
      SELECT DISTINCT cmte_id, cand_id, cand_election_yr 
      FROM candidate_committee_linkages 
      WHERE cand_id = $1 AND cand_election_yr = $2
    ) ccl ON ic.cmte_id = ccl.cmte_id
    WHERE ic.file_year = $2
    AND ic.transaction_amt > 0
  `;
  
  const totalIndividualResult = await executeQuery(fecPool, totalIndividualQuery, [candidateId, cycle]);
  
  if (totalIndividualResult.success && totalIndividualResult.data && totalIndividualResult.data.length > 0) {
    const data = totalIndividualResult.data[0];
    const regularIndividual = parseFloat(data.regular_individual || 0);
    const earmarkedIndividual = parseFloat(data.earmarked_individual || 0);
    const totalIndividual = parseFloat(data.total_individual || 0);
    
    console.log(`\n📊 Individual Contributions Breakdown:`);
    console.log(`   Regular Individual (Type 15): $${regularIndividual.toLocaleString()}`);
    console.log(`   Earmarked Individual (Type 15E): $${earmarkedIndividual.toLocaleString()}`);
    console.log(`   TOTAL INDIVIDUAL CONTRIBUTIONS: $${totalIndividual.toLocaleString()}`);
    
    // Compare with FEC website
    const fecIndividual = 8097297.14;
    const variance = ((totalIndividual - fecIndividual) / fecIndividual) * 100;
    
    console.log(`\n🌐 COMPARISON WITH FEC:`);
    console.log(`   FEC Individual Contributions: $${fecIndividual.toLocaleString()}`);
    console.log(`   Our Total Individual: $${totalIndividual.toLocaleString()}`);
    console.log(`   Variance: ${variance.toFixed(1)}%`);
    
    if (Math.abs(variance) < 10) {
      console.log(`   ✅ EXCELLENT MATCH! Individual contributions variance under 10%`);
    } else if (Math.abs(variance) < 20) {
      console.log(`   ✅ GOOD MATCH! Individual contributions variance under 20%`);
    } else {
      console.log(`   ⚠️  Still significant variance in individual contributions`);
    }
  }
  
  // 3. Check if we need to include earmarked unitemized in our calculations
  const unitemizedEarmarkedQuery = `
    SELECT 
      SUM(ic.transaction_amt) as unitemized_earmarked,
      COUNT(*) as count
    FROM individual_contributions ic
    JOIN (
      SELECT DISTINCT cmte_id, cand_id, cand_election_yr 
      FROM candidate_committee_linkages 
      WHERE cand_id = $1 AND cand_election_yr = $2
    ) ccl ON ic.cmte_id = ccl.cmte_id
    WHERE ic.file_year = $2
    AND ic.transaction_amt <= 200
    AND ic.transaction_amt > 0
    AND ic.transaction_tp = '15E'
  `;
  
  const unitemizedEarmarkedResult = await executeQuery(fecPool, unitemizedEarmarkedQuery, [candidateId, cycle]);
  
  if (unitemizedEarmarkedResult.success && unitemizedEarmarkedResult.data && unitemizedEarmarkedResult.data.length > 0) {
    const data = unitemizedEarmarkedResult.data[0];
    const unitemizedEarmarked = parseFloat(data.unitemized_earmarked || 0);
    
    console.log(`\n📊 Unitemized Earmarked Contributions:`);
    console.log(`   Amount: $${unitemizedEarmarked.toLocaleString()}`);
    console.log(`   Count: ${data.count?.toLocaleString() || 0}`);
    console.log(`   Note: These should be included in individual contributions total`);
  }
  
  // Close database connection
  await fecPool.end();
  
  console.log(`\n✅ Earmarked unitemized investigation completed!`);
}

// Run the investigation
investigateEarmarkedUnitemized().catch(console.error); 