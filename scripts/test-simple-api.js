const { Pool } = require('pg');

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
  database: process.env.FEC_DB_NAME || 'fec_gold',
  user: process.env.FEC_DB_USER || process.env.DB_USER || 'osamabedier',
  password: process.env.FEC_DB_PASSWORD || process.env.DB_PASSWORD || '',
  max: 3,
  min: 0,
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 3000,
  acquireTimeoutMillis: 3000,
};

async function testSimpleAPI() {
  console.log('🔍 Testing Simple API Logic\n');
  console.log('================================================================================');

  const personId = 'P259F2D0E';
  const electionYear = 2024;

  // Step 1: Get candidate ID from goodvote
  console.log('📊 Step 1: Getting candidate ID from goodvote database...');
  const goodvotePool = new Pool(goodvoteConfig);
  const candidateQuery = `
    SELECT cand_id 
    FROM person_candidates 
    WHERE person_id = $1 AND election_year = $2
  `;
  
  const candidateResult = await goodvotePool.query(candidateQuery, [personId, electionYear]);
  if (candidateResult.rows.length === 0) {
    console.log('   ❌ No candidate found');
    return;
  }
  
  const candId = candidateResult.rows[0].cand_id;
  console.log(`   ✅ Found candidate ID: ${candId}`);
  await goodvotePool.end();

  // Step 2: Get operating expenditures from fec_gold
  console.log('\n📊 Step 2: Getting operating expenditures from fec_gold database...');
  const fecCompletePool = new Pool(fecCompleteConfig);
  const outsideSpendingQuery = `
    SELECT 
      -- Total operating expenditures (this is the main outside spending)
      COALESCE(SUM(oe.transaction_amt), 0) as total_operating_expenditures,
      COUNT(oe.transaction_amt) as operating_expenditure_count,
      COUNT(DISTINCT oe.cmte_id) as unique_committees,
      
      -- Categorize by purpose for breakdown
      COALESCE(SUM(CASE WHEN LOWER(oe.purpose) LIKE '%tv%' OR LOWER(oe.purpose) LIKE '%radio%' OR LOWER(oe.purpose) LIKE '%advertising%' THEN oe.transaction_amt ELSE 0 END), 0) as media_advertising,
      COALESCE(SUM(CASE WHEN LOWER(oe.purpose) LIKE '%digital%' OR LOWER(oe.purpose) LIKE '%online%' THEN oe.transaction_amt ELSE 0 END), 0) as digital_advertising,
      COALESCE(SUM(CASE WHEN LOWER(oe.purpose) LIKE '%polling%' OR LOWER(oe.purpose) LIKE '%survey%' THEN oe.transaction_amt ELSE 0 END), 0) as polling_research,
      COALESCE(SUM(CASE WHEN LOWER(oe.purpose) LIKE '%printing%' OR LOWER(oe.purpose) LIKE '%production%' THEN oe.transaction_amt ELSE 0 END), 0) as printing_production,
      COALESCE(SUM(CASE WHEN LOWER(oe.purpose) LIKE '%consulting%' OR LOWER(oe.purpose) LIKE '%fundraising%' THEN oe.transaction_amt ELSE 0 END), 0) as consulting_services,
      COALESCE(SUM(CASE WHEN LOWER(oe.purpose) LIKE '%payroll%' OR LOWER(oe.purpose) LIKE '%salary%' THEN oe.transaction_amt ELSE 0 END), 0) as staff_payroll,
      
      -- Also get committee_candidate_contributions for comparison
      COALESCE(SUM(ccc.transaction_amt), 0) as committee_contributions,
      COUNT(ccc.transaction_amt) as committee_contribution_count
    FROM candidate_committee_linkages ccl
    LEFT JOIN operating_expenditures oe ON ccl.cmte_id = oe.cmte_id AND oe.file_year = $2
    LEFT JOIN committee_candidate_contributions ccc ON ccl.cmte_id = ccc.cmte_id AND ccc.file_year = $2 AND ccc.cand_id = $1
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
  console.log(`   ✅ Committee Contributions: $${parseFloat(outsideData.committee_contributions).toLocaleString()}`);
  
  await fecCompletePool.end();

  console.log('\n✅ Simple API test completed!');
}

testSimpleAPI().catch(console.error); 