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

async function copyPersonMapping() {
  console.log('🔍 Copying Person Mapping Data to FEC Gold Database\n');
  console.log('================================================================================');

  const goodvotePool = new Pool(goodvoteConfig);
  const fecCompletePool = new Pool(fecCompleteConfig);

  try {
    // Step 1: Get all person_candidates data from goodvote
    console.log('📊 Step 1: Reading person_candidates from goodvote database...');
    const personCandidatesQuery = `
      SELECT 
        pc.person_id,
        pc.cand_id,
        pc.election_year,
        pc.office,
        pc.district,
        pc.party,
        pc.incumbent_challenge,
        pc.status,
        p.display_name,
        p.state,
        p.current_office,
        p.current_district,
        p.current_party,
        p.bioguide_id
      FROM person_candidates pc
      JOIN persons p ON pc.person_id = p.person_id
      ORDER BY pc.person_id, pc.election_year DESC
    `;
    
    const personCandidatesResult = await goodvotePool.query(personCandidatesQuery);
    console.log(`   ✅ Found ${personCandidatesResult.rows.length} person_candidates records`);

    // Step 2: Create person_candidates table in fec_gold if it doesn't exist
    console.log('\n📊 Step 2: Creating person_candidates table in fec_gold database...');
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS person_candidates (
        id SERIAL PRIMARY KEY,
        person_id VARCHAR(50) NOT NULL,
        cand_id VARCHAR(50) NOT NULL,
        election_year INTEGER NOT NULL,
        office VARCHAR(10),
        district VARCHAR(10),
        party VARCHAR(10),
        incumbent_challenge VARCHAR(10),
        status VARCHAR(20),
        display_name VARCHAR(200),
        state VARCHAR(10),
        current_office VARCHAR(10),
        current_district VARCHAR(10),
        current_party VARCHAR(10),
        bioguide_id VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    await fecCompletePool.query(createTableQuery);
    console.log('   ✅ person_candidates table created/verified');

    // Step 3: Clear existing data and insert new data
    console.log('\n📊 Step 3: Inserting person_candidates data into fec_gold...');
    await fecCompletePool.query('DELETE FROM person_candidates');
    
    for (const row of personCandidatesResult.rows) {
      const insertQuery = `
        INSERT INTO person_candidates (
          person_id, cand_id, election_year, office, district, party, 
          incumbent_challenge, status, display_name, state, current_office, 
          current_district, current_party, bioguide_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      `;
      
      await fecCompletePool.query(insertQuery, [
        row.person_id, row.cand_id, row.election_year, row.office, row.district, row.party,
        row.incumbent_challenge, row.status, row.display_name, row.state, row.current_office,
        row.current_district, row.current_party, row.bioguide_id
      ]);
    }
    
    console.log(`   ✅ Inserted ${personCandidatesResult.rows.length} records`);

    // Step 4: Create indexes for better performance
    console.log('\n📊 Step 4: Creating indexes for better performance...');
    const indexQueries = [
      'CREATE INDEX IF NOT EXISTS idx_person_candidates_person_id ON person_candidates(person_id)',
      'CREATE INDEX IF NOT EXISTS idx_person_candidates_cand_id ON person_candidates(cand_id)',
      'CREATE INDEX IF NOT EXISTS idx_person_candidates_election_year ON person_candidates(election_year)',
      'CREATE INDEX IF NOT EXISTS idx_person_candidates_person_election ON person_candidates(person_id, election_year)'
    ];
    
    for (const indexQuery of indexQueries) {
      await fecCompletePool.query(indexQuery);
    }
    console.log('   ✅ Indexes created');

    // Step 5: Verify the data
    console.log('\n📊 Step 5: Verifying the copied data...');
    const verifyQuery = `
      SELECT 
        COUNT(*) as total_records,
        COUNT(DISTINCT person_id) as unique_persons,
        COUNT(DISTINCT cand_id) as unique_candidates,
        MIN(election_year) as earliest_year,
        MAX(election_year) as latest_year
      FROM person_candidates
    `;
    
    const verifyResult = await fecCompletePool.query(verifyQuery);
    const stats = verifyResult.rows[0];
    console.log(`   ✅ Total records: ${stats.total_records}`);
    console.log(`   ✅ Unique persons: ${stats.unique_persons}`);
    console.log(`   ✅ Unique candidates: ${stats.unique_candidates}`);
    console.log(`   ✅ Year range: ${stats.earliest_year} - ${stats.latest_year}`);

    // Step 6: Test with Rashida Tlaib
    console.log('\n📊 Step 6: Testing with Rashida Tlaib...');
    const testQuery = `
      SELECT * FROM person_candidates 
      WHERE person_id = 'P259F2D0E' 
      ORDER BY election_year DESC
    `;
    
    const testResult = await fecCompletePool.query(testQuery);
    console.log(`   ✅ Found ${testResult.rows.length} records for Rashida Tlaib`);
    testResult.rows.forEach((row, index) => {
      console.log(`      ${index + 1}. ${row.election_year}: ${row.cand_id} (${row.office})`);
    });

    console.log('\n✅ Person mapping data successfully copied to fec_gold database!');
    
  } catch (error) {
    console.error('❌ Error copying person mapping data:', error);
  } finally {
    await goodvotePool.end();
    await fecCompletePool.end();
  }
}

copyPersonMapping(); 