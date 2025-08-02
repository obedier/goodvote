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

async function testFixedQuery() {
  console.log('🧪 Testing Fixed Query Logic\n');
  console.log('=' .repeat(80));
  
  const candidateId = 'H8MI13250';
  const cycle = 2024;
  
  // Test the old query (with duplicates)
  const oldQuery = `
    SELECT 
      SUM(ic.transaction_amt) as total_receipts,
      COUNT(*) as contribution_count
    FROM individual_contributions ic
    JOIN candidate_committee_linkages ccl ON ic.cmte_id = ccl.cmte_id
    WHERE ccl.cand_id = $1 
    AND ccl.cand_election_yr = $2
    AND ic.file_year = $2
    AND ic.transaction_amt > 0
  `;
  
  const oldResult = await executeQuery(fecPool, oldQuery, [candidateId, cycle]);
  
  if (oldResult.success && oldResult.data && oldResult.data.length > 0) {
    const data = oldResult.data[0];
    console.log(`📊 Old Query (with duplicates):`);
    console.log(`   Total Receipts: $${data.total_receipts?.toLocaleString() || 0}`);
    console.log(`   Contribution Count: ${data.contribution_count?.toLocaleString() || 0}`);
  }
  
  // Test the new query (without duplicates)
  const newQuery = `
    SELECT 
      SUM(ic.transaction_amt) as total_receipts,
      COUNT(*) as contribution_count
    FROM individual_contributions ic
    JOIN (
      SELECT DISTINCT cmte_id, cand_id, cand_election_yr 
      FROM candidate_committee_linkages 
      WHERE cand_id = $1 AND cand_election_yr = $2
    ) ccl ON ic.cmte_id = ccl.cmte_id
    WHERE ic.file_year = $2
    AND ic.transaction_amt > 0
  `;
  
  const newResult = await executeQuery(fecPool, newQuery, [candidateId, cycle]);
  
  if (newResult.success && newResult.data && newResult.data.length > 0) {
    const data = newResult.data[0];
    console.log(`\n📊 New Query (without duplicates):`);
    console.log(`   Total Receipts: $${data.total_receipts?.toLocaleString() || 0}`);
    console.log(`   Contribution Count: ${data.contribution_count?.toLocaleString() || 0}`);
  }
  
  // Test direct committee query (baseline)
  const directQuery = `
    SELECT 
      SUM(ic.transaction_amt) as total_receipts,
      COUNT(*) as contribution_count
    FROM individual_contributions ic
    WHERE ic.cmte_id = 'C00668608'
    AND ic.file_year = 2024
    AND ic.transaction_amt > 0
  `;
  
  const directResult = await executeQuery(fecPool, directQuery);
  
  if (directResult.success && directResult.data && directResult.data.length > 0) {
    const data = directResult.data[0];
    console.log(`\n📊 Direct Committee Query (baseline):`);
    console.log(`   Total Receipts: $${data.total_receipts?.toLocaleString() || 0}`);
    console.log(`   Contribution Count: ${data.contribution_count?.toLocaleString() || 0}`);
  }
  
  // Compare with FEC API
  console.log(`\n🌐 FEC API Comparison:`);
  console.log(`   Individual Contributions: $8,097,297.14`);
  console.log(`   Total Receipts: $8,190,787.32`);
  
  // Calculate improvement
  if (oldResult.success && newResult.success && oldResult.data && newResult.data) {
    const oldAmount = oldResult.data[0].total_receipts || 0;
    const newAmount = newResult.data[0].total_receipts || 0;
    const improvement = ((oldAmount - newAmount) / oldAmount) * 100;
    
    console.log(`\n📈 Improvement:`);
    console.log(`   Old Amount: $${oldAmount.toLocaleString()}`);
    console.log(`   New Amount: $${newAmount.toLocaleString()}`);
    console.log(`   Reduction: ${improvement.toFixed(1)}%`);
    
    if (Math.abs(improvement) > 50) {
      console.log(`   ✅ SIGNIFICANT IMPROVEMENT - Duplicate issue resolved`);
    } else {
      console.log(`   ⚠️  MINOR IMPROVEMENT - May need further investigation`);
    }
  }
  
  // Close database connection
  await fecPool.end();
  
  console.log(`\n✅ Query test completed!`);
}

// Run the test
testFixedQuery().catch(console.error); 