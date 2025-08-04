const { Pool } = require('pg');

const fecCompleteConfig = {
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

const fecPool = new Pool(fecCompleteConfig);

async function testOutsideSpendingBreakdown() {
  try {
    console.log('🔍 Testing Outside Spending Breakdown\n');
    console.log('================================================================================');

    // Test for Rashida Tlaib (H8MI13250)
    const candidateId = 'H8MI13250';
    const electionYear = 2024;

    console.log(`📊 Testing Outside Spending Breakdown for ${candidateId} (${electionYear})\n`);

    // Test independent expenditures in favor (Type 24A)
    const independentExpendituresQuery = `
      SELECT 
        COALESCE(SUM(cc.transaction_amt), 0) as total_amount,
        COUNT(*) as transaction_count,
        COUNT(DISTINCT cc.cmte_id) as unique_committees
      FROM committee_candidate_contributions cc
      WHERE cc.cand_id = $1 
      AND cc.file_year = $2
      AND cc.transaction_tp = '24A'
      AND cc.transaction_amt > 0
    `;
    
    const independentResult = await fecPool.query(independentExpendituresQuery, [candidateId, electionYear]);
    console.log('📊 Independent Expenditures in Favor (Type 24A):');
    console.log(`   Total Amount: $${independentResult.rows[0].total_amount?.toLocaleString() || 0}`);
    console.log(`   Transaction Count: ${independentResult.rows[0].transaction_count || 0}`);
    console.log(`   Unique Committees: ${independentResult.rows[0].unique_committees || 0}`);

    // Test communication costs in favor (Type 24E)
    const communicationCostsQuery = `
      SELECT 
        COALESCE(SUM(cc.transaction_amt), 0) as total_amount,
        COUNT(*) as transaction_count,
        COUNT(DISTINCT cc.cmte_id) as unique_committees
      FROM committee_candidate_contributions cc
      WHERE cc.cand_id = $1 
      AND cc.file_year = $2
      AND cc.transaction_tp = '24E'
      AND cc.transaction_amt > 0
    `;
    
    const communicationResult = await fecPool.query(communicationCostsQuery, [candidateId, electionYear]);
    console.log('\n📊 Communication Costs in Favor (Type 24E):');
    console.log(`   Total Amount: $${communicationResult.rows[0].total_amount?.toLocaleString() || 0}`);
    console.log(`   Transaction Count: ${communicationResult.rows[0].transaction_count || 0}`);
    console.log(`   Unique Committees: ${communicationResult.rows[0].unique_committees || 0}`);

    // Test soft money in favor (Type 24C)
    const softMoneyQuery = `
      SELECT 
        COALESCE(SUM(cc.transaction_amt), 0) as total_amount,
        COUNT(*) as transaction_count,
        COUNT(DISTINCT cc.cmte_id) as unique_committees
      FROM committee_candidate_contributions cc
      WHERE cc.cand_id = $1 
      AND cc.file_year = $2
      AND cc.transaction_tp = '24C'
      AND cc.transaction_amt > 0
    `;
    
    const softMoneyResult = await fecPool.query(softMoneyQuery, [candidateId, electionYear]);
    console.log('\n📊 Soft Money in Favor (Type 24C):');
    console.log(`   Total Amount: $${softMoneyResult.rows[0].total_amount?.toLocaleString() || 0}`);
    console.log(`   Transaction Count: ${softMoneyResult.rows[0].transaction_count || 0}`);
    console.log(`   Unique Committees: ${softMoneyResult.rows[0].unique_committees || 0}`);

    // Test spending against (Type 24N)
    const spendingAgainstQuery = `
      SELECT 
        COALESCE(SUM(cc.transaction_amt), 0) as total_amount,
        COUNT(*) as transaction_count,
        COUNT(DISTINCT cc.cmte_id) as unique_committees
      FROM committee_candidate_contributions cc
      WHERE cc.cand_id = $1 
      AND cc.file_year = $2
      AND cc.transaction_tp = '24N'
      AND cc.transaction_amt > 0
    `;
    
    const spendingAgainstResult = await fecPool.query(spendingAgainstQuery, [candidateId, electionYear]);
    console.log('\n📊 Spending Against (Type 24N):');
    console.log(`   Total Amount: $${spendingAgainstResult.rows[0].total_amount?.toLocaleString() || 0}`);
    console.log(`   Transaction Count: ${spendingAgainstResult.rows[0].transaction_count || 0}`);
    console.log(`   Unique Committees: ${spendingAgainstResult.rows[0].unique_committees || 0}`);

    // Calculate totals
    const independentAmount = parseFloat(independentResult.rows[0].total_amount || 0);
    const communicationAmount = parseFloat(communicationResult.rows[0].total_amount || 0);
    const softMoneyAmount = parseFloat(softMoneyResult.rows[0].total_amount || 0);
    const againstAmount = parseFloat(spendingAgainstResult.rows[0].total_amount || 0);
    
    const totalSpendingInFavor = independentAmount + communicationAmount + softMoneyAmount;
    
    console.log('\n📊 SUMMARY:');
    console.log(`   ✅ Independent Expenditures in Favor: $${independentAmount.toLocaleString()}`);
    console.log(`   ✅ Communication Costs in Favor: $${communicationAmount.toLocaleString()}`);
    console.log(`   ✅ Soft Money in Favor: $${softMoneyAmount.toLocaleString()}`);
    console.log(`   ✅ Total Spending in Favor: $${totalSpendingInFavor.toLocaleString()}`);
    console.log(`   ✅ Spending Against: $${againstAmount.toLocaleString()}`);

    // Test with the actual API function
    console.log('\n📊 Testing with API Function:');
    
    // Import the function (simplified version for testing)
    const { getCampaignFinanceTotals } = require('../src/lib/database.ts');
    
    // Get person_id for Rashida Tlaib
    const personQuery = `
      SELECT person_id 
      FROM person_candidates 
      WHERE cand_id = $1 AND election_year = $2
      LIMIT 1
    `;
    
    const personResult = await fecPool.query(personQuery, [candidateId, electionYear]);
    
    if (personResult.rows.length > 0) {
      const personId = personResult.rows[0].person_id;
      console.log(`   Person ID: ${personId}`);
      
      // Note: We can't directly call the TypeScript function from Node.js
      // This would need to be tested through the API endpoint
      console.log('   ✅ Ready to test through API endpoint');
    }

    console.log('\n✅ Outside spending breakdown test completed!');
    
  } catch (error) {
    console.error('❌ Error testing outside spending breakdown:', error);
  } finally {
    await fecPool.end();
  }
}

testOutsideSpendingBreakdown(); 