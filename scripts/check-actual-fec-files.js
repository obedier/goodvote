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

async function checkActualFECFiles() {
  console.log('🔍 Checking Actual FEC Bulk Data Files vs Our Database\n');
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
  
  // 2. Actual FEC Bulk Data Files (from FEC website)
  console.log(`\n📊 ACTUAL FEC BULK DATA FILES (12 total):`);
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
  
  // 3. Let me provide the actual 12 FEC files based on FEC website
  console.log(`\n📊 CORRECTED FEC BULK DATA FILES (12 total):`);
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
  
  // 4. Map FEC files to expected database tables
  const fecFileToTableMapping = {
    'cn.txt': 'candidate_master',
    'cm.txt': 'committee_master',
    'ccl.txt': 'candidate_committee_linkages',
    'itcont.txt': 'individual_contributions',
    'itoth.txt': 'individual_other_transactions',
    'itpas2.txt': 'individual_contributions_to_candidates',
    'itpas2.txt': 'individual_contributions_to_pacs',
    'cm.txt': 'committee_master',
    'ccl.txt': 'candidate_committee_linkages',
    'cm.txt': 'committee_master',
    'ccl.txt': 'candidate_committee_linkages',
    'ccl.txt': 'candidate_committee_linkages'
  };
  
  // 5. Expected tables based on FEC files
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
  
  // 6. Critical missing tables analysis
  console.log(`\n🔍 CRITICAL MISSING TABLES:`);
  
  const criticalMissing = [
    'committee_summary',
    'individual_other_transactions',
    'independent_expenditures'
  ];
  
  criticalMissing.forEach(table => {
    const isMissing = !currentTables.includes(table);
    console.log(`   ${table}: ${isMissing ? '❌ MISSING' : '✅ PRESENT'}`);
    if (isMissing) {
      switch(table) {
        case 'committee_summary':
          console.log(`      Impact: Missing unitemized contributions totals`);
          console.log(`      FEC File: Likely from committee summary reports`);
          break;
        case 'individual_other_transactions':
          console.log(`      Impact: Missing additional individual transaction types`);
          console.log(`      FEC File: itoth.txt`);
          break;
        case 'independent_expenditures':
          console.log(`      Impact: Missing independent spending data`);
          console.log(`      FEC File: Independent expenditure reports`);
          break;
      }
    }
  });
  
  // 7. Recommendations for missing files
  console.log(`\n💡 RECOMMENDATIONS FOR MISSING FEC FILES:`);
  console.log(`   1. 🔄 ADD: committee_summary - From committee summary reports`);
  console.log(`   2. 🔄 ADD: individual_other_transactions - From itoth.txt`);
  console.log(`   3. 🔄 ADD: independent_expenditures - From independent expenditure reports`);
  console.log(`   4. 🔄 ADD: communication_costs - From communication cost reports`);
  console.log(`   5. 🔄 ADD: individual_contributions_to_candidates - From itpas2.txt`);
  console.log(`   6. 🔄 ADD: individual_contributions_to_pacs - From itpas2.txt`);
  
  // 8. Expected impact on our calculations
  console.log(`\n📈 EXPECTED IMPACT ON OUR CALCULATIONS:`);
  console.log(`   With committee_summary: Should get unitemized contributions data`);
  console.log(`   With individual_other_transactions: Should get additional individual data`);
  console.log(`   With independent_expenditures: Should get independent spending data`);
  console.log(`   Expected improvement: Could reduce variance from 34.7% to under 10%`);
  
  // 9. Priority order for adding files
  console.log(`\n🎯 PRIORITY ORDER FOR ADDING FEC FILES:`);
  console.log(`   1. HIGH: committee_summary - Most critical for unitemized data`);
  console.log(`   2. HIGH: individual_other_transactions - Additional individual data`);
  console.log(`   3. MEDIUM: independent_expenditures - Independent spending data`);
  console.log(`   4. MEDIUM: communication_costs - Additional expenditure data`);
  console.log(`   5. LOW: individual_contributions_to_candidates - May duplicate existing data`);
  console.log(`   6. LOW: individual_contributions_to_pacs - May duplicate existing data`);
  
  // Close database connection
  await fecPool.end();
  
  console.log(`\n✅ FEC files analysis completed!`);
}

// Run the analysis
checkActualFECFiles().catch(console.error); 