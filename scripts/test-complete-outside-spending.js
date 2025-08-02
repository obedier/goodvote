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

async function testCompleteOutsideSpending() {
  try {
    console.log('🔍 Testing Complete Outside Spending Breakdown\n');
    console.log('================================================================================');

    // Test for Rashida Tlaib (H8MI13250)
    const candidateId = 'H8MI13250';
    const electionYear = 2024;

    console.log(`📊 Testing Complete Outside Spending for ${candidateId} (${electionYear})\n`);

    // Test all transaction types
    const transactionTypes = [
      { type: '24A', name: 'Independent Expenditures in Favor', description: 'Independent expenditures supporting the candidate' },
      { type: '24E', name: 'Communication Costs in Favor', description: 'Communication costs supporting the candidate' },
      { type: '24C', name: 'Soft Money in Favor', description: 'Coordinated expenditures supporting the candidate' },
      { type: '24N', name: 'Spending Against', description: 'Independent expenditures opposing the candidate' },
      { type: '24K', name: 'PAC Contributions', description: 'Direct PAC contributions to candidate' }
    ];

    for (const transactionType of transactionTypes) {
      const query = `
        SELECT 
          COALESCE(SUM(cc.transaction_amt), 0) as total_amount,
          COUNT(*) as transaction_count,
          COUNT(DISTINCT cc.cmte_id) as unique_committees
        FROM committee_candidate_contributions cc
        WHERE cc.cand_id = $1 
        AND cc.file_year = $2
        AND cc.transaction_tp = $3
        AND cc.transaction_amt > 0
      `;
      
      const result = await fecPool.query(query, [candidateId, electionYear, transactionType.type]);
      
      console.log(`📊 ${transactionType.name} (Type ${transactionType.type}):`);
      console.log(`   Description: ${transactionType.description}`);
      console.log(`   Total Amount: $${result.rows[0].total_amount?.toLocaleString() || 0}`);
      console.log(`   Transaction Count: ${result.rows[0].transaction_count || 0}`);
      console.log(`   Unique Committees: ${result.rows[0].unique_committees || 0}`);
      console.log('');
    }

    // Test API response
    console.log('📊 Testing API Response:');
    
    const response = await fetch('http://localhost:3000/api/politicians/P259F2D0E');
    const data = await response.json();
    
    if (data.success && data.data.campaign_finance) {
      const finance = data.data.campaign_finance;
      
      console.log('   ✅ API Response Fields:');
      console.log(`      Independent Expenditures in Favor: $${finance.independent_expenditures_in_favor?.toLocaleString() || 0}`);
      console.log(`      Communication Costs in Favor: $${finance.communication_costs_in_favor?.toLocaleString() || 0}`);
      console.log(`      Soft Money in Favor: $${finance.soft_money_in_favor?.toLocaleString() || 0}`);
      console.log(`      Spending Against: $${finance.spending_against?.toLocaleString() || 0}`);
      console.log(`      Total Outside Spending: $${finance.total_outside_spending?.toLocaleString() || 0}`);
      console.log(`      Outside Spending Percentage: ${finance.outside_spending_percentage?.toFixed(2) || 0}%`);
      
      console.log('\n   ✅ Confidence Levels:');
      if (finance.outside_spending_confidence) {
        console.log(`      Bundled Contributions: ${finance.outside_spending_confidence.bundled_contributions}`);
        console.log(`      Independent Expenditures: ${finance.outside_spending_confidence.independent_expenditures_in_favor}`);
        console.log(`      Communication Costs: ${finance.outside_spending_confidence.communication_costs_in_favor}`);
        console.log(`      Soft Money: ${finance.outside_spending_confidence.soft_money_in_favor}`);
        console.log(`      Spending Against: ${finance.outside_spending_confidence.spending_against}`);
      }
    } else {
      console.log('   ❌ API response not successful');
    }

    // Calculate totals and verify
    console.log('\n📊 SUMMARY VERIFICATION:');
    
    const totalsQuery = `
      SELECT 
        SUM(CASE WHEN transaction_tp = '24A' THEN transaction_amt ELSE 0 END) as independent_expenditures,
        SUM(CASE WHEN transaction_tp = '24E' THEN transaction_amt ELSE 0 END) as communication_costs,
        SUM(CASE WHEN transaction_tp = '24C' THEN transaction_amt ELSE 0 END) as soft_money,
        SUM(CASE WHEN transaction_tp = '24N' THEN transaction_amt ELSE 0 END) as spending_against,
        SUM(CASE WHEN transaction_tp IN ('24A', '24E', '24C') THEN transaction_amt ELSE 0 END) as total_spending_in_favor
      FROM committee_candidate_contributions
      WHERE cand_id = $1 AND file_year = $2 AND transaction_amt > 0
    `;
    
    const totalsResult = await fecPool.query(totalsQuery, [candidateId, electionYear]);
    const totals = totalsResult.rows[0];
    
    console.log(`   ✅ Independent Expenditures: $${totals.independent_expenditures?.toLocaleString() || 0}`);
    console.log(`   ✅ Communication Costs: $${totals.communication_costs?.toLocaleString() || 0}`);
    console.log(`   ✅ Soft Money: $${totals.soft_money?.toLocaleString() || 0}`);
    console.log(`   ✅ Spending Against: $${totals.spending_against?.toLocaleString() || 0}`);
    console.log(`   ✅ Total Spending in Favor: $${totals.total_spending_in_favor?.toLocaleString() || 0}`);

    console.log('\n✅ Complete outside spending test completed!');
    
  } catch (error) {
    console.error('❌ Error testing complete outside spending:', error);
  } finally {
    await fecPool.end();
  }
}

testCompleteOutsideSpending(); 