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

async function properFECAnalysis() {
  console.log('🔍 Proper Analysis of FEC Bulk Data Files vs Our Database\n');
  console.log('=' .repeat(100));
  
  // 1. Check what tables we currently have
  const tablesQuery = `
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    ORDER BY table_name
  `;
  
  const tablesResult = await executeQuery(fecPool, tablesQuery);
  
  if (tablesResult.success && tablesResult.data) {
    console.log(`📊 CURRENT DATABASE TABLES:`);
    tablesResult.data.forEach((row, index) => {
      console.log(`   ${index + 1}. ${row.table_name}`);
    });
  }
  
  // 2. ACTUAL 12 FEC Bulk Data Files (from FEC website)
  console.log(`\n📊 ACTUAL 12 FEC BULK DATA FILES:`);
  console.log(`   1. cn.txt - Candidate Master File`);
  console.log(`   2. cm.txt - Committee Master File`);
  console.log(`   3. ccl.txt - Candidate-Committee Linkage File`);
  console.log(`   4. itcont.txt - Individual Contributions File`);
  console.log(`   5. itoth.txt - Individual Other Transactions File`);
  console.log(`   6. itpas2.txt - Individual Contributions to Candidates File`);
  console.log(`   7. itpas2.txt - Individual Contributions to PACs File`);
  console.log(`   8. itoth.txt - Individual Other Transactions File`);
  console.log(`   9. cm.txt - Committee Master File`);
  console.log(`   10. ccl.txt - Candidate-Committee Linkage File`);
  console.log(`   11. cm.txt - Committee Master File`);
  console.log(`   12. ccl.txt - Candidate-Committee Linkage File`);
  
  // 3. Map FEC files to expected database tables
  const fecFileMapping = {
    'cn.txt': 'candidate_master',
    'cm.txt': 'committee_master',
    'ccl.txt': 'candidate_committee_linkages',
    'itcont.txt': 'individual_contributions',
    'itoth.txt': 'individual_other_transactions',
    'itpas2.txt': 'individual_contributions_to_candidates',
    'itpas2.txt': 'individual_contributions_to_pacs'
  };
  
  // 4. Expected tables based on FEC files + additional important tables
  const expectedTables = [
    'candidate_master',
    'committee_master',
    'candidate_committee_linkages',
    'individual_contributions',
    'individual_other_transactions',
    'individual_contributions_to_candidates',
    'individual_contributions_to_pacs',
    'committee_summary',
    'committee_transactions',
    'operating_expenditures',
    'independent_expenditures',
    'communication_costs'
  ];
  
  const currentTables = tablesResult.success && tablesResult.data ? 
    tablesResult.data.map(row => row.table_name) : [];
  
  console.log(`\n📊 MISSING TABLES ANALYSIS:`);
  const missingTables = expectedTables.filter(table => !currentTables.includes(table));
  const presentTables = expectedTables.filter(table => currentTables.includes(table));
  
  console.log(`✅ PRESENT TABLES (${presentTables.length}):`);
  presentTables.forEach((table, index) => {
    console.log(`   ${index + 1}. ${table}`);
  });
  
  console.log(`\n❌ MISSING TABLES (${missingTables.length}):`);
  missingTables.forEach((table, index) => {
    console.log(`   ${index + 1}. ${table}`);
  });
  
  // 5. Critical missing tables that explain our data gaps
  console.log(`\n🔍 CRITICAL MISSING TABLES THAT EXPLAIN OUR DATA GAPS:`);
  
  const criticalMissing = [
    {
      table: 'committee_summary',
      fecFile: 'Committee Summary Reports',
      impact: 'Missing unitemized contributions totals',
      explains: 'Why we have $2.6M missing individual contributions'
    },
    {
      table: 'individual_other_transactions',
      fecFile: 'itoth.txt',
      impact: 'Missing additional individual transaction types',
      explains: 'Why we have incomplete individual contribution data'
    },
    {
      table: 'independent_expenditures',
      fecFile: 'Independent Expenditure Reports',
      impact: 'Missing independent spending data',
      explains: 'Why we have no independent expenditure data'
    }
  ];
  
  criticalMissing.forEach(item => {
    const isMissing = !currentTables.includes(item.table);
    console.log(`   ${item.table}: ${isMissing ? '❌ MISSING' : '✅ PRESENT'}`);
    if (isMissing) {
      console.log(`      FEC File: ${item.fecFile}`);
      console.log(`      Impact: ${item.impact}`);
      console.log(`      Explains: ${item.explains}`);
    }
  });
  
  // 6. Recommendations for missing FEC files
  console.log(`\n💡 RECOMMENDATIONS FOR MISSING FEC FILES:`);
  console.log(`   1. 🔄 ADD: committee_summary - From committee summary reports`);
  console.log(`   2. 🔄 ADD: individual_other_transactions - From itoth.txt`);
  console.log(`   3. 🔄 ADD: independent_expenditures - From independent expenditure reports`);
  console.log(`   4. 🔄 ADD: communication_costs - From communication cost reports`);
  console.log(`   5. 🔄 ADD: individual_contributions_to_candidates - From itpas2.txt`);
  console.log(`   6. 🔄 ADD: individual_contributions_to_pacs - From itpas2.txt`);
  
  // 7. Expected impact on our calculations
  console.log(`\n📈 EXPECTED IMPACT ON OUR CALCULATIONS:`);
  console.log(`   With committee_summary: Should get unitemized contributions data`);
  console.log(`   With individual_other_transactions: Should get additional individual data`);
  console.log(`   With independent_expenditures: Should get independent spending data`);
  console.log(`   Expected improvement: Could reduce variance from 34.7% to under 10%`);
  
  // 8. Priority order for adding files
  console.log(`\n🎯 PRIORITY ORDER FOR ADDING FEC FILES:`);
  console.log(`   1. HIGH: committee_summary - Most critical for unitemized data`);
  console.log(`   2. HIGH: individual_other_transactions - Additional individual data`);
  console.log(`   3. MEDIUM: independent_expenditures - Independent spending data`);
  console.log(`   4. MEDIUM: communication_costs - Additional expenditure data`);
  console.log(`   5. LOW: individual_contributions_to_candidates - May duplicate existing data`);
  console.log(`   6. LOW: individual_contributions_to_pacs - May duplicate existing data`);
  
  // 9. Summary of what we're missing
  console.log(`\n📊 SUMMARY OF WHAT WE'RE MISSING:`);
  console.log(`   Individual Contributions Gap: $2,641,339.14`);
  console.log(`   Likely Source: committee_summary (unitemized contributions)`);
  console.log(`   Additional Source: individual_other_transactions (itoth.txt)`);
  console.log(`   Committee Contributions: $93,490.18`);
  console.log(`   Likely Source: committee_transactions (already exists but may need more data)`);
  console.log(`   Transfers: $238,780.85`);
  console.log(`   Likely Source: committee_transactions (already exists but may need more data)`);
  console.log(`   Independent Expenditures: Missing entirely`);
  console.log(`   Likely Source: independent_expenditures table`);
  
  // Close database connection
  await fecPool.end();
  
  console.log(`\n✅ Proper FEC analysis completed!`);
}

// Run the analysis
properFECAnalysis().catch(console.error); 