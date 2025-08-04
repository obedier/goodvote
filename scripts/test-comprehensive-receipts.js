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

async function testComprehensiveReceipts() {
  console.log('🧮 Testing Comprehensive Receipt Calculations\n');
  console.log('=' .repeat(100));
  
  const candidateId = 'H8MI13250';
  const cycle = 2024;
  
  // 1. Individual Contributions (what we currently have)
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
  `;
  
  const individualResult = await executeQuery(fecPool, individualQuery, [candidateId, cycle]);
  
  if (individualResult.success && individualResult.data && individualResult.data.length > 0) {
    const data = individualResult.data[0];
    console.log(`📊 Individual Contributions:`);
    console.log(`   Amount: $${data.individual_contributions?.toLocaleString() || 0}`);
    console.log(`   Count: ${data.individual_count?.toLocaleString() || 0}`);
  }
  
  // 2. Committee-to-Committee Transactions (other committee contributions)
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
  
  // 3. Transfers from other authorized committees
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
  
  // 4. Operating Expenditures (for offsets)
  const expendituresQuery = `
    SELECT 
      SUM(oe.transaction_amt) as total_expenditures,
      COUNT(*) as expenditure_count
    FROM operating_expenditures oe
    JOIN (
      SELECT DISTINCT cmte_id, cand_id, cand_election_yr 
      FROM candidate_committee_linkages 
      WHERE cand_id = $1 AND cand_election_yr = $2
    ) ccl ON oe.cmte_id = ccl.cmte_id
    WHERE oe.file_year = $2
    AND oe.transaction_amt > 0
  `;
  
  const expendituresResult = await executeQuery(fecPool, expendituresQuery, [candidateId, cycle]);
  
  if (expendituresResult.success && expendituresResult.data && expendituresResult.data.length > 0) {
    const data = expendituresResult.data[0];
    console.log(`\n📊 Operating Expenditures:`);
    console.log(`   Amount: $${data.total_expenditures?.toLocaleString() || 0}`);
    console.log(`   Count: ${data.expenditure_count?.toLocaleString() || 0}`);
  }
  
  // 5. Other receipts (miscellaneous)
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
    AND ic.transaction_tp NOT IN ('11', '11Y', '12', '12Y', '13', '13Y', '14', '14Y', '15', '15Y', '16', '16Y', '17', '17Y', '18', '18Y', '19', '19Y', '20', '20Y', '21', '21Y', '22', '22Y', '23', '23Y', '24', '24Y', '25', '25Y', '26', '26Y', '27', '27Y', '28', '28Y', '29', '29Y', '30', '30Y', '31', '31Y', '32', '32Y', '33', '33Y', '34', '34Y', '35', '35Y', '36', '36Y', '37', '37Y', '38', '38Y', '39', '39Y', '40', '40Y', '41', '41Y', '42', '42Y', '43', '43Y', '44', '44Y', '45', '45Y', '46', '46Y', '47', '47Y', '48', '48Y', '49', '49Y', '50', '50Y', '51', '51Y', '52', '52Y', '53', '53Y', '54', '54Y', '55', '55Y', '56', '56Y', '57', '57Y', '58', '58Y', '59', '59Y', '60', '60Y', '61', '61Y', '62', '62Y', '63', '63Y', '64', '64Y', '65', '65Y', '66', '66Y', '67', '67Y', '68', '68Y', '69', '69Y', '70', '70Y', '71', '71Y', '72', '72Y', '73', '73Y', '74', '74Y', '75', '75Y', '76', '76Y', '77', '77Y', '78', '78Y', '79', '79Y', '80', '80Y', '81', '81Y', '82', '82Y', '83', '83Y', '84', '84Y', '85', '85Y', '86', '86Y', '87', '87Y', '88', '88Y', '89', '89Y', '90', '90Y', '91', '91Y', '92', '92Y', '93', '93Y', '94', '94Y', '95', '95Y', '96', '96Y', '97', '97Y', '98', '98Y', '99', '99Y')
  `;
  
  const otherResult = await executeQuery(fecPool, otherQuery, [candidateId, cycle]);
  
  if (otherResult.success && otherResult.data && otherResult.data.length > 0) {
    const data = otherResult.data[0];
    console.log(`\n📊 Other Receipts:`);
    console.log(`   Amount: $${data.other_receipts?.toLocaleString() || 0}`);
    console.log(`   Count: ${data.other_count?.toLocaleString() || 0}`);
  }
  
  // 6. Calculate totals
  const individualAmount = individualResult.success && individualResult.data ? (individualResult.data[0]?.individual_contributions || 0) : 0;
  const committeeAmount = committeeResult.success && committeeResult.data ? (committeeResult.data[0]?.committee_contributions || 0) : 0;
  const transfersAmount = transfersResult.success && transfersResult.data ? (transfersResult.data[0]?.transfers || 0) : 0;
  const otherAmount = otherResult.success && otherResult.data ? (otherResult.data[0]?.other_receipts || 0) : 0;
  
  const totalReceipts = individualAmount + committeeAmount + transfersAmount + otherAmount;
  
  console.log(`\n📊 SUMMARY:`);
  console.log(`   Individual Contributions: $${individualAmount.toLocaleString()}`);
  console.log(`   Committee Contributions: $${committeeAmount.toLocaleString()}`);
  console.log(`   Transfers: $${transfersAmount.toLocaleString()}`);
  console.log(`   Other Receipts: $${otherAmount.toLocaleString()}`);
  console.log(`   TOTAL RECEIPTS: $${totalReceipts.toLocaleString()}`);
  
  // 7. Compare with FEC website
  console.log(`\n🌐 FEC Website Comparison:`);
  console.log(`   FEC Total Receipts: $8,473,097.48`);
  console.log(`   Our Total Receipts: $${totalReceipts.toLocaleString()}`);
  console.log(`   Variance: ${((totalReceipts - 8473097.48) / 8473097.48 * 100).toFixed(1)}%`);
  
  // Close database connection
  await fecPool.end();
  
  console.log(`\n✅ Comprehensive receipts test completed!`);
}

// Run the test
testComprehensiveReceipts().catch(console.error); 