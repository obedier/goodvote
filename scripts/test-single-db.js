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

async function testSingleDB() {
  console.log('🔍 Testing Single Database Approach\n');
  console.log('================================================================================');

  const fecCompletePool = new Pool(fecCompleteConfig);

  try {
    const personId = 'P259F2D0E';
    const electionYear = 2024;

    // Test 1: Get candidate ID from person_candidates
    console.log('📊 Test 1: Getting candidate ID from person_candidates...');
    const candidateQuery = `
      SELECT cand_id 
      FROM person_candidates 
      WHERE person_id = $1 AND election_year = $2
    `;
    
    const candidateResult = await fecCompletePool.query(candidateQuery, [personId, electionYear]);
    if (candidateResult.rows.length === 0) {
      console.log('   ❌ No candidate found');
      return;
    }
    
    const candId = candidateResult.rows[0].cand_id;
    console.log(`   ✅ Found candidate ID: ${candId}`);

    // Test 2: Get operating expenditures
    console.log('\n📊 Test 2: Getting operating expenditures...');
    const outsideSpendingQuery = `
      SELECT 
        COALESCE(SUM(oe.transaction_amt), 0) as total_operating_expenditures,
        COUNT(oe.transaction_amt) as operating_expenditure_count,
        COUNT(DISTINCT oe.cmte_id) as unique_committees,
        COALESCE(SUM(CASE WHEN LOWER(oe.purpose) LIKE '%tv%' OR LOWER(oe.purpose) LIKE '%radio%' OR LOWER(oe.purpose) LIKE '%advertising%' THEN oe.transaction_amt ELSE 0 END), 0) as media_advertising,
        COALESCE(SUM(CASE WHEN LOWER(oe.purpose) LIKE '%digital%' OR LOWER(oe.purpose) LIKE '%online%' THEN oe.transaction_amt ELSE 0 END), 0) as digital_advertising,
        COALESCE(SUM(CASE WHEN LOWER(oe.purpose) LIKE '%polling%' OR LOWER(oe.purpose) LIKE '%survey%' THEN oe.transaction_amt ELSE 0 END), 0) as polling_research,
        COALESCE(SUM(CASE WHEN LOWER(oe.purpose) LIKE '%printing%' OR LOWER(oe.purpose) LIKE '%production%' THEN oe.transaction_amt ELSE 0 END), 0) as printing_production,
        COALESCE(SUM(CASE WHEN LOWER(oe.purpose) LIKE '%consulting%' OR LOWER(oe.purpose) LIKE '%fundraising%' THEN oe.transaction_amt ELSE 0 END), 0) as consulting_services,
        COALESCE(SUM(CASE WHEN LOWER(oe.purpose) LIKE '%payroll%' OR LOWER(oe.purpose) LIKE '%salary%' THEN oe.transaction_amt ELSE 0 END), 0) as staff_payroll
      FROM candidate_committee_linkages ccl
      LEFT JOIN operating_expenditures oe ON ccl.cmte_id = oe.cmte_id AND oe.file_year = $2
      WHERE ccl.cand_id = $1 AND ccl.cand_election_yr = $2
    `;
    
    const outsideResult = await fecCompletePool.query(outsideSpendingQuery, [candId, electionYear]);
    const outsideData = outsideResult.rows[0];
    
    console.log(`   ✅ Total Operating Expenditures: $${parseFloat(outsideData.total_operating_expenditures).toLocaleString()}`);
    console.log(`   ✅ Media Advertising: $${parseFloat(outsideData.media_advertising).toLocaleString()}`);
    console.log(`   ✅ Digital Advertising: $${parseFloat(outsideData.digital_advertising).toLocaleString()}`);
    console.log(`   ✅ Polling Research: $${parseFloat(outsideData.polling_research).toLocaleString()}`);
    console.log(`   ✅ Printing Production: $${parseFloat(outsideData.printing_production).toLocaleString()}`);
    console.log(`   ✅ Consulting Services: $${parseFloat(outsideData.consulting_services).toLocaleString()}`);
    console.log(`   ✅ Staff Payroll: $${parseFloat(outsideData.staff_payroll).toLocaleString()}`);

    // Test 3: Get campaign finance summary
    console.log('\n📊 Test 3: Getting campaign finance summary...');
    const financeQuery = `
      SELECT 
        cs.ttl_receipts,
        cs.ttl_indiv_contrib,
        cs.other_pol_cmte_contrib,
        cs.pol_pty_contrib,
        cs.trans_from_auth,
        cs.ttl_disb,
        cs.cand_contrib,
        cs.cand_loans,
        cs.other_loans,
        cs.debts_owed_by,
        cs.cand_loan_repay,
        cs.other_loan_repay,
        cs.ttl_receipts - cs.ttl_disb as cash_on_hand
      FROM candidate_summary cs
      WHERE cs.cand_id = $1 AND cs.file_year = $2
    `;
    
    const financeResult = await fecCompletePool.query(financeQuery, [candId, electionYear]);
    if (financeResult.rows.length > 0) {
      const financeData = financeResult.rows[0];
      console.log(`   ✅ Total Receipts: $${parseFloat(financeData.ttl_receipts).toLocaleString()}`);
      console.log(`   ✅ Total Disbursements: $${parseFloat(financeData.ttl_disb).toLocaleString()}`);
      console.log(`   ✅ Cash on Hand: $${parseFloat(financeData.cash_on_hand).toLocaleString()}`);
    } else {
      console.log('   ❌ No campaign finance data found');
    }

    console.log('\n✅ Single database test completed successfully!');
    
  } catch (error) {
    console.error('❌ Error in single database test:', error);
  } finally {
    await fecCompletePool.end();
  }
}

testSingleDB(); 