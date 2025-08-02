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

async function findRashidaPersonId() {
  console.log('🔍 Finding Rashida Tlaib\'s Person ID\n');
  console.log('=' .repeat(100));
  
  // Search for Rashida Tlaib in persons table
  const searchQuery = `
    SELECT 
      person_id,
      display_name,
      normalized_name,
      state,
      current_office,
      current_district,
      current_party
    FROM persons 
    WHERE display_name ILIKE '%TLAIB%'
    OR display_name ILIKE '%RASHIDA%'
    OR normalized_name ILIKE '%TLAIB%'
    OR normalized_name ILIKE '%RASHIDA%'
    ORDER BY display_name
  `;
  
  const searchResult = await executeQuery(goodvotePool, searchQuery);
  
  if (searchResult.success && searchResult.data) {
    console.log(`📊 Found ${searchResult.data.length} potential matches:`);
    searchResult.data.forEach((person, index) => {
      console.log(`\n   ${index + 1}. Person ID: ${person.person_id}`);
      console.log(`      Display Name: ${person.display_name}`);
      console.log(`      Normalized Name: ${person.normalized_name}`);
      console.log(`      State: ${person.state}`);
      console.log(`      Current Office: ${person.current_office}`);
      console.log(`      Current District: ${person.current_district}`);
      console.log(`      Current Party: ${person.current_party}`);
    });
  }
  
  // Also check person_candidates table for H8MI13250
  const candidateQuery = `
    SELECT 
      pc.person_id,
      pc.cand_id,
      pc.election_year,
      p.display_name,
      p.state,
      p.current_office
    FROM person_candidates pc
    JOIN persons p ON pc.person_id = p.person_id
    WHERE pc.cand_id = 'H8MI13250'
    ORDER BY pc.election_year DESC
  `;
  
  const candidateResult = await executeQuery(goodvotePool, candidateQuery);
  
  if (candidateResult.success && candidateResult.data) {
    console.log(`\n📊 Person Candidates for H8MI13250:`);
    candidateResult.data.forEach((candidate, index) => {
      console.log(`\n   ${index + 1}. Person ID: ${candidate.person_id}`);
      console.log(`      Candidate ID: ${candidate.cand_id}`);
      console.log(`      Election Year: ${candidate.election_year}`);
      console.log(`      Display Name: ${candidate.display_name}`);
      console.log(`      State: ${candidate.state}`);
      console.log(`      Current Office: ${candidate.current_office}`);
    });
  }
  
  // Close database connection
  await goodvotePool.end();
  
  console.log(`\n✅ Person ID search completed!`);
}

// Run the search
findRashidaPersonId().catch(console.error); 