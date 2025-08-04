const { Pool } = require('pg');

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

const fecCompletePool = new Pool(fecCompleteConfig);

async function checkRashidaCongress() {
  try {
    console.log('🔍 Checking Rashida Tlaib in Congress Table\n');
    console.log('================================================================================');

    // Check by FEC ID
    const fecQuery = `
      SELECT * FROM congress_members_119th 
      WHERE fec_candidate_id = 'H8MI13250'
    `;
    
    const fecResult = await fecCompletePool.query(fecQuery);
    console.log('📊 Search by FEC ID (H8MI13250):');
    if (fecResult.rows.length > 0) {
      console.log('   ✅ Found in congress table:');
      console.log(`   Name: ${fecResult.rows[0].name}`);
      console.log(`   Bioguide ID: ${fecResult.rows[0].bioguide_id}`);
      console.log(`   State: ${fecResult.rows[0].state}`);
      console.log(`   District: ${fecResult.rows[0].district}`);
      console.log(`   Party: ${fecResult.rows[0].party}`);
    } else {
      console.log('   ❌ Not found by FEC ID');
    }

    // Check by name
    const nameQuery = `
      SELECT * FROM congress_members_119th 
      WHERE name ILIKE '%TLAIB%' OR name ILIKE '%RASHIDA%'
    `;
    
    const nameResult = await fecCompletePool.query(nameQuery);
    console.log('\n📊 Search by name (TLAIB/RASHIDA):');
    if (nameResult.rows.length > 0) {
      console.log('   ✅ Found by name:');
      nameResult.rows.forEach((row, index) => {
        console.log(`   ${index + 1}. Name: ${row.name}`);
        console.log(`      FEC ID: ${row.fec_candidate_id}`);
        console.log(`      Bioguide ID: ${row.bioguide_id}`);
        console.log(`      State: ${row.state} District: ${row.district}`);
      });
    } else {
      console.log('   ❌ Not found by name');
    }

    // Check by state and district
    const stateQuery = `
      SELECT * FROM congress_members_119th 
      WHERE state = 'MI' AND district = '12'
    `;
    
    const stateResult = await fecCompletePool.query(stateQuery);
    console.log('\n📊 Search by state/district (MI-12):');
    if (stateResult.rows.length > 0) {
      console.log('   ✅ Found by state/district:');
      stateResult.rows.forEach((row, index) => {
        console.log(`   ${index + 1}. Name: ${row.name}`);
        console.log(`      FEC ID: ${row.fec_candidate_id}`);
        console.log(`      Bioguide ID: ${row.bioguide_id}`);
        console.log(`      Party: ${row.party}`);
      });
    } else {
      console.log('   ❌ Not found by state/district');
    }

    console.log('\n✅ Congress table check completed!');
    
  } catch (error) {
    console.error('❌ Error checking congress table:', error);
  } finally {
    await fecCompletePool.end();
  }
}

checkRashidaCongress(); 