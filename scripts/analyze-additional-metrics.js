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

async function analyzeAdditionalMetrics() {
  console.log('🔍 Analyzing Additional Campaign Finance Metrics\n');
  console.log('=' .repeat(100));
  
  const candidateId = 'H8MI13250';
  const cycle = 2024;
  
  // 1. Check candidate_summary for debt and self-financing data
  const summaryQuery = `
    SELECT 
      cs.cand_contrib as self_financing,
      cs.cand_loans as candidate_loans,
      cs.other_loans as other_loans,
      cs.cand_loan_repay as candidate_loan_repayments,
      cs.other_loan_repay as other_loan_repayments,
      cs.debts_owed_by as debts_owed_by_candidate,
      cs.ttl_receipts,
      cs.ttl_indiv_contrib,
      cs.other_pol_cmte_contrib,
      cs.pol_pty_contrib
    FROM candidate_summary cs
    WHERE cs.cand_id = $1 
    AND cs.file_year = $2
  `;
  
  const summaryResult = await executeQuery(fecPool, summaryQuery, [candidateId, cycle]);
  
  if (summaryResult.success && summaryResult.data && summaryResult.data.length > 0) {
    const data = summaryResult.data[0];
    console.log(`📊 Candidate Summary Additional Metrics:`);
    console.log(`   Self-Financing (cand_contrib): $${data.self_financing?.toLocaleString() || 0}`);
    console.log(`   Candidate Loans: $${data.candidate_loans?.toLocaleString() || 0}`);
    console.log(`   Other Loans: $${data.other_loans?.toLocaleString() || 0}`);
    console.log(`   Candidate Loan Repayments: $${data.candidate_loan_repayments?.toLocaleString() || 0}`);
    console.log(`   Other Loan Repayments: $${data.other_loan_repayments?.toLocaleString() || 0}`);
    console.log(`   Debts Owed by Candidate: $${data.debts_owed_by_candidate?.toLocaleString() || 0}`);
    console.log(`   Total Receipts: $${data.ttl_receipts?.toLocaleString() || 0}`);
    console.log(`   Individual Contributions: $${data.ttl_indiv_contrib?.toLocaleString() || 0}`);
    console.log(`   Other Committee Contributions: $${data.other_pol_cmte_contrib?.toLocaleString() || 0}`);
    console.log(`   Party Committee Contributions: $${data.pol_pty_contrib?.toLocaleString() || 0}`);
  }
  
  // 2. Check for independent expenditures (SuperPAC support)
  const independentExpendituresQuery = `
    SELECT 
      COALESCE(SUM(ie.exp_amt), 0) as total_independent_expenditures,
      COALESCE(SUM(CASE WHEN ie.exp_pty = 'FOR' THEN ie.exp_amt ELSE 0 END), 0) as independent_expenditures_for,
      COALESCE(SUM(CASE WHEN ie.exp_pty = 'AGN' THEN ie.exp_amt ELSE 0 END), 0) as independent_expenditures_against,
      COUNT(*) as independent_expenditure_count,
      COUNT(DISTINCT ie.cmte_id) as unique_committees
    FROM independent_expenditures ie
    WHERE ie.cand_id = $1 
    AND ie.file_year = $2
  `;
  
  const independentExpendituresResult = await executeQuery(fecPool, independentExpendituresQuery, [candidateId, cycle]);
  
  if (independentExpendituresResult.success && independentExpendituresResult.data && independentExpendituresResult.data.length > 0) {
    const data = independentExpendituresResult.data[0];
    console.log(`\n📊 Independent Expenditures (SuperPAC Support):`);
    console.log(`   Total Independent Expenditures: $${data.total_independent_expenditures?.toLocaleString() || 0}`);
    console.log(`   Independent Expenditures FOR: $${data.independent_expenditures_for?.toLocaleString() || 0}`);
    console.log(`   Independent Expenditures AGAINST: $${data.independent_expenditures_against?.toLocaleString() || 0}`);
    console.log(`   Independent Expenditure Count: ${data.independent_expenditure_count?.toLocaleString() || 0}`);
    console.log(`   Unique Committees: ${data.unique_committees?.toLocaleString() || 0}`);
  }
  
  // 3. Check for PAC contributions (different from SuperPAC)
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
  
  const pacContributionsResult = await executeQuery(fecPool, pacContributionsQuery, [candidateId, cycle]);
  
  if (pacContributionsResult.success && pacContributionsResult.data && pacContributionsResult.data.length > 0) {
    const data = pacContributionsResult.data[0];
    console.log(`\n📊 PAC Contributions:`);
    console.log(`   Total PAC Contributions: $${data.total_pac_contributions?.toLocaleString() || 0}`);
    console.log(`   PAC Contribution Count: ${data.pac_contribution_count?.toLocaleString() || 0}`);
    console.log(`   Unique PACs: ${data.unique_pacs?.toLocaleString() || 0}`);
  }
  
  // 4. Check for communication costs (another form of outside spending)
  const communicationCostsQuery = `
    SELECT 
      COALESCE(SUM(cc.communication_cost), 0) as total_communication_costs,
      COUNT(*) as communication_cost_count
    FROM communication_costs cc
    WHERE cc.cand_id = $1 
    AND cc.file_year = $2
  `;
  
  const communicationCostsResult = await executeQuery(fecPool, communicationCostsQuery, [candidateId, cycle]);
  
  if (communicationCostsResult.success && communicationCostsResult.data && communicationCostsResult.data.length > 0) {
    const data = communicationCostsResult.data[0];
    console.log(`\n📊 Communication Costs:`);
    console.log(`   Total Communication Costs: $${data.total_communication_costs?.toLocaleString() || 0}`);
    console.log(`   Communication Cost Count: ${data.communication_cost_count?.toLocaleString() || 0}`);
  }
  
  // 5. Calculate debt ratios and self-financing percentages
  if (summaryResult.success && summaryResult.data && summaryResult.data.length > 0) {
    const summaryData = summaryResult.data[0];
    const totalReceipts = parseFloat(summaryData.ttl_receipts || 0);
    const selfFinancing = parseFloat(summaryData.self_financing || 0);
    const debtsOwed = parseFloat(summaryData.debts_owed_by_candidate || 0);
    const candidateLoans = parseFloat(summaryData.candidate_loans || 0);
    const otherLoans = parseFloat(summaryData.other_loans || 0);
    
    const selfFinancingPercentage = totalReceipts > 0 ? (selfFinancing / totalReceipts) * 100 : 0;
    const totalDebt = debtsOwed + candidateLoans + otherLoans;
    const debtToReceiptsRatio = totalReceipts > 0 ? (totalDebt / totalReceipts) * 100 : 0;
    
    console.log(`\n📊 Financial Ratios:`);
    console.log(`   Self-Financing Percentage: ${selfFinancingPercentage.toFixed(1)}%`);
    console.log(`   Total Debt: $${totalDebt.toLocaleString()}`);
    console.log(`   Debt-to-Receipts Ratio: ${debtToReceiptsRatio.toFixed(1)}%`);
  }
  
  // 6. Check what tables exist for additional data
  const additionalTablesQuery = `
    SELECT table_name
    FROM information_schema.tables 
    WHERE table_schema = 'public'
    AND (table_name LIKE '%independent%' 
         OR table_name LIKE '%communication%'
         OR table_name LIKE '%pac%'
         OR table_name LIKE '%debt%'
         OR table_name LIKE '%loan%')
    ORDER BY table_name
  `;
  
  const additionalTablesResult = await executeQuery(fecPool, additionalTablesQuery);
  
  if (additionalTablesResult.success && additionalTablesResult.data) {
    console.log(`\n📊 Additional Tables Available:`);
    additionalTablesResult.data.forEach((table, index) => {
      console.log(`   ${index + 1}. ${table.table_name}`);
    });
  }
  
  // Close database connection
  await fecPool.end();
  
  console.log(`\n✅ Additional metrics analysis completed!`);
}

// Run the analysis
analyzeAdditionalMetrics().catch(console.error); 