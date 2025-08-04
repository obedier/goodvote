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

const goodvotePool = new Pool(goodvoteConfig);

async function checkGoodvoteTables() {
  try {
    console.log('🔍 Checking Available Tables in GoodVote Database\n');
    console.log('================================================================================');

    // Get all tables
    const tablesQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `;
    
    const tablesResult = await goodvotePool.query(tablesQuery);
    console.log('📊 Available Tables in GoodVote Database:');
    tablesResult.rows.forEach((row, index) => {
      console.log(`   ${index + 1}. ${row.table_name}`);
    });

    // Check if person_candidates table exists
    const personCandidatesQuery = `
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'person_candidates'
      ORDER BY ordinal_position
    `;
    
    const personCandidatesResult = await goodvotePool.query(personCandidatesQuery);
    if (personCandidatesResult.rows.length > 0) {
      console.log('\n📊 Person Candidates Table Structure:');
      personCandidatesResult.rows.forEach((row, index) => {
        console.log(`   ${index + 1}. ${row.column_name} (${row.data_type})`);
      });
    } else {
      console.log('\n❌ Person Candidates table does not exist');
    }

    // Check persons table
    const personsQuery = `
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'persons'
      ORDER BY ordinal_position
    `;
    
    const personsResult = await goodvotePool.query(personsQuery);
    if (personsResult.rows.length > 0) {
      console.log('\n📊 Persons Table Structure:');
      personsResult.rows.forEach((row, index) => {
        console.log(`   ${index + 1}. ${row.column_name} (${row.data_type})`);
      });
    } else {
      console.log('\n❌ Persons table does not exist');
    }

    // Check for any person-related tables
    const personRelatedQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name LIKE '%person%'
      ORDER BY table_name
    `;
    
    const personRelatedResult = await goodvotePool.query(personRelatedQuery);
    if (personRelatedResult.rows.length > 0) {
      console.log('\n📊 Person-Related Tables:');
      personRelatedResult.rows.forEach((row, index) => {
        console.log(`   ${index + 1}. ${row.table_name}`);
      });
    } else {
      console.log('\n❌ No person-related tables found');
    }

    console.log('\n✅ GoodVote tables check completed!');
    
  } catch (error) {
    console.error('❌ Error checking GoodVote tables:', error);
  } finally {
    await goodvotePool.end();
  }
}

checkGoodvoteTables(); 