const { Pool } = require('pg');

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

async function testConnections() {
  console.log('🔍 Testing Database Connections\n');
  console.log('================================================================================');

  // Test goodvote connection
  console.log('📊 Testing GoodVote Database Connection:');
  const goodvotePool = new Pool(goodvoteConfig);
  try {
    const client = await goodvotePool.connect();
    console.log('   ✅ GoodVote connection successful');
    
    const result = await client.query("SELECT COUNT(*) FROM person_candidates WHERE person_id = 'P259F2D0E'");
    console.log(`   📊 Rashida Tlaib records: ${result.rows[0].count}`);
    
    client.release();
  } catch (error) {
    console.log(`   ❌ GoodVote connection failed: ${error.message}`);
  } finally {
    await goodvotePool.end();
  }

  // Test fec_gold connection
  console.log('\n📊 Testing FEC Gold Database Connection:');
  const fecCompletePool = new Pool(fecCompleteConfig);
  try {
    const client = await fecCompletePool.connect();
    console.log('   ✅ FEC Gold connection successful');
    
    const result = await client.query("SELECT COUNT(*) FROM operating_expenditures WHERE cmte_id = 'C00668608' AND file_year = 2024");
    console.log(`   📊 Rashida's operating expenditures: ${result.rows[0].count}`);
    
    client.release();
  } catch (error) {
    console.log(`   ❌ FEC Gold connection failed: ${error.message}`);
  } finally {
    await fecCompletePool.end();
  }

  console.log('\n✅ Database connection test completed!');
}

testConnections(); 