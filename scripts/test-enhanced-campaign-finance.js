const { Pool } = require('pg');

// Database configurations
const goodvoteConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'goodvote',
  user: process.env.DB_USER || 'osamabedier',
  password: process.env.DB_PASSWORD || '',
  max: 3,
  min: 0,
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 3000,
  acquireTimeoutMillis: 3000,
};

const fecCompleteConfig = {
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

const goodvotePool = new Pool(goodvoteConfig);
const fecCompletePool = new Pool(fecCompleteConfig);

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

async function testEnhancedCampaignFinance() {
  console.log('🔍 Testing Enhanced Campaign Finance Function\n');
  console.log('=' .repeat(100));
  
  // Test with Rashida Tlaib
  const personId = 'P259F2D0E';
  const electionYear = 2024;
  
  // 1. Get candidate ID
  const candidateQuery = `
    SELECT cand_id 
    FROM person_candidates 
    WHERE person_id = $1 AND election_year = $2
    LIMIT 1
  `;
  
  const candidateResult = await executeQuery(goodvotePool, candidateQuery, [personId, electionYear]);
  
  if (!candidateResult.success || !candidateResult.data || candidateResult.data.length === 0) {
    console.log(`❌ No candidate found for person_id: ${personId}, election_year: ${electionYear}`);
    return;
  }
  
  const candidateId = candidateResult.data[0].cand_id;
  console.log(`✅ Found candidate: ${candidateId}`);
  
  // 2. Test the enhanced candidate_summary approach
  const summaryQuery = `
    SELECT 
      COALESCE(SUM(cs.ttl_receipts), 0) as total_receipts,
      COALESCE(SUM(cs.ttl_indiv_contrib), 0) as total_individual_contributions,
      COALESCE(SUM(cs.other_pol_cmte_contrib), 0) as other_committee_contributions,
      COALESCE(SUM(cs.pol_pty_contrib), 0) as party_committee_contributions,
      COALESCE(SUM(cs.trans_from_auth), 0) as transfers_from_auth,
      COALESCE(SUM(cs.ttl_disb), 0) as total_disbursements,
      COALESCE(SUM(cs.cand_contrib), 0) as self_financing,
      COALESCE(SUM(cs.cand_loans), 0) as candidate_loans,
      COALESCE(SUM(cs.other_loans), 0) as other_loans,
      COALESCE(SUM(cs.debts_owed_by), 0) as debts_owed_by_candidate,
      COALESCE(SUM(cs.cand_loan_repay), 0) as candidate_loan_repayments,
      COALESCE(SUM(cs.other_loan_repay), 0) as other_loan_repayments,
      COUNT(*) as record_count
    FROM candidate_summary cs
    WHERE cs.cand_id = $1 
    AND cs.file_year = $2
  `;
  
  const summaryResult = await executeQuery(fecCompletePool, summaryQuery, [candidateId, electionYear]);
  
  if (summaryResult.success && summaryResult.data && summaryResult.data.length > 0) {
    const data = summaryResult.data[0];
    console.log(`\n📊 Enhanced Candidate Summary Results:`);
    console.log(`   Total Receipts: $${data.total_receipts?.toLocaleString() || 0}`);
    console.log(`   Total Individual Contributions: $${data.total_individual_contributions?.toLocaleString() || 0}`);
    console.log(`   Other Committee Contributions: $${data.other_committee_contributions?.toLocaleString() || 0}`);
    console.log(`   Party Committee Contributions: $${data.party_committee_contributions?.toLocaleString() || 0}`);
    console.log(`   Transfers from Authorized Committees: $${data.transfers_from_auth?.toLocaleString() || 0}`);
    console.log(`   Total Disbursements: $${data.total_disbursements?.toLocaleString() || 0}`);
    console.log(`   Self-Financing: $${data.self_financing?.toLocaleString() || 0}`);
    console.log(`   Candidate Loans: $${data.candidate_loans?.toLocaleString() || 0}`);
    console.log(`   Other Loans: $${data.other_loans?.toLocaleString() || 0}`);
    console.log(`   Debts Owed by Candidate: $${data.debts_owed_by_candidate?.toLocaleString() || 0}`);
    console.log(`   Candidate Loan Repayments: $${data.candidate_loan_repayments?.toLocaleString() || 0}`);
    console.log(`   Other Loan Repayments: $${data.other_loan_repayments?.toLocaleString() || 0}`);
    console.log(`   Record Count: ${data.record_count?.toLocaleString() || 0}`);
  }
  
  // 3. Test PAC contributions
  const pacContributionsQuery = `
    SELECT 
      COALESCE(SUM(cc.transaction_amt), 0) as total_pac_contributions,
      COUNT(*) as pac_contribution_count,
      COUNT(DISTINCT cc.cmte_id) as unique_pacs
    FROM committee_candidate_contributions cc
    WHERE cc.cand_id = $1 
    AND cc.file_year = $2
    AND cc.transaction_amt > 0
  `;
  
  const pacContributionsResult = await executeQuery(fecCompletePool, pacContributionsQuery, [candidateId, electionYear]);
  
  if (pacContributionsResult.success && pacContributionsResult.data && pacContributionsResult.data.length > 0) {
    const data = pacContributionsResult.data[0];
    console.log(`\n📊 PAC Contributions:`);
    console.log(`   Total PAC Contributions: $${data.total_pac_contributions?.toLocaleString() || 0}`);
    console.log(`   PAC Contribution Count: ${data.pac_contribution_count?.toLocaleString() || 0}`);
    console.log(`   Unique PACs: ${data.unique_pacs?.toLocaleString() || 0}`);
  }
  
  // 4. Calculate financial ratios
  if (summaryResult.success && summaryResult.data && summaryResult.data.length > 0) {
    const data = summaryResult.data[0];
    const totalReceipts = parseFloat(data.total_receipts || 0);
    const selfFinancing = parseFloat(data.self_financing || 0);
    const debtsOwed = parseFloat(data.debts_owed_by_candidate || 0);
    const candidateLoans = parseFloat(data.candidate_loans || 0);
    const otherLoans = parseFloat(data.other_loans || 0);
    
    const selfFinancingPercentage = totalReceipts > 0 ? (selfFinancing / totalReceipts) * 100 : 0;
    const totalDebt = debtsOwed + candidateLoans + otherLoans;
    const debtToReceiptsRatio = totalReceipts > 0 ? (totalDebt / totalReceipts) * 100 : 0;
    
    console.log(`\n📊 Financial Ratios:`);
    console.log(`   Self-Financing Percentage: ${selfFinancingPercentage.toFixed(1)}%`);
    console.log(`   Total Debt: $${totalDebt.toLocaleString()}`);
    console.log(`   Debt-to-Receipts Ratio: ${debtToReceiptsRatio.toFixed(1)}%`);
  }
  
  // 5. Test individual contributions count
  const countQuery = `
    SELECT 
      COALESCE(COUNT(*), 0) as contribution_count,
      COALESCE(COUNT(DISTINCT ic.name || ic.city || ic.state), 0) as unique_contributors
    FROM individual_contributions ic
    JOIN (
      SELECT DISTINCT cmte_id, cand_id, cand_election_yr 
      FROM candidate_committee_linkages 
      WHERE cand_id = $1 AND cand_election_yr = $2
    ) ccl ON ic.cmte_id = ccl.cmte_id
    WHERE ic.file_year = $2
    AND ic.transaction_amt > 0
    AND ic.transaction_tp IN ('15', '15E', '22Y')
  `;
  
  const countResult = await executeQuery(fecCompletePool, countQuery, [candidateId, electionYear]);
  
  if (countResult.success && countResult.data && countResult.data.length > 0) {
    const data = countResult.data[0];
    console.log(`\n📊 Individual Contributions Count:`);
    console.log(`   Contribution Count: ${data.contribution_count?.toLocaleString() || 0}`);
    console.log(`   Unique Contributors: ${data.unique_contributors?.toLocaleString() || 0}`);
  }
  
  // 6. Summary of all metrics
  console.log(`\n🎯 SUMMARY OF ENHANCED METRICS:`);
  console.log(`   ✅ Total Receipts (including unitemized)`);
  console.log(`   ✅ Individual Contributions (including unitemized)`);
  console.log(`   ✅ Committee Contributions`);
  console.log(`   ✅ Party Committee Contributions`);
  console.log(`   ✅ Transfers from Authorized Committees`);
  console.log(`   ✅ Total Disbursements`);
  console.log(`   ✅ Self-Financing (candidate contributions)`);
  console.log(`   ✅ Candidate Loans`);
  console.log(`   ✅ Other Loans`);
  console.log(`   ✅ Debts Owed by Candidate`);
  console.log(`   ✅ Loan Repayments`);
  console.log(`   ✅ PAC Contributions`);
  console.log(`   ✅ Financial Ratios (self-financing %, debt ratio)`);
  console.log(`   ✅ Contribution Counts and Unique Contributors`);
  
  // Close database connections
  await goodvotePool.end();
  await fecCompletePool.end();
  
  console.log(`\n✅ Enhanced campaign finance test completed!`);
}

// Run the test
testEnhancedCampaignFinance().catch(console.error); 