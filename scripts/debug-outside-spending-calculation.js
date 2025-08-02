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

async function debugOutsideSpendingCalculation() {
  console.log('🔍 Debugging Outside Spending Calculation\n');
  console.log('=' .repeat(100));
  
  // Test with a few candidates to see the issue
  const testCandidates = [
    { personId: 'P259F2D0E', name: 'Rashida Tlaib', candId: 'H8MI13250' },
    { personId: 'P00489C05', name: 'John James', candId: 'H8MI06001' },
    { personId: 'P004C3DF9', name: 'Sanford Bishop', candId: 'H2GA02031' }
  ];
  
  for (const candidate of testCandidates) {
    console.log(`\n📊 Debugging ${candidate.name} (${candidate.candId}):`);
    
    // 1. Check committee_candidate_contributions data
    const committeeContributionsQuery = `
      SELECT 
        cc.cmte_id,
        cc.transaction_amt,
        cc.transaction_tp,
        cc.transaction_dt,
        cm.cmte_nm,
        cm.cmte_tp
      FROM committee_candidate_contributions cc
      LEFT JOIN committee_master cm ON cc.cmte_id = cm.cmte_id
      WHERE cc.cand_id = $1 
      AND cc.file_year = 2024
      AND cc.transaction_amt > 0
      ORDER BY cc.transaction_amt DESC
      LIMIT 10
    `;
    
    const committeeContributionsResult = await executeQuery(fecPool, committeeContributionsQuery, [candidate.candId]);
    
    if (committeeContributionsResult.success && committeeContributionsResult.data) {
      console.log(`   📊 Committee Contributions (${committeeContributionsResult.data.length} records):`);
      committeeContributionsResult.data.forEach((contribution, index) => {
        console.log(`      ${index + 1}. ${contribution.cmte_nm || 'Unknown'} (${contribution.cmte_id})`);
        console.log(`         Amount: $${contribution.transaction_amt?.toLocaleString() || 0}`);
        console.log(`         Type: ${contribution.transaction_tp || 'Unknown'}`);
        console.log(`         Committee Type: ${contribution.cmte_tp || 'Unknown'}`);
      });
    }
    
    // 2. Check the specific query that's causing issues
    const outsideSpendingQuery = `
      SELECT 
        COALESCE(SUM(cc.transaction_amt), 0) as bundled_contributions,
        COUNT(DISTINCT cc.cmte_id) as unique_bundlers,
        COUNT(*) as bundled_contribution_count
      FROM committee_candidate_contributions cc
      WHERE cc.cand_id = $1 
      AND cc.file_year = 2024
      AND cc.transaction_amt > 0
      AND cc.transaction_tp IN ('24K', '24A')
    `;
    
    const outsideSpendingResult = await executeQuery(fecPool, outsideSpendingQuery, [candidate.candId]);
    
    if (outsideSpendingResult.success && outsideSpendingResult.data && outsideSpendingResult.data.length > 0) {
      const data = outsideSpendingResult.data[0];
      console.log(`   📊 Outside Spending Query Results:`);
      console.log(`      Bundled Contributions: $${data.bundled_contributions?.toLocaleString() || 0}`);
      console.log(`      Unique Bundlers: ${data.unique_bundlers?.toLocaleString() || 0}`);
      console.log(`      Bundled Contribution Count: ${data.bundled_contribution_count?.toLocaleString() || 0}`);
      
      // Check if the amount is being multiplied incorrectly
      const rawAmount = data.bundled_contributions;
      console.log(`      Raw Amount: ${rawAmount}`);
      console.log(`      Amount Type: ${typeof rawAmount}`);
      
      if (rawAmount > 1000000) {
        console.log(`      ⚠️  WARNING: Amount seems too high, possible calculation error`);
      }
    }
    
    // 3. Check all transaction types for this candidate
    const transactionTypesQuery = `
      SELECT 
        cc.transaction_tp,
        COUNT(*) as count,
        SUM(cc.transaction_amt) as total_amount
      FROM committee_candidate_contributions cc
      WHERE cc.cand_id = $1 
      AND cc.file_year = 2024
      AND cc.transaction_amt > 0
      GROUP BY cc.transaction_tp
      ORDER BY total_amount DESC
    `;
    
    const transactionTypesResult = await executeQuery(fecPool, transactionTypesQuery, [candidate.candId]);
    
    if (transactionTypesResult.success && transactionTypesResult.data) {
      console.log(`   📊 Transaction Types:`);
      transactionTypesResult.data.forEach((type, index) => {
        console.log(`      ${index + 1}. Type ${type.transaction_tp}: ${type.count} transactions, $${type.total_amount?.toLocaleString() || 0}`);
      });
    }
  }
  
  // Close database connection
  await fecPool.end();
  
  console.log(`\n✅ Outside spending calculation debug completed!`);
}

// Run the debug
debugOutsideSpendingCalculation().catch(console.error); 