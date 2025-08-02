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

async function testCorrectedReceipts() {
  console.log('🧮 Testing Corrected Receipt Calculations\n');
  console.log('=' .repeat(100));
  
  const candidateId = 'H8MI13250';
  const cycle = 2024;
  
  // 1. Individual Contributions (Type 15 - regular contributions)
  const individualQuery = `
    SELECT 
      SUM(ic.transaction_amt) as individual_contributions,
      COUNT(*) as individual_count
    FROM individual_contributions ic
    JOIN (
      SELECT DISTINCT cmte_id, cand_id, cand_election_yr 
      FROM candidate_committee_linkages 
      WHERE cand_id = $1 AND cand_election_yr = $2
    ) ccl ON ic.cmte_id = ccl.cmte_id
    WHERE ic.file_year = $2
    AND ic.transaction_amt > 0
    AND ic.transaction_tp = '15'
  `;
  
  const individualResult = await executeQuery(fecPool, individualQuery, [candidateId, cycle]);
  
  if (individualResult.success && individualResult.data && individualResult.data.length > 0) {
    const data = individualResult.data[0];
    console.log(`📊 Individual Contributions (Type 15):`);
    console.log(`   Amount: $${data.individual_contributions?.toLocaleString() || 0}`);
    console.log(`   Count: ${data.individual_count?.toLocaleString() || 0}`);
  }
  
  // 2. Earmarked Contributions (Type 15E)
  const earmarkedQuery = `
    SELECT 
      SUM(ic.transaction_amt) as earmarked_contributions,
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
  
  if (earmarkedResult.success && earmarkedResult.data && earmarkedResult.data.length > 0) {
    const data = earmarkedResult.data[0];
    console.log(`\n📊 Earmarked Contributions (Type 15E):`);
    console.log(`   Amount: $${data.earmarked_contributions?.toLocaleString() || 0}`);
    console.log(`   Count: ${data.earmarked_count?.toLocaleString() || 0}`);
  }
  
  // 3. Committee Contributions (from committee_transactions)
  const committeeQuery = `
    SELECT 
      SUM(ct.transaction_amt) as committee_contributions,
      COUNT(*) as committee_count
    FROM committee_transactions ct
    JOIN (
      SELECT DISTINCT cmte_id, cand_id, cand_election_yr 
      FROM candidate_committee_linkages 
      WHERE cand_id = $1 AND cand_election_yr = $2
    ) ccl ON ct.cmte_id = ccl.cmte_id
    WHERE ct.file_year = $2
    AND ct.transaction_amt > 0
    AND ct.transaction_tp IN ('15', '15E', '15F', '15G', '15H', '15I', '15J', '15K', '15L', '15M', '15N', '15O', '15P', '15Q', '15R', '15S', '15T', '15U', '15V', '15W', '15X', '15Y', '15Z')
  `;
  
  const committeeResult = await executeQuery(fecPool, committeeQuery, [candidateId, cycle]);
  
  if (committeeResult.success && committeeResult.data && committeeResult.data.length > 0) {
    const data = committeeResult.data[0];
    console.log(`\n📊 Committee Contributions:`);
    console.log(`   Amount: $${data.committee_contributions?.toLocaleString() || 0}`);
    console.log(`   Count: ${data.committee_count?.toLocaleString() || 0}`);
  }
  
  // 4. Transfers from other committees
  const transfersQuery = `
    SELECT 
      SUM(ct.transaction_amt) as transfers,
      COUNT(*) as transfer_count
    FROM committee_transactions ct
    JOIN (
      SELECT DISTINCT cmte_id, cand_id, cand_election_yr 
      FROM candidate_committee_linkages 
      WHERE cand_id = $1 AND cand_election_yr = $2
    ) ccl ON ct.cmte_id = ccl.cmte_id
    WHERE ct.file_year = $2
    AND ct.transaction_amt > 0
    AND ct.transaction_tp IN ('16', '16A', '16B', '16C', '16D', '16E', '16F', '16G', '16H', '16I', '16J', '16K', '16L', '16M', '16N', '16O', '16P', '16Q', '16R', '16S', '16T', '16U', '16V', '16W', '16X', '16Y', '16Z')
  `;
  
  const transfersResult = await executeQuery(fecPool, transfersQuery, [candidateId, cycle]);
  
  if (transfersResult.success && transfersResult.data && transfersResult.data.length > 0) {
    const data = transfersResult.data[0];
    console.log(`\n📊 Transfers from Other Committees:`);
    console.log(`   Amount: $${data.transfers?.toLocaleString() || 0}`);
    console.log(`   Count: ${data.transfer_count?.toLocaleString() || 0}`);
  }
  
  // 5. Other receipts (Type 22Y - refunds, offsets, etc.)
  const otherQuery = `
    SELECT 
      SUM(ic.transaction_amt) as other_receipts,
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
  
  if (otherResult.success && otherResult.data && otherResult.data.length > 0) {
    const data = otherResult.data[0];
    console.log(`\n📊 Other Receipts (Type 22Y):`);
    console.log(`   Amount: $${data.other_receipts?.toLocaleString() || 0}`);
    console.log(`   Count: ${data.other_count?.toLocaleString() || 0}`);
  }
  
  // 6. Calculate totals (fix the string concatenation bug)
  const individualAmount = individualResult.success && individualResult.data ? parseFloat(individualResult.data[0]?.individual_contributions || 0) : 0;
  const earmarkedAmount = earmarkedResult.success && earmarkedResult.data ? parseFloat(earmarkedResult.data[0]?.earmarked_contributions || 0) : 0;
  const committeeAmount = committeeResult.success && committeeResult.data ? parseFloat(committeeResult.data[0]?.committee_contributions || 0) : 0;
  const transfersAmount = transfersResult.success && transfersResult.data ? parseFloat(transfersResult.data[0]?.transfers || 0) : 0;
  const otherAmount = otherResult.success && otherResult.data ? parseFloat(otherResult.data[0]?.other_receipts || 0) : 0;
  
  const totalReceipts = individualAmount + earmarkedAmount + committeeAmount + transfersAmount + otherAmount;
  
  console.log(`\n📊 SUMMARY:`);
  console.log(`   Individual Contributions (15): $${individualAmount.toLocaleString()}`);
  console.log(`   Earmarked Contributions (15E): $${earmarkedAmount.toLocaleString()}`);
  console.log(`   Committee Contributions: $${committeeAmount.toLocaleString()}`);
  console.log(`   Transfers: $${transfersAmount.toLocaleString()}`);
  console.log(`   Other Receipts (22Y): $${otherAmount.toLocaleString()}`);
  console.log(`   TOTAL RECEIPTS: $${totalReceipts.toLocaleString()}`);
  
  // 7. Compare with FEC website
  console.log(`\n🌐 FEC Website Comparison:`);
  console.log(`   FEC Total Receipts: $8,473,097.48`);
  console.log(`   Our Total Receipts: $${totalReceipts.toLocaleString()}`);
  console.log(`   Variance: ${((totalReceipts - 8473097.48) / 8473097.48 * 100).toFixed(1)}%`);
  
  // 8. Check what we're missing
  const missing = 8473097.48 - totalReceipts;
  console.log(`\n🔍 Analysis:`);
  console.log(`   Missing Amount: $${missing.toLocaleString()}`);
  console.log(`   Missing Percentage: ${((missing / 8473097.48) * 100).toFixed(1)}%`);
  
  // Close database connection
  await fecPool.end();
  
  console.log(`\n✅ Corrected receipts test completed!`);
}

// Run the test
testCorrectedReceipts().catch(console.error); 