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

async function checkRashidaPerson() {
  try {
    console.log('🔍 Checking Rashida Tlaib in Person Candidates Table\n');
    console.log('================================================================================');

    // Check for Rashida Tlaib by various identifiers
    const queries = [
      {
        name: 'By FEC ID (H8MI13250)',
        query: `SELECT * FROM person_candidates WHERE cand_id = 'H8MI13250' ORDER BY election_year DESC`
      },
      {
        name: 'By Person ID (P259F2D0E)',
        query: `SELECT * FROM person_candidates WHERE person_id = 'P259F2D0E' ORDER BY election_year DESC`
      },
      {
        name: 'By Name (Rashida Tlaib)',
        query: `
          SELECT pc.*, p.display_name 
          FROM person_candidates pc
          JOIN persons p ON pc.person_id = p.person_id
          WHERE p.display_name ILIKE '%RASHIDA%' OR p.display_name ILIKE '%TLAIB%'
          ORDER BY pc.election_year DESC
        `
      },
      {
        name: 'All Person Candidates for 2024',
        query: `SELECT * FROM person_candidates WHERE election_year = 2024 LIMIT 10`
      }
    ];

    for (const queryInfo of queries) {
      console.log(`\n📊 ${queryInfo.name}:`);
      const result = await goodvotePool.query(queryInfo.query);
      if (result.rows.length > 0) {
        result.rows.forEach((row, index) => {
          console.log(`   ${index + 1}. Person ID: ${row.person_id}, Cand ID: ${row.cand_id}, Year: ${row.election_year}, Office: ${row.office}`);
          if (row.display_name) {
            console.log(`      Name: ${row.display_name}`);
          }
        });
      } else {
        console.log('   ❌ No results found');
      }
    }

    // Check persons table for Rashida
    console.log('\n📊 Checking Persons Table:');
    const personsQuery = `
      SELECT * FROM persons 
      WHERE display_name ILIKE '%RASHIDA%' OR display_name ILIKE '%TLAIB%'
      ORDER BY display_name
    `;
    
    const personsResult = await goodvotePool.query(personsQuery);
    if (personsResult.rows.length > 0) {
      personsResult.rows.forEach((row, index) => {
        console.log(`   ${index + 1}. Person ID: ${row.person_id}, Name: ${row.display_name}, State: ${row.state}`);
      });
    } else {
      console.log('   ❌ No persons found with Rashida Tlaib name');
    }

    console.log('\n✅ Rashida person check completed!');
    
  } catch (error) {
    console.error('❌ Error checking Rashida person data:', error);
  } finally {
    await goodvotePool.end();
  }
}

checkRashidaPerson(); 