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

async function analyzeFECBulkFiles() {
  console.log('🔍 Analyzing FEC Bulk Data Files vs Our Database\n');
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
  
  // 2. FEC Bulk Data Files (from FEC website)
  console.log(`\n📊 FEC BULK DATA FILES (12 total):`);
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
  
  // 3. Map FEC files to our database tables
  console.log(`\n🔍 MAPPING ANALYSIS:`);
  
  const fecFileMapping = {
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
  
  // 4. Check for missing tables
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
  
  // 5. Check for committee summary specifically
  console.log(`\n🔍 COMMITTEE SUMMARY ANALYSIS:`);
  const committeeSummaryExists = currentTables.includes('committee_summary');
  console.log(`   Committee Summary Table: ${committeeSummaryExists ? 'EXISTS' : 'MISSING'}`);
  
  if (!committeeSummaryExists) {
    console.log(`   ❌ This is likely why we're missing unitemized contributions data`);
    console.log(`   📊 Committee summary contains aggregated totals including unitemized amounts`);
  }
  
  // 6. Check for committee transactions
  console.log(`\n🔍 COMMITTEE TRANSACTIONS ANALYSIS:`);
  const committeeTransactionsExists = currentTables.includes('committee_transactions');
  console.log(`   Committee Transactions Table: ${committeeTransactionsExists ? 'EXISTS' : 'MISSING'}`);
  
  if (!committeeTransactionsExists) {
    console.log(`   ❌ This is why we're missing committee-to-committee transfers`);
    console.log(`   📊 Committee transactions include PAC contributions and transfers`);
  }
  
  // 7. Check for operating expenditures
  console.log(`\n🔍 OPERATING EXPENDITURES ANALYSIS:`);
  const operatingExpendituresExists = currentTables.includes('operating_expenditures');
  console.log(`   Operating Expenditures Table: ${operatingExpendituresExists ? 'EXISTS' : 'MISSING'}`);
  
  if (!operatingExpendituresExists) {
    console.log(`   ❌ This is why we can't calculate disbursements`);
    console.log(`   📊 Operating expenditures are needed for offset calculations`);
  }
  
  // 8. Check for independent expenditures
  console.log(`\n🔍 INDEPENDENT EXPENDITURES ANALYSIS:`);
  const independentExpendituresExists = currentTables.includes('independent_expenditures');
  console.log(`   Independent Expenditures Table: ${independentExpendituresExists ? 'EXISTS' : 'MISSING'}`);
  
  if (!independentExpendituresExists) {
    console.log(`   ❌ This is why we're missing independent expenditure data`);
    console.log(`   📊 Independent expenditures are separate from candidate committees`);
  }
  
  // 9. Recommendations
  console.log(`\n💡 RECOMMENDATIONS:`);
  console.log(`   1. 🔄 ADD: committee_summary - Contains unitemized contributions totals`);
  console.log(`   2. 🔄 ADD: committee_transactions - Contains PAC contributions and transfers`);
  console.log(`   3. 🔄 ADD: operating_expenditures - Contains disbursement data`);
  console.log(`   4. 🔄 ADD: independent_expenditures - Contains independent spending data`);
  console.log(`   5. 🔄 ADD: communication_costs - Contains additional expenditure data`);
  console.log(`   6. 🔄 ADD: individual_other_transactions - Contains additional individual data`);
  
  // 10. Impact on our calculations
  console.log(`\n📈 EXPECTED IMPACT ON OUR CALCULATIONS:`);
  console.log(`   With committee_summary: Should get unitemized contributions data`);
  console.log(`   With committee_transactions: Should get PAC contributions and transfers`);
  console.log(`   With operating_expenditures: Should get disbursement calculations`);
  console.log(`   With independent_expenditures: Should get independent spending data`);
  console.log(`   Expected improvement: Could reduce variance from 34.7% to under 10%`);
  
  // Close database connection
  await fecPool.end();
  
  console.log(`\n✅ FEC bulk files analysis completed!`);
}

// Run the analysis
analyzeFECBulkFiles().catch(console.error); 