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

async function investigateCommitteeSummary() {
  console.log('🔍 Investigating Committee Summary Table for Unitemized Contributions\n');
  console.log('=' .repeat(100));
  
  const candidateId = 'H8MI13250';
  const cycle = 2024;
  
  // 1. Check if committee_summary table exists
  const summaryExistsQuery = `
    SELECT 
      COUNT(*) as table_exists
    FROM information_schema.tables 
    WHERE table_name = 'committee_summary'
  `;
  
  const summaryExistsResult = await executeQuery(fecPool, summaryExistsQuery);
  
  if (summaryExistsResult.success && summaryExistsResult.data && summaryExistsResult.data.length > 0) {
    const exists = summaryExistsResult.data[0].table_exists > 0;
    console.log(`📊 Committee Summary Table: ${exists ? 'EXISTS' : 'DOES NOT EXIST'}`);
    
    if (exists) {
      // 2. Check committee summary data for this candidate
      const summaryQuery = `
        SELECT 
          cs.*,
          cm.cmte_nm as committee_name
        FROM committee_summary cs
        JOIN (
          SELECT DISTINCT cmte_id, cand_id, cand_election_yr 
          FROM candidate_committee_linkages 
          WHERE cand_id = $1 AND cand_election_yr = $2
        ) ccl ON cs.cmte_id = ccl.cmte_id
        LEFT JOIN committee_master cm ON cs.cmte_id = cm.cmte_id
        WHERE cs.file_year = $2
        ORDER BY cm.cmte_nm
      `;
      
      const summaryResult = await executeQuery(fecPool, summaryQuery, [candidateId, cycle]);
      
      if (summaryResult.success && summaryResult.data) {
        console.log(`\n📊 Committee Summary Data:`);
        summaryResult.data.forEach((row, index) => {
          console.log(`\n   ${index + 1}. Committee: ${row.committee_name || 'Unknown'} (${row.cmte_id})`);
          console.log(`      File Year: ${row.file_year}`);
          console.log(`      Individual Contributions: $${row.individual_contributions?.toLocaleString() || 0}`);
          console.log(`      Itemized Individual Contributions: $${row.itemized_individual_contributions?.toLocaleString() || 0}`);
          console.log(`      Unitemized Individual Contributions: $${row.unitemized_individual_contributions?.toLocaleString() || 0}`);
          console.log(`      Other Committee Contributions: $${row.other_committee_contributions?.toLocaleString() || 0}`);
          console.log(`      Political Party Committee Contributions: $${row.political_party_committee_contributions?.toLocaleString() || 0}`);
          console.log(`      Total Contributions: $${row.total_contributions?.toLocaleString() || 0}`);
          console.log(`      Transfers from Other Committees: $${row.transfers_from_other_committees?.toLocaleString() || 0}`);
          console.log(`      Total Receipts: $${row.total_receipts?.toLocaleString() || 0}`);
        });
        
        // 3. Calculate totals from committee summary
        const totalQuery = `
          SELECT 
            SUM(cs.individual_contributions) as total_individual,
            SUM(cs.itemized_individual_contributions) as total_itemized,
            SUM(cs.unitemized_individual_contributions) as total_unitemized,
            SUM(cs.other_committee_contributions) as total_other_committee,
            SUM(cs.political_party_committee_contributions) as total_party_committee,
            SUM(cs.total_contributions) as total_contributions,
            SUM(cs.transfers_from_other_committees) as total_transfers,
            SUM(cs.total_receipts) as total_receipts
          FROM committee_summary cs
          JOIN (
            SELECT DISTINCT cmte_id, cand_id, cand_election_yr 
            FROM candidate_committee_linkages 
            WHERE cand_id = $1 AND cand_election_yr = $2
          ) ccl ON cs.cmte_id = ccl.cmte_id
          WHERE cs.file_year = $2
        `;
        
        const totalResult = await executeQuery(fecPool, totalQuery, [candidateId, cycle]);
        
        if (totalResult.success && totalResult.data && totalResult.data.length > 0) {
          const data = totalResult.data[0];
          console.log(`\n📊 COMMITTEE SUMMARY TOTALS:`);
          console.log(`   Individual Contributions: $${data.total_individual?.toLocaleString() || 0}`);
          console.log(`   Itemized Individual Contributions: $${data.total_itemized?.toLocaleString() || 0}`);
          console.log(`   Unitemized Individual Contributions: $${data.total_unitemized?.toLocaleString() || 0}`);
          console.log(`   Other Committee Contributions: $${data.total_other_committee?.toLocaleString() || 0}`);
          console.log(`   Political Party Committee Contributions: $${data.total_party_committee?.toLocaleString() || 0}`);
          console.log(`   Total Contributions: $${data.total_contributions?.toLocaleString() || 0}`);
          console.log(`   Transfers from Other Committees: $${data.total_transfers?.toLocaleString() || 0}`);
          console.log(`   TOTAL RECEIPTS: $${data.total_receipts?.toLocaleString() || 0}`);
          
          // 4. Compare with FEC website
          console.log(`\n🌐 COMPARISON WITH FEC WEBSITE:`);
          console.log(`   FEC Individual Contributions: $8,097,297.14`);
          console.log(`   FEC Itemized: $5,436,326.83`);
          console.log(`   FEC Unitemized: $2,660,970.31`);
          console.log(`   FEC Total Receipts: $8,473,097.48`);
          
          const ourIndividual = parseFloat(data.total_individual || 0);
          const ourUnitemized = parseFloat(data.total_unitemized || 0);
          const ourTotal = parseFloat(data.total_receipts || 0);
          
          console.log(`\n📊 OUR COMMITTEE SUMMARY:`);
          console.log(`   Individual Contributions: $${ourIndividual.toLocaleString()}`);
          console.log(`   Unitemized: $${ourUnitemized.toLocaleString()}`);
          console.log(`   Total Receipts: $${ourTotal.toLocaleString()}`);
          
          // 5. Calculate variance
          const fecIndividual = 8097297.14;
          const fecUnitemized = 2660970.31;
          const fecTotal = 8473097.48;
          
          const individualVariance = ((ourIndividual - fecIndividual) / fecIndividual) * 100;
          const unitemizedVariance = ((ourUnitemized - fecUnitemized) / fecUnitemized) * 100;
          const totalVariance = ((ourTotal - fecTotal) / fecTotal) * 100;
          
          console.log(`\n🔍 VARIANCE ANALYSIS:`);
          console.log(`   Individual Contributions: ${individualVariance.toFixed(1)}%`);
          console.log(`   Unitemized Contributions: ${unitemizedVariance.toFixed(1)}%`);
          console.log(`   Total Receipts: ${totalVariance.toFixed(1)}%`);
        }
      }
    }
  }
  
  // 6. Check what tables we have that might contain summary data
  const tablesQuery = `
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND (table_name LIKE '%summary%' 
         OR table_name LIKE '%committee%' 
         OR table_name LIKE '%report%')
    ORDER BY table_name
  `;
  
  const tablesResult = await executeQuery(fecPool, tablesQuery);
  
  if (tablesResult.success && tablesResult.data) {
    console.log(`\n📊 Available Summary-Related Tables:`);
    tablesResult.data.forEach((row, index) => {
      console.log(`   ${index + 1}. ${row.table_name}`);
    });
  }
  
  // Close database connection
  await fecPool.end();
  
  console.log(`\n✅ Committee summary investigation completed!`);
}

// Run the investigation
investigateCommitteeSummary().catch(console.error); 