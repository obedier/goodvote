const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  user: 'osamabedier',
  password: '',
  database: 'fec_gold',
  port: 5432,
});

async function investigateDuplicatePersonIds() {
  try {
    console.log('🔍 Investigating duplicate person IDs for same FEC candidate ID...\n');

    // First, let's look at Charles Schumer specifically
    console.log('📋 Charles Schumer (S8NY00082) details:');
    const schumerQuery = `
      SELECT person_id, cand_id, display_name, election_year, state, current_office, current_district
      FROM person_candidates 
      WHERE cand_id = 'S8NY00082' 
      ORDER BY person_id, election_year;
    `;
    
    const schumerResult = await pool.query(schumerQuery);
    console.log('Results for S8NY00082:');
    schumerResult.rows.forEach(row => {
      console.log(`  Person ID: ${row.person_id}, Year: ${row.election_year}, Name: ${row.display_name}`);
    });

    // Now let's find all cases where the same cand_id has multiple person_ids
    console.log('\n🔍 Finding all candidates with multiple person IDs for same FEC ID:');
    const duplicateQuery = `
      SELECT 
        cand_id,
        COUNT(DISTINCT person_id) as person_id_count,
        array_agg(DISTINCT person_id) as person_ids,
        array_agg(DISTINCT display_name) as display_names,
        array_agg(DISTINCT election_year) as election_years
      FROM person_candidates 
      GROUP BY cand_id 
      HAVING COUNT(DISTINCT person_id) > 1
      ORDER BY person_id_count DESC, cand_id;
    `;
    
    const duplicateResult = await pool.query(duplicateQuery);
    
    if (duplicateResult.rows.length === 0) {
      console.log('✅ No duplicates found - all FEC IDs have only one person ID');
    } else {
      console.log(`❌ Found ${duplicateResult.rows.length} FEC IDs with multiple person IDs:`);
      duplicateResult.rows.forEach(row => {
        console.log(`\n  FEC ID: ${row.cand_id}`);
        console.log(`  Person IDs: ${row.person_ids.join(', ')}`);
        console.log(`  Names: ${row.display_names.join(', ')}`);
        console.log(`  Years: ${row.election_years.join(', ')}`);
      });
    }

    // Let's also check the total counts
    console.log('\n📊 Overall statistics:');
    const statsQuery = `
      SELECT 
        COUNT(DISTINCT cand_id) as unique_fec_ids,
        COUNT(DISTINCT person_id) as unique_person_ids,
        COUNT(*) as total_records
      FROM person_candidates;
    `;
    
    const statsResult = await pool.query(statsQuery);
    const stats = statsResult.rows[0];
    console.log(`  Total FEC IDs: ${stats.unique_fec_ids}`);
    console.log(`  Total Person IDs: ${stats.unique_person_ids}`);
    console.log(`  Total Records: ${stats.total_records}`);
    
    if (stats.unique_fec_ids !== stats.unique_person_ids) {
      console.log(`  ⚠️  Mismatch: ${stats.unique_fec_ids - stats.unique_person_ids} FEC IDs have multiple person IDs`);
    }

  } catch (error) {
    console.error('Error investigating duplicates:', error);
  } finally {
    await pool.end();
  }
}

investigateDuplicatePersonIds(); 