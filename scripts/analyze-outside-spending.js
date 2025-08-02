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

async function analyzeOutsideSpending() {
  console.log('🔍 Analyzing Outside Spending Categories\n');
  console.log('=' .repeat(100));
  
  const candidateId = 'H8MI13250';
  const cycle = 2024;
  
  // 1. Check if independent_expenditures table exists
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
    console.log(`📊 Independent Expenditures (SuperPAC Support):`);
    console.log(`   Total Independent Expenditures: $${data.total_independent_expenditures?.toLocaleString() || 0}`);
    console.log(`   Independent Expenditures FOR: $${data.independent_expenditures_for?.toLocaleString() || 0}`);
    console.log(`   Independent Expenditures AGAINST: $${data.independent_expenditures_against?.toLocaleString() || 0}`);
    console.log(`   Independent Expenditure Count: ${data.independent_expenditure_count?.toLocaleString() || 0}`);
    console.log(`   Unique Committees: ${data.unique_committees?.toLocaleString() || 0}`);
  } else {
    console.log(`📊 Independent Expenditures: Table not available in current database`);
  }
  
  // 2. Check for communication_costs table (issue ads)
  const communicationCostsQuery = `
    SELECT 
      COALESCE(SUM(cc.communication_cost), 0) as total_communication_costs,
      COUNT(*) as communication_cost_count,
      COUNT(DISTINCT cc.cmte_id) as unique_committees
    FROM communication_costs cc
    WHERE cc.cand_id = $1 
    AND cc.file_year = $2
  `;
  
  const communicationCostsResult = await executeQuery(fecPool, communicationCostsQuery, [candidateId, cycle]);
  
  if (communicationCostsResult.success && communicationCostsResult.data && communicationCostsResult.data.length > 0) {
    const data = communicationCostsResult.data[0];
    console.log(`\n📊 Communication Costs (Issue Ads):`);
    console.log(`   Total Communication Costs: $${data.total_communication_costs?.toLocaleString() || 0}`);
    console.log(`   Communication Cost Count: ${data.communication_cost_count?.toLocaleString() || 0}`);
    console.log(`   Unique Committees: ${data.unique_committees?.toLocaleString() || 0}`);
  } else {
    console.log(`\n📊 Communication Costs: Table not available in current database`);
  }
  
  // 3. Check for bundled contributions in committee_candidate_contributions
  const bundledContributionsQuery = `
    SELECT 
      COALESCE(SUM(cc.transaction_amt), 0) as total_bundled_contributions,
      COUNT(*) as bundled_contribution_count,
      COUNT(DISTINCT cc.cmte_id) as unique_bundlers,
      COUNT(DISTINCT cc.name) as unique_bundled_contributors
    FROM committee_candidate_contributions cc
    WHERE cc.cand_id = $1 
    AND cc.file_year = $2
    AND cc.transaction_amt > 0
    AND cc.transaction_tp IN ('24K', '24A') -- Committee-to-candidate contributions
  `;
  
  const bundledContributionsResult = await executeQuery(fecPool, bundledContributionsQuery, [candidateId, cycle]);
  
  if (bundledContributionsResult.success && bundledContributionsResult.data && bundledContributionsResult.data.length > 0) {
    const data = bundledContributionsResult.data[0];
    console.log(`\n📊 Potential Bundled Contributions:`);
    console.log(`   Total Committee Contributions: $${data.total_bundled_contributions?.toLocaleString() || 0}`);
    console.log(`   Committee Contribution Count: ${data.bundled_contribution_count?.toLocaleString() || 0}`);
    console.log(`   Unique Committees: ${data.unique_bundlers?.toLocaleString() || 0}`);
    console.log(`   Unique Contributors: ${data.unique_bundled_contributors?.toLocaleString() || 0}`);
  }
  
  // 4. Check for soft money indicators in committee_master
  const softMoneyQuery = `
    SELECT 
      cm.cmte_id,
      cm.cmte_nm,
      cm.cmte_tp,
      cm.cmte_dsgn,
      COUNT(cc.transaction_amt) as contribution_count,
      COALESCE(SUM(cc.transaction_amt), 0) as total_contributions
    FROM committee_candidate_contributions cc
    JOIN committee_master cm ON cc.cmte_id = cm.cmte_id
    WHERE cc.cand_id = $1 
    AND cc.file_year = $2
    AND cc.transaction_amt > 0
    AND (cm.cmte_tp = 'Q' OR cm.cmte_tp = 'N' OR cm.cmte_tp = 'O') -- SuperPAC, 501(c), Other
    GROUP BY cm.cmte_id, cm.cmte_nm, cm.cmte_tp, cm.cmte_dsgn
    ORDER BY total_contributions DESC
    LIMIT 10
  `;
  
  const softMoneyResult = await executeQuery(fecPool, softMoneyQuery, [candidateId, cycle]);
  
  if (softMoneyResult.success && softMoneyResult.data) {
    console.log(`\n📊 Potential Soft Money / Outside Spending:`);
    softMoneyResult.data.forEach((committee, index) => {
      console.log(`\n   ${index + 1}. Committee: ${committee.cmte_nm} (${committee.cmte_id})`);
      console.log(`      Type: ${committee.cmte_tp} (${committee.cmte_dsgn})`);
      console.log(`      Total Contributions: $${committee.total_contributions?.toLocaleString() || 0}`);
      console.log(`      Contribution Count: ${committee.contribution_count?.toLocaleString() || 0}`);
    });
  }
  
  // 5. Calculate estimated outside spending with confidence levels
  console.log(`\n🎯 ESTIMATED OUTSIDE SPENDING ANALYSIS:`);
  
  // Get candidate summary for comparison
  const candidateSummaryQuery = `
    SELECT 
      COALESCE(SUM(cs.ttl_receipts), 0) as total_receipts,
      COALESCE(SUM(cs.ttl_indiv_contrib), 0) as total_individual_contributions
    FROM candidate_summary cs
    WHERE cs.cand_id = $1 
    AND cs.file_year = $2
  `;
  
  const candidateSummaryResult = await executeQuery(fecPool, candidateSummaryQuery, [candidateId, cycle]);
  
  if (candidateSummaryResult.success && candidateSummaryResult.data && candidateSummaryResult.data.length > 0) {
    const summaryData = candidateSummaryResult.data[0];
    const totalReceipts = parseFloat(summaryData.total_receipts || 0);
    const totalIndividualContributions = parseFloat(summaryData.total_individual_contributions || 0);
    
    // Estimate outside spending based on available data
    const independentExpenditures = independentExpendituresResult.success && independentExpendituresResult.data && independentExpendituresResult.data.length > 0 
      ? parseFloat(independentExpendituresResult.data[0].total_independent_expenditures || 0) 
      : 0;
    
    const communicationCosts = communicationCostsResult.success && communicationCostsResult.data && communicationCostsResult.data.length > 0 
      ? parseFloat(communicationCostsResult.data[0].total_communication_costs || 0) 
      : 0;
    
    const bundledContributions = bundledContributionsResult.success && bundledContributionsResult.data && bundledContributionsResult.data.length > 0 
      ? parseFloat(bundledContributionsResult.data[0].total_bundled_contributions || 0) 
      : 0;
    
    // Estimate soft money (if we had the data)
    const estimatedSoftMoney = 0; // Would need additional data sources
    
    const totalOutsideSpending = independentExpenditures + communicationCosts + bundledContributions + estimatedSoftMoney;
    const outsideSpendingPercentage = totalReceipts > 0 ? (totalOutsideSpending / totalReceipts) * 100 : 0;
    
    console.log(`\n📊 Outside Spending Estimates:`);
    console.log(`   Total Candidate Receipts: $${totalReceipts.toLocaleString()}`);
    console.log(`   Independent Expenditures: $${independentExpenditures.toLocaleString()} (Confidence: ${independentExpenditures > 0 ? 'HIGH' : 'LOW - Data not available'})`);
    console.log(`   Communication Costs: $${communicationCosts.toLocaleString()} (Confidence: ${communicationCosts > 0 ? 'HIGH' : 'LOW - Data not available'})`);
    console.log(`   Bundled Contributions: $${bundledContributions.toLocaleString()} (Confidence: MEDIUM - Estimated from committee contributions)`);
    console.log(`   Estimated Soft Money: $${estimatedSoftMoney.toLocaleString()} (Confidence: LOW - Data not available)`);
    console.log(`   Total Estimated Outside Spending: $${totalOutsideSpending.toLocaleString()}`);
    console.log(`   Outside Spending as % of Receipts: ${outsideSpendingPercentage.toFixed(1)}%`);
  }
  
  // 6. Recommendations for data sources
  console.log(`\n🔍 RECOMMENDATIONS FOR COMPLETE OUTSIDE SPENDING DATA:`);
  console.log(`   1. Add independent_expenditures table from FEC bulk data`);
  console.log(`   2. Add communication_costs table for issue ads`);
  console.log(`   3. Add lobbyist bundling data (separate FEC file)`);
  console.log(`   4. Add 501(c)(4) organization spending data`);
  console.log(`   5. Add state-level PAC spending data`);
  console.log(`   6. Consider OpenSecrets API for additional outside spending data`);
  
  // Close database connection
  await fecPool.end();
  
  console.log(`\n✅ Outside spending analysis completed!`);
}

// Run the analysis
analyzeOutsideSpending().catch(console.error); 