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

async function analyzeCandidateSummaryData() {
  console.log('🔍 Analyzing Candidate Summary Data for Rashida Tlaib\n');
  console.log('=' .repeat(100));
  
  // 1. Look for Rashida Tlaib's data in candidate_summary
  const candidateId = 'H8MI13250';
  const cycle = 2024;
  
  const candidateQuery = `
    SELECT 
      cs.*
    FROM candidate_summary cs
    WHERE cs.cand_id = $1 
    AND cs.file_year = $2
  `;
  
  const candidateResult = await executeQuery(fecPool, candidateQuery, [candidateId, cycle]);
  
  if (candidateResult.success && candidateResult.data) {
    console.log(`📊 Candidate Summary Data for Rashida Tlaib (${candidateId}):`);
    candidateResult.data.forEach((row, index) => {
      console.log(`\n   ${index + 1}. Record:`);
      Object.keys(row).forEach(key => {
        if (row[key] !== null && row[key] !== undefined) {
          console.log(`      ${key}: ${row[key]}`);
        }
      });
    });
  }
  
  // 2. Calculate totals from candidate_summary
  const totalsQuery = `
    SELECT 
      SUM(CASE WHEN cs.ttl_receipts IS NOT NULL THEN cs.ttl_receipts ELSE 0 END) as total_receipts,
      SUM(CASE WHEN cs.ttl_indiv_contrib IS NOT NULL THEN cs.ttl_indiv_contrib ELSE 0 END) as total_individual_contributions,
      SUM(CASE WHEN cs.other_pol_cmte_contrib IS NOT NULL THEN cs.other_pol_cmte_contrib ELSE 0 END) as other_committee_contributions,
      SUM(CASE WHEN cs.pol_pty_contrib IS NOT NULL THEN cs.pol_pty_contrib ELSE 0 END) as party_committee_contributions,
      SUM(CASE WHEN cs.trans_from_auth IS NOT NULL THEN cs.trans_from_auth ELSE 0 END) as transfers_from_auth,
      SUM(CASE WHEN cs.ttl_disb IS NOT NULL THEN cs.ttl_disb ELSE 0 END) as total_disbursements,
      COUNT(*) as record_count
    FROM candidate_summary cs
    WHERE cs.cand_id = $1 
    AND cs.file_year = $2
  `;
  
  const totalsResult = await executeQuery(fecPool, totalsQuery, [candidateId, cycle]);
  
  if (totalsResult.success && totalsResult.data && totalsResult.data.length > 0) {
    const data = totalsResult.data[0];
    console.log(`\n📊 Totals from Candidate Summary:`);
    console.log(`   Total Receipts: $${data.total_receipts?.toLocaleString() || 0}`);
    console.log(`   Total Individual Contributions: $${data.total_individual_contributions?.toLocaleString() || 0}`);
    console.log(`   Other Committee Contributions: $${data.other_committee_contributions?.toLocaleString() || 0}`);
    console.log(`   Party Committee Contributions: $${data.party_committee_contributions?.toLocaleString() || 0}`);
    console.log(`   Transfers from Authorized Committees: $${data.transfers_from_auth?.toLocaleString() || 0}`);
    console.log(`   Total Disbursements: $${data.total_disbursements?.toLocaleString() || 0}`);
    console.log(`   Record Count: ${data.record_count?.toLocaleString() || 0}`);
  }
  
  // 3. Compare with FEC website data
  console.log(`\n🌐 COMPARISON WITH FEC WEBSITE:`);
  console.log(`   FEC Total Receipts: $8,473,097.48`);
  console.log(`   FEC Individual Contributions: $8,097,297.14`);
  console.log(`   FEC Other Committee Contributions: $93,490.18`);
  console.log(`   FEC Transfers from Other Committees: $238,780.85`);
  
  // 4. Calculate variance
  if (totalsResult.success && totalsResult.data && totalsResult.data.length > 0) {
    const data = totalsResult.data[0];
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
    
    // 5. Assessment
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
  
  // 6. Check if this solves our unitemized contributions issue
  console.log(`\n🔍 UNITEMIZED CONTRIBUTIONS ANALYSIS:`);
  console.log(`   The candidate_summary table appears to contain aggregated totals`);
  console.log(`   This should include both itemized and unitemized contributions`);
  console.log(`   If the individual contributions total is close to FEC website,`);
  console.log(`   it means we now have the unitemized contributions included!`);
  
  // Close database connection
  await fecPool.end();
  
  console.log(`\n✅ Candidate summary data analysis completed!`);
}

// Run the analysis
analyzeCandidateSummaryData().catch(console.error); 