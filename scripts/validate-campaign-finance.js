const { Pool } = require('pg');

// Database configurations
const fecConfig = {
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

const fecPool = new Pool(fecConfig);
const goodvotePool = new Pool(goodvoteConfig);

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

async function validateCampaignFinance() {
  console.log('🔍 Campaign Finance Validation Test\n');

  // Test candidates
  const testCandidates = [
    { name: 'Rashida Tlaib', cand_id: 'H8MI13250', person_id: 'P259F2D0E', year: 2024 },
    { name: 'Adam Schiff', cand_id: 'H0CA27085', person_id: 'P8CC09196', year: 2024 },
  ];

  for (const candidate of testCandidates) {
    console.log(`\n📊 Testing: ${candidate.name} (${candidate.cand_id})`);
    console.log('=' .repeat(60));

    // 1. Test Total Receipts (Individual Contributions)
    console.log('\n1. Total Receipts (Individual Contributions):');
    const receiptsQuery = `
      SELECT 
        SUM(ic.transaction_amt) as total_receipts,
        COUNT(*) as contribution_count,
        COUNT(DISTINCT ic.name || ic.city || ic.state) as unique_contributors
      FROM individual_contributions ic
      JOIN candidate_committee_linkages ccl ON ic.cmte_id = ccl.cmte_id
      WHERE ccl.cand_id = $1 
        AND ccl.cand_election_yr = $2
        AND ic.transaction_amt > 0
    `;
    
    const receiptsResult = await executeQuery(fecPool, receiptsQuery, [candidate.cand_id, candidate.year]);
    if (receiptsResult.success) {
      const data = receiptsResult.data[0];
      console.log(`   Total Receipts: $${data.total_receipts?.toLocaleString() || 0}`);
      console.log(`   Contribution Count: ${data.contribution_count || 0}`);
      console.log(`   Unique Contributors: ${data.unique_contributors || 0}`);
      console.log(`   Average Contribution: $${data.total_receipts && data.contribution_count ? Math.round(data.total_receipts / data.contribution_count) : 0}`);
    } else {
      console.log(`   ❌ Error: ${receiptsResult.error}`);
    }

    // 2. Test Total Disbursements
    console.log('\n2. Total Disbursements (Operating Expenditures):');
    const disbursementsQuery = `
      SELECT 
        SUM(oe.transaction_amt) as total_disbursements,
        COUNT(*) as expenditure_count
      FROM operating_expenditures oe
      JOIN candidate_committee_linkages ccl ON oe.cmte_id = ccl.cmte_id
      WHERE ccl.cand_id = $1 
        AND oe.file_year = $2
        AND oe.transaction_amt > 0
    `;
    
    const disbursementsResult = await executeQuery(fecPool, disbursementsQuery, [candidate.cand_id, candidate.year]);
    if (disbursementsResult.success) {
      const data = disbursementsResult.data[0];
      console.log(`   Total Disbursements: $${data.total_disbursements?.toLocaleString() || 0}`);
      console.log(`   Expenditure Count: ${data.expenditure_count || 0}`);
    } else {
      console.log(`   ❌ Error: ${disbursementsResult.error}`);
    }

    // 3. Test Top Contributors
    console.log('\n3. Top Contributors:');
    const contributorsQuery = `
      SELECT 
        ic.name as contributor_name,
        ic.city as contributor_city,
        ic.state as contributor_state,
        SUM(ic.transaction_amt) as total_amount,
        COUNT(*) as contribution_count
      FROM individual_contributions ic
      JOIN candidate_committee_linkages ccl ON ic.cmte_id = ccl.cmte_id
      WHERE ccl.cand_id = $1 
        AND ccl.cand_election_yr = $2
        AND ic.transaction_amt > 0
      GROUP BY ic.name, ic.city, ic.state
      ORDER BY total_amount DESC
      LIMIT 5
    `;
    
    const contributorsResult = await executeQuery(fecPool, contributorsQuery, [candidate.cand_id, candidate.year]);
    if (contributorsResult.success) {
      contributorsResult.data.forEach((contributor, index) => {
        console.log(`   ${index + 1}. ${contributor.contributor_name} (${contributor.contributor_city}, ${contributor.contributor_state})`);
        console.log(`      Amount: $${contributor.total_amount?.toLocaleString() || 0} (${contributor.contribution_count} contributions)`);
      });
    } else {
      console.log(`   ❌ Error: ${contributorsResult.error}`);
    }

    // 4. Test Committee Information
    console.log('\n4. Committee Information:');
    const committeesQuery = `
      SELECT 
        ccl.cmte_id,
        cm.cmte_nm as committee_name,
        cm.cmte_tp as committee_type,
        cm.cmte_dsgn as committee_designation
      FROM candidate_committee_linkages ccl
      LEFT JOIN committee_master cm ON ccl.cmte_id = cm.cmte_id
      WHERE ccl.cand_id = $1 
        AND ccl.cand_election_yr = $2
      LIMIT 5
    `;
    
    const committeesResult = await executeQuery(fecPool, committeesQuery, [candidate.cand_id, candidate.year]);
    if (committeesResult.success) {
      committeesResult.data.forEach((committee, index) => {
        console.log(`   ${index + 1}. ${committee.committee_name || 'Unknown'}`);
        console.log(`      ID: ${committee.cmte_id}, Type: ${committee.committee_type}, Designation: ${committee.committee_designation}`);
      });
    } else {
      console.log(`   ❌ Error: ${committeesResult.error}`);
    }

    // 5. Calculate Cash on Hand
    console.log('\n5. Cash on Hand Calculation:');
    if (receiptsResult.success && disbursementsResult.success) {
      const receipts = receiptsResult.data[0]?.total_receipts || 0;
      const disbursements = disbursementsResult.data[0]?.total_disbursements || 0;
      const cashOnHand = receipts - disbursements;
      console.log(`   Total Receipts: $${receipts.toLocaleString()}`);
      console.log(`   Total Disbursements: $${disbursements.toLocaleString()}`);
      console.log(`   Cash on Hand: $${cashOnHand.toLocaleString()}`);
    }

    console.log('\n' + '=' .repeat(60));
  }

  // Close database connections
  await fecPool.end();
  await goodvotePool.end();
  
  console.log('\n✅ Validation test completed!');
}

// Run the validation
validateCampaignFinance().catch(console.error); 