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

async function finalComprehensiveCalculation() {
  console.log('🎯 FINAL COMPREHENSIVE CALCULATION - Rashida Tlaib 2024\n');
  console.log('=' .repeat(100));
  
  const candidateId = 'H8MI13250';
  const cycle = 2024;
  
  // 1. Individual Contributions (Regular + Earmarked)
  const individualQuery = `
    SELECT 
      SUM(CASE WHEN ic.transaction_tp = '15' THEN ic.transaction_amt ELSE 0 END) as regular_individual,
      SUM(CASE WHEN ic.transaction_tp = '15E' THEN ic.transaction_amt ELSE 0 END) as earmarked_individual,
      SUM(CASE WHEN ic.transaction_tp IN ('15', '15E') THEN ic.transaction_amt ELSE 0 END) as total_individual,
      COUNT(CASE WHEN ic.transaction_tp IN ('15', '15E') THEN 1 END) as individual_count
    FROM individual_contributions ic
    JOIN (
      SELECT DISTINCT cmte_id, cand_id, cand_election_yr 
      FROM candidate_committee_linkages 
      WHERE cand_id = $1 AND cand_election_yr = $2
    ) ccl ON ic.cmte_id = ccl.cmte_id
    WHERE ic.file_year = $2
    AND ic.transaction_amt > 0
  `;
  
  const individualResult = await executeQuery(fecPool, individualQuery, [candidateId, cycle]);
  
  // 2. Committee Candidate Contributions
  const committeeQuery = `
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
  
  const committeeResult = await executeQuery(fecPool, committeeQuery, [candidateId, cycle]);
  
  // 3. Other Receipts
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
  
  // 4. Calculate totals
  const individualData = individualResult.success && individualResult.data ? individualResult.data[0] : {};
  const committeeData = committeeResult.success && committeeResult.data ? committeeResult.data[0] : {};
  const otherData = otherResult.success && otherResult.data ? otherResult.data[0] : {};
  
  const regularIndividual = parseFloat(individualData.regular_individual || 0);
  const earmarkedIndividual = parseFloat(individualData.earmarked_individual || 0);
  const totalIndividual = parseFloat(individualData.total_individual || 0);
  const committeeAmount = parseFloat(committeeData.committee_amount || 0);
  const otherAmount = parseFloat(otherData.other_amount || 0);
  
  const totalReceipts = totalIndividual + committeeAmount + otherAmount;
  
  console.log(`📊 OUR COMPREHENSIVE CALCULATION:`);
  console.log(`   Regular Individual Contributions (15): $${regularIndividual.toLocaleString()}`);
  console.log(`   Earmarked Individual Contributions (15E): $${earmarkedIndividual.toLocaleString()}`);
  console.log(`   TOTAL INDIVIDUAL CONTRIBUTIONS: $${totalIndividual.toLocaleString()}`);
  console.log(`   Committee Candidate Contributions (24K): $${committeeAmount.toLocaleString()}`);
  console.log(`   Other Receipts (22Y): $${otherAmount.toLocaleString()}`);
  console.log(`   TOTAL RECEIPTS: $${totalReceipts.toLocaleString()}`);
  
  // 5. Compare with FEC website
  console.log(`\n🌐 FEC WEBSITE COMPARISON:`);
  console.log(`   FEC Individual Contributions: $8,097,297.14`);
  console.log(`   FEC Other Committee Contributions: $93,490.18`);
  console.log(`   FEC Transfers from Other Committees: $238,780.85`);
  console.log(`   FEC Offsets to Operating Expenditures: $23,225.50`);
  console.log(`   FEC Other Receipts: $20,303.81`);
  console.log(`   FEC TOTAL RECEIPTS: $8,473,097.48`);
  
  const fecIndividual = 8097297.14;
  const fecOtherCommittee = 93490.18;
  const fecTransfers = 238780.85;
  const fecOffsets = 23225.50;
  const fecOtherReceipts = 20303.81;
  const fecTotal = 8473097.48;
  
  const individualVariance = ((totalIndividual - fecIndividual) / fecIndividual) * 100;
  const totalVariance = ((totalReceipts - fecTotal) / fecTotal) * 100;
  
  console.log(`\n🔍 VARIANCE ANALYSIS:`);
  console.log(`   Individual Contributions: ${individualVariance.toFixed(1)}%`);
  console.log(`   Total Receipts: ${totalVariance.toFixed(1)}%`);
  
  // 6. Calculate what we're missing
  const missingIndividual = fecIndividual - totalIndividual;
  const missingTotal = fecTotal - totalReceipts;
  
  console.log(`\n📈 MISSING DATA:`);
  console.log(`   Missing Individual Contributions: $${missingIndividual.toLocaleString()}`);
  console.log(`   Missing Total Receipts: $${missingTotal.toLocaleString()}`);
  console.log(`   Missing Percentage: ${((missingTotal / fecTotal) * 100).toFixed(1)}%`);
  
  // 7. Identify specific missing categories
  console.log(`\n❓ SPECIFIC MISSING CATEGORIES:`);
  console.log(`   1. Additional Individual Contributions: $${missingIndividual.toLocaleString()}`);
  console.log(`   2. Other Committee Contributions: $${fecOtherCommittee.toLocaleString()}`);
  console.log(`   3. Transfers from Other Committees: $${fecTransfers.toLocaleString()}`);
  console.log(`   4. Offsets to Operating Expenditures: $${fecOffsets.toLocaleString()}`);
  console.log(`   5. Additional Other Receipts: $${(fecOtherReceipts - otherAmount).toLocaleString()}`);
  
  // 8. Assessment
  console.log(`\n✅ ASSESSMENT:`);
  if (Math.abs(individualVariance) < 10) {
    console.log(`   ✅ EXCELLENT: Individual contributions variance under 10%`);
  } else if (Math.abs(individualVariance) < 20) {
    console.log(`   ✅ GOOD: Individual contributions variance under 20%`);
  } else {
    console.log(`   ⚠️  NEEDS IMPROVEMENT: Individual contributions variance ${Math.abs(individualVariance).toFixed(1)}%`);
  }
  
  if (Math.abs(totalVariance) < 10) {
    console.log(`   ✅ EXCELLENT: Total receipts variance under 10%`);
  } else if (Math.abs(totalVariance) < 20) {
    console.log(`   ✅ GOOD: Total receipts variance under 20%`);
  } else {
    console.log(`   ⚠️  NEEDS IMPROVEMENT: Total receipts variance ${Math.abs(totalVariance).toFixed(1)}%`);
  }
  
  // Close database connection
  await fecPool.end();
  
  console.log(`\n✅ Final comprehensive calculation completed!`);
}

// Run the calculation
finalComprehensiveCalculation().catch(console.error); 