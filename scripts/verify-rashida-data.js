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
  database: process.env.FEC_DB_NAME || 'fec_gold',
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

async function verifyRashidaData() {
  console.log('🔍 Verifying Rashida Tlaib Data\n');
  console.log('=' .repeat(100));
  
  const personId = 'P259F2D0E';
  const candId = 'H8MI13250';
  
  // 1. Check person_candidates table
  const personCandidatesQuery = `
    SELECT 
      pc.person_id,
      pc.cand_id,
      pc.election_year,
      p.display_name,
      p.current_office,
      p.current_party
    FROM person_candidates pc
    JOIN persons p ON pc.person_id = p.person_id
    WHERE pc.person_id = $1
    ORDER BY pc.election_year DESC
  `;
  
  const personCandidatesResult = await executeQuery(goodvotePool, personCandidatesQuery, [personId]);
  
  if (personCandidatesResult.success && personCandidatesResult.data) {
    console.log(`📊 Person Candidates for Rashida Tlaib:`);
    personCandidatesResult.data.forEach((candidate, index) => {
      console.log(`   ${index + 1}. Election Year: ${candidate.election_year}, Candidate ID: ${candidate.cand_id}`);
      console.log(`      Display Name: ${candidate.display_name}`);
      console.log(`      Office: ${candidate.current_office}, Party: ${candidate.current_party}`);
    });
  }
  
  // 2. Check candidate_summary for different years
  const candidateSummaryQuery = `
    SELECT 
      cs.cand_id,
      cs.file_year,
      cs.ttl_receipts,
      cs.ttl_indiv_contrib,
      cs.other_pol_cmte_contrib,
      cs.pol_pty_contrib,
      cs.trans_from_auth,
      cs.ttl_disb
    FROM candidate_summary cs
    WHERE cs.cand_id = $1
    ORDER BY cs.file_year DESC
  `;
  
  const candidateSummaryResult = await executeQuery(fecCompletePool, candidateSummaryQuery, [candId]);
  
  if (candidateSummaryResult.success && candidateSummaryResult.data) {
    console.log(`\n📊 Candidate Summary for Rashida Tlaib:`);
    candidateSummaryResult.data.forEach((summary, index) => {
      console.log(`   ${index + 1}. File Year: ${summary.file_year}`);
      console.log(`      Total Receipts: $${summary.ttl_receipts?.toLocaleString() || 0}`);
      console.log(`      Individual Contributions: $${summary.ttl_indiv_contrib?.toLocaleString() || 0}`);
      console.log(`      Other Committee Contributions: $${summary.other_pol_cmte_contrib?.toLocaleString() || 0}`);
      console.log(`      Party Committee Contributions: $${summary.pol_pty_contrib?.toLocaleString() || 0}`);
      console.log(`      Transfers from Auth: $${summary.trans_from_auth?.toLocaleString() || 0}`);
      console.log(`      Total Disbursements: $${summary.ttl_disb?.toLocaleString() || 0}`);
    });
  }
  
  // 3. Check committee_candidate_contributions for different years
  const committeeContributionsQuery = `
    SELECT 
      cc.file_year,
      COUNT(*) as contribution_count,
      SUM(cc.transaction_amt) as total_amount,
      COUNT(DISTINCT cc.cmte_id) as unique_committees
    FROM committee_candidate_contributions cc
    WHERE cc.cand_id = $1
    AND cc.transaction_amt > 0
    GROUP BY cc.file_year
    ORDER BY cc.file_year DESC
  `;
  
  const committeeContributionsResult = await executeQuery(fecCompletePool, committeeContributionsQuery, [candId]);
  
  if (committeeContributionsResult.success && committeeContributionsResult.data) {
    console.log(`\n📊 Committee Contributions by Year:`);
    committeeContributionsResult.data.forEach((year, index) => {
      console.log(`   ${index + 1}. File Year: ${year.file_year}`);
      console.log(`      Total Amount: $${year.total_amount?.toLocaleString() || 0}`);
      console.log(`      Contribution Count: ${year.contribution_count?.toLocaleString() || 0}`);
      console.log(`      Unique Committees: ${year.unique_committees?.toLocaleString() || 0}`);
    });
  }
  
  // 4. Test the API endpoint directly
  console.log(`\n📊 Testing API Endpoint:`);
  const apiUrl = `http://localhost:3000/api/politicians/${personId}`;
  
  try {
    const response = await fetch(apiUrl);
    
    if (response.ok) {
      const apiData = await response.json();
      
      if (apiData.success && apiData.data) {
        const data = apiData.data;
        console.log(`   ✅ API Response Success`);
        console.log(`   📊 API Data:`);
        console.log(`      Display Name: ${data.display_name}`);
        console.log(`      Last Election Year: ${data.last_election_year}`);
        console.log(`      Total Receipts: $${data.campaign_finance?.total_receipts?.toLocaleString() || 0}`);
        console.log(`      Individual Contributions: $${data.campaign_finance?.total_individual_contributions?.toLocaleString() || 0}`);
        console.log(`      PAC Contributions: $${data.campaign_finance?.total_pac_contributions?.toLocaleString() || 0}`);
        console.log(`      Outside Spending: $${data.campaign_finance?.total_outside_spending?.toLocaleString() || 0}`);
      } else {
        console.log(`   ❌ API Response Failed:`, apiData.error || 'Unknown error');
      }
    } else {
      console.log(`   ❌ API Request Failed: ${response.status} ${response.statusText}`);
    }
    
  } catch (error) {
    console.log(`   ❌ API Request Error:`, error.message);
  }
  
  // 5. Expected vs Actual comparison
  console.log(`\n🔍 Expected vs Actual Comparison:`);
  console.log(`   Expected (2024):`);
  console.log(`      Total Receipts: $8,473,097.48`);
  console.log(`      Individual Contributions: $8,097,297.14`);
  console.log(`      PAC Contributions: $121,899`);
  console.log(`      Outside Spending: $108,037`);
  
  // Close database connections
  await goodvotePool.end();
  await fecCompletePool.end();
  
  console.log(`\n✅ Rashida Tlaib data verification completed!`);
}

// Run the verification
verifyRashidaData().catch(console.error); 