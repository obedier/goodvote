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

async function checkCongressTable() {
  console.log('🔍 Checking Congress Members Table Structure\n');
  console.log('=' .repeat(100));
  
  // Check table structure
  const structureQuery = `
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_name = 'congress_members_119th'
    ORDER BY ordinal_position
  `;
  
  const structureResult = await executeQuery(goodvotePool, structureQuery);
  
  if (structureResult.success && structureResult.data) {
    console.log('📊 Congress Members Table Structure:');
    structureResult.data.forEach((column, index) => {
      console.log(`   ${index + 1}. ${column.column_name} (${column.data_type}) - Nullable: ${column.is_nullable}`);
    });
  }
  
  // Check sample data
  const sampleQuery = `
    SELECT * FROM congress_members_119th LIMIT 3
  `;
  
  const sampleResult = await executeQuery(goodvotePool, sampleQuery);
  
  if (sampleResult.success && sampleResult.data) {
    console.log('\n📊 Sample Data:');
    sampleResult.data.forEach((row, index) => {
      console.log(`   ${index + 1}. ${JSON.stringify(row, null, 2)}`);
    });
  }
  
  // Test the join query
  const joinQuery = `
    SELECT 
      p.person_id,
      p.display_name,
      cm.member_id,
      cm.person_id as cm_person_id
    FROM persons p
    LEFT JOIN congress_members_119th cm ON p.person_id = cm.person_id
    WHERE p.display_name LIKE '%TLAIB%'
    LIMIT 5
  `;
  
  const joinResult = await executeQuery(goodvotePool, joinQuery);
  
  if (joinResult.success && joinResult.data) {
    console.log('\n📊 Join Test Results:');
    joinResult.data.forEach((row, index) => {
      console.log(`   ${index + 1}. ${row.display_name} - Member ID: ${row.member_id || 'NULL'} - CM Person ID: ${row.cm_person_id || 'NULL'}`);
    });
  }
  
  // Close database connection
  await goodvotePool.end();
  
  console.log('\n✅ Congress table check completed!');
}

// Run the check
checkCongressTable().catch(console.error); 