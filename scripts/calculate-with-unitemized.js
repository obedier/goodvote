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

async function calculateWithUnitemized() {
  console.log('🧮 Calculating Total Receipts Including Unitemized Contributions\n');
  console.log('=' .repeat(100));
  
  const candidateId = 'H8MI13250';
  const cycle = 2024;
  
  // 1. Itemized Individual Contributions (Type 15, >$200)
  const itemizedQuery = `
    SELECT 
      SUM(ic.transaction_amt) as itemized_amount,
      COUNT(*) as itemized_count
    FROM individual_contributions ic
    JOIN (
      SELECT DISTINCT cmte_id, cand_id, cand_election_yr 
      FROM candidate_committee_linkages 
      WHERE cand_id = $1 AND cand_election_yr = $2
    ) ccl ON ic.cmte_id = ccl.cmte_id
    WHERE ic.file_year = $2
    AND ic.transaction_amt > 200
    AND ic.transaction_tp = '15'
  `;
  
  const itemizedResult = await executeQuery(fecPool, itemizedQuery, [candidateId, cycle]);
  
  // 2. Unitemized Individual Contributions (Type 15, ≤$200)
  const unitemizedQuery = `
    SELECT 
      SUM(ic.transaction_amt) as unitemized_amount,
      COUNT(*) as unitemized_count
    FROM individual_contributions ic
    JOIN (
      SELECT DISTINCT cmte_id, cand_id, cand_election_yr 
      FROM candidate_committee_linkages 
      WHERE cand_id = $1 AND cand_election_yr = $2
    ) ccl ON ic.cmte_id = ccl.cmte_id
    WHERE ic.file_year = $2
    AND ic.transaction_amt <= 200
    AND ic.transaction_amt > 0
    AND ic.transaction_tp = '15'
  `;
  
  const unitemizedResult = await executeQuery(fecPool, unitemizedQuery, [candidateId, cycle]);
  
  // 3. Earmarked Contributions (Type 15E)
  const earmarkedQuery = `
    SELECT 
      SUM(ic.transaction_amt) as earmarked_amount,
      COUNT(*) as earmarked_count
    FROM individual_contributions ic
    JOIN (
      SELECT DISTINCT cmte_id, cand_id, cand_election_yr 
      FROM candidate_committee_linkages 
      WHERE cand_id = $1 AND cand_election_yr = $2
    ) ccl ON ic.cmte_id = ccl.cmte_id
    WHERE ic.file_year = $2
    AND ic.transaction_amt > 0
    AND ic.transaction_tp = '15E'
  `;
  
  const earmarkedResult = await executeQuery(fecPool, earmarkedQuery, [candidateId, cycle]);
  
  // 4. Committee Candidate Contributions (Type 24K)
  const committeeContributionsQuery = `
    SELECT 
      SUM(ccc.transaction_amt) as committee_amount,
      COUNT(*) as committee_count
    FROM committee_candidate_contributions ccc
    JOIN (
      SELECT DISTINCT cmte_id, cand_id, cand_election_yr 
      FROM candidate_committee_linkages 
      WHERE cand_id = $1 AND cand_election_yr = $2
    ) ccl ON ccc.cmte_id = ccl.cmte_id
    WHERE ccc.file_year = $2
    AND ccc.transaction_amt > 0
    AND ccc.transaction_tp = '24K'
  `;
  
  const committeeContributionsResult = await executeQuery(fecPool, committeeContributionsQuery, [candidateId, cycle]);
  
  // 5. Other Receipts (Type 22Y)
  const otherQuery = `
    SELECT 
      SUM(ic.transaction_amt) as other_amount,
      COUNT(*) as other_count
    FROM individual_contributions ic
    JOIN (
      SELECT DISTINCT cmte_id, cand_id, cand_election_yr 
      FROM candidate_committee_linkages 
      WHERE cand_id = $1 AND cand_election_yr = $2
    ) ccl ON ic.cmte_id = ccl.cmte_id
    WHERE ic.file_year = $2
    AND ic.transaction_amt > 0
    AND ic.transaction_tp = '22Y'
  `;
  
  const otherResult = await executeQuery(fecPool, otherQuery, [candidateId, cycle]);
  
  // 6. Calculate totals
  const itemizedAmount = itemizedResult.success && itemizedResult.data ? parseFloat(itemizedResult.data[0]?.itemized_amount || 0) : 0;
  const unitemizedAmount = unitemizedResult.success && unitemizedResult.data ? parseFloat(unitemizedResult.data[0]?.unitemized_amount || 0) : 0;
  const earmarkedAmount = earmarkedResult.success && earmarkedResult.data ? parseFloat(earmarkedResult.data[0]?.earmarked_amount || 0) : 0;
  const committeeAmount = committeeContributionsResult.success && committeeContributionsResult.data ? parseFloat(committeeContributionsResult.data[0]?.committee_amount || 0) : 0;
  const otherAmount = otherResult.success && otherResult.data ? parseFloat(otherResult.data[0]?.other_amount || 0) : 0;
  
  const totalIndividual = itemizedAmount + unitemizedAmount;
  const totalReceipts = totalIndividual + earmarkedAmount + committeeAmount + otherAmount;
  
  console.log(`📊 DETAILED BREAKDOWN:`);
  console.log(`   Itemized Individual Contributions (>$200): $${itemizedAmount.toLocaleString()}`);
  console.log(`   Unitemized Individual Contributions (≤$200): $${unitemizedAmount.toLocaleString()}`);
  console.log(`   Total Individual Contributions: $${totalIndividual.toLocaleString()}`);
  console.log(`   Earmarked Contributions (15E): $${earmarkedAmount.toLocaleString()}`);
  console.log(`   Committee Candidate Contributions (24K): $${committeeAmount.toLocaleString()}`);
  console.log(`   Other Receipts (22Y): $${otherAmount.toLocaleString()}`);
  console.log(`   TOTAL RECEIPTS: $${totalReceipts.toLocaleString()}`);
  
  // 7. Compare with FEC website
  console.log(`\n🌐 FEC WEBSITE COMPARISON:`);
  console.log(`   FEC Itemized: $5,436,326.83`);
  console.log(`   FEC Unitemized: $2,660,970.31`);
  console.log(`   FEC Total Individual: $8,097,297.14`);
  console.log(`   FEC Total Receipts: $8,473,097.48`);
  
  const fecItemized = 5436326.83;
  const fecUnitemized = 2660970.31;
  const fecTotalIndividual = 8097297.14;
  const fecTotal = 8473097.48;
  
  const itemizedVariance = ((itemizedAmount - fecItemized) / fecItemized) * 100;
  const unitemizedVariance = ((unitemizedAmount - fecUnitemized) / fecUnitemized) * 100;
  const individualVariance = ((totalIndividual - fecTotalIndividual) / fecTotalIndividual) * 100;
  const totalVariance = ((totalReceipts - fecTotal) / fecTotal) * 100;
  
  console.log(`\n🔍 VARIANCE ANALYSIS:`);
  console.log(`   Itemized Contributions: ${itemizedVariance.toFixed(1)}%`);
  console.log(`   Unitemized Contributions: ${unitemizedVariance.toFixed(1)}%`);
  console.log(`   Total Individual Contributions: ${individualVariance.toFixed(1)}%`);
  console.log(`   Total Receipts: ${totalVariance.toFixed(1)}%`);
  
  // 8. Check if we're closer now
  const missing = fecTotal - totalReceipts;
  console.log(`\n📈 IMPROVEMENT:`);
  console.log(`   Missing Amount: $${missing.toLocaleString()}`);
  console.log(`   Missing Percentage: ${((missing / fecTotal) * 100).toFixed(1)}%`);
  
  if (Math.abs(totalVariance) < 10) {
    console.log(`   ✅ EXCELLENT MATCH! Variance under 10%`);
  } else if (Math.abs(totalVariance) < 20) {
    console.log(`   ✅ GOOD MATCH! Variance under 20%`);
  } else {
    console.log(`   ⚠️  Still significant variance - need more data sources`);
  }
  
  // Close database connection
  await fecPool.end();
  
  console.log(`\n✅ Calculation with unitemized contributions completed!`);
}

// Run the calculation
calculateWithUnitemized().catch(console.error); 