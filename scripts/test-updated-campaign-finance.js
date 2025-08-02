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

async function testUpdatedCampaignFinance() {
  console.log('🔍 Testing Updated Campaign Finance Function\n');
  console.log('=' .repeat(100));
  
  // Test with Rashida Tlaib
  const personId = 'P259F2D0E'; // Rashida Tlaib's person_id
  const electionYear = 2024;
  
  // 1. First, get the candidate ID from the goodvote database
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
  
  // 2. Test the candidate_summary approach
  const summaryQuery = `
    SELECT 
      COALESCE(SUM(cs.ttl_receipts), 0) as total_receipts,
      COALESCE(SUM(cs.ttl_indiv_contrib), 0) as total_individual_contributions,
      COALESCE(SUM(cs.other_pol_cmte_contrib), 0) as other_committee_contributions,
      COALESCE(SUM(cs.pol_pty_contrib), 0) as party_committee_contributions,
      COALESCE(SUM(cs.trans_from_auth), 0) as transfers_from_auth,
      COALESCE(SUM(cs.ttl_disb), 0) as total_disbursements,
      COUNT(*) as record_count
    FROM candidate_summary cs
    WHERE cs.cand_id = $1 
    AND cs.file_year = $2
  `;
  
  const summaryResult = await executeQuery(fecCompletePool, summaryQuery, [candidateId, electionYear]);
  
  if (summaryResult.success && summaryResult.data && summaryResult.data.length > 0) {
    const data = summaryResult.data[0];
    console.log(`\n📊 Candidate Summary Results:`);
    console.log(`   Total Receipts: $${data.total_receipts?.toLocaleString() || 0}`);
    console.log(`   Total Individual Contributions: $${data.total_individual_contributions?.toLocaleString() || 0}`);
    console.log(`   Other Committee Contributions: $${data.other_committee_contributions?.toLocaleString() || 0}`);
    console.log(`   Party Committee Contributions: $${data.party_committee_contributions?.toLocaleString() || 0}`);
    console.log(`   Transfers from Authorized Committees: $${data.transfers_from_auth?.toLocaleString() || 0}`);
    console.log(`   Total Disbursements: $${data.total_disbursements?.toLocaleString() || 0}`);
    console.log(`   Record Count: ${data.record_count?.toLocaleString() || 0}`);
  }
  
  // 3. Test the individual contributions count query
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
  
  // 4. Compare with FEC website data
  console.log(`\n🌐 COMPARISON WITH FEC WEBSITE:`);
  console.log(`   FEC Total Receipts: $8,473,097.48`);
  console.log(`   FEC Individual Contributions: $8,097,297.14`);
  console.log(`   FEC Other Committee Contributions: $93,490.18`);
  console.log(`   FEC Transfers from Other Committees: $238,780.85`);
  
  // 5. Calculate variance
  if (summaryResult.success && summaryResult.data && summaryResult.data.length > 0) {
    const data = summaryResult.data[0];
    const candidateSummaryReceipts = parseFloat(data.total_receipts || 0);
    const candidateSummaryIndividual = parseFloat(data.total_individual_contributions || 0);
    const candidateSummaryOtherCommittee = parseFloat(data.other_committee_contributions || 0);
    const candidateSummaryTransfers = parseFloat(data.transfers_from_auth || 0);
    
    const fecReceipts = 8473097.48;
    const fecIndividual = 8097297.14;
    const fecOtherCommittee = 93490.18;
    const fecTransfers = 238780.85;
    
    const receiptsVariance = ((candidateSummaryReceipts - fecReceipts) / fecReceipts) * 100;
    const individualVariance = ((candidateSummaryIndividual - fecIndividual) / fecIndividual) * 100;
    const otherCommitteeVariance = ((candidateSummaryOtherCommittee - fecOtherCommittee) / fecOtherCommittee) * 100;
    const transfersVariance = ((candidateSummaryTransfers - fecTransfers) / fecTransfers) * 100;
    
    console.log(`\n🔍 VARIANCE ANALYSIS:`);
    console.log(`   Total Receipts Variance: ${receiptsVariance.toFixed(1)}%`);
    console.log(`   Individual Contributions Variance: ${individualVariance.toFixed(1)}%`);
    console.log(`   Other Committee Contributions Variance: ${otherCommitteeVariance.toFixed(1)}%`);
    console.log(`   Transfers Variance: ${transfersVariance.toFixed(1)}%`);
    
    // 6. Assessment
    console.log(`\n✅ ASSESSMENT:`);
    if (Math.abs(receiptsVariance) < 10) {
      console.log(`   ✅ EXCELLENT MATCH! Total receipts variance under 10%`);
    } else if (Math.abs(receiptsVariance) < 20) {
      console.log(`   ✅ GOOD MATCH! Total receipts variance under 20%`);
    } else {
      console.log(`   ⚠️  Still significant variance in total receipts`);
    }
    
    if (Math.abs(individualVariance) < 10) {
      console.log(`   ✅ EXCELLENT MATCH! Individual contributions variance under 10%`);
    } else if (Math.abs(individualVariance) < 20) {
      console.log(`   ✅ GOOD MATCH! Individual contributions variance under 20%`);
    } else {
      console.log(`   ⚠️  Still significant variance in individual contributions`);
    }
  }
  
  // Close database connections
  await goodvotePool.end();
  await fecCompletePool.end();
  
  console.log(`\n✅ Updated campaign finance test completed!`);
}

// Run the test
testUpdatedCampaignFinance().catch(console.error); 