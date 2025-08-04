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

async function checkHouseSenateData() {
  try {
    console.log('🔍 Checking House Senate Current Campaigns Table\n');
    console.log('================================================================================');

    // Check table structure
    const structureQuery = `
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'house_senate_current_campaigns'
      ORDER BY ordinal_position
    `;
    
    const structureResult = await fecCompletePool.query(structureQuery);
    
    console.log('📊 House Senate Current Campaigns Table Structure:');
    structureResult.rows.forEach((row, index) => {
      console.log(`   ${index + 1}. ${row.column_name} (${row.data_type}, nullable: ${row.is_nullable})`);
    });

    // Check for Rashida Tlaib
    const rashidaQuery = `
      SELECT * FROM house_senate_current_campaigns 
      WHERE cand_id = 'H8MI13250'
    `;
    
    const rashidaResult = await fecCompletePool.query(rashidaQuery);
    console.log('\n📊 Search for Rashida Tlaib (H8MI13250):');
    if (rashidaResult.rows.length > 0) {
      console.log('   ✅ Found Rashida Tlaib:');
      const row = rashidaResult.rows[0];
      Object.keys(row).forEach(key => {
        if (row[key] !== null) {
          console.log(`      ${key}: ${row[key]}`);
        }
      });
    } else {
      console.log('   ❌ Not found by FEC ID');
    }

    // Check by name
    const nameQuery = `
      SELECT * FROM house_senate_current_campaigns 
      WHERE cand_nm ILIKE '%TLAIB%' OR cand_nm ILIKE '%RASHIDA%'
    `;
    
    const nameResult = await fecCompletePool.query(nameQuery);
    console.log('\n📊 Search by name (TLAIB/RASHIDA):');
    if (nameResult.rows.length > 0) {
      console.log('   ✅ Found by name:');
      nameResult.rows.forEach((row, index) => {
        console.log(`   ${index + 1}. Name: ${row.cand_nm}`);
        console.log(`      FEC ID: ${row.cand_id}`);
        console.log(`      State: ${row.cand_state} District: ${row.cand_district}`);
        console.log(`      Party: ${row.cand_party}`);
      });
    } else {
      console.log('   ❌ Not found by name');
    }

    // Check by state and district
    const stateQuery = `
      SELECT * FROM house_senate_current_campaigns 
      WHERE cand_state = 'MI' AND cand_district = '12'
    `;
    
    const stateResult = await fecCompletePool.query(stateQuery);
    console.log('\n📊 Search by state/district (MI-12):');
    if (stateResult.rows.length > 0) {
      console.log('   ✅ Found by state/district:');
      stateResult.rows.forEach((row, index) => {
        console.log(`   ${index + 1}. Name: ${row.cand_nm}`);
        console.log(`      FEC ID: ${row.cand_id}`);
        console.log(`      Party: ${row.cand_party}`);
      });
    } else {
      console.log('   ❌ Not found by state/district');
    }

    console.log('\n✅ House Senate data check completed!');
    
  } catch (error) {
    console.error('❌ Error checking house senate data:', error);
  } finally {
    await fecCompletePool.end();
  }
}

checkHouseSenateData(); 