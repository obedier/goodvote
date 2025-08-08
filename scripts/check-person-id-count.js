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

async function checkPersonIdCount() {
  console.log('📊 Checking current person ID statistics...\n');

  const fecCompletePool = new Pool(fecCompleteConfig);

  try {
    const statsQuery = `
      SELECT 
        COUNT(*) as total_records,
        COUNT(DISTINCT person_id) as unique_persons,
        COUNT(DISTINCT cand_id) as unique_candidates,
        COUNT(DISTINCT bioguide_id) FILTER (WHERE bioguide_id IS NOT NULL) as unique_bioguide_ids
      FROM person_candidates
    `;
    
    const statsResult = await fecCompletePool.query(statsQuery);
    const stats = statsResult.rows[0];
    
    console.log('📈 Current Statistics:');
    console.log(`   Total records: ${stats.total_records.toLocaleString()}`);
    console.log(`   Unique persons: ${stats.unique_persons.toLocaleString()}`);
    console.log(`   Unique candidates: ${stats.unique_candidates.toLocaleString()}`);
    console.log(`   Unique BioGuide IDs: ${stats.unique_bioguide_ids.toLocaleString()}`);
    
    const difference = stats.unique_candidates - stats.unique_persons;
    console.log(`\n📊 Analysis:`);
    console.log(`   Difference (candidates - persons): ${difference.toLocaleString()}`);
    
    if (difference === 0) {
      console.log('   ✅ Perfect 1:1 mapping between FEC candidates and persons!');
    } else if (difference > 0) {
      console.log(`   ⚠️  ${difference.toLocaleString()} FEC candidates still have multiple persons`);
    } else {
      console.log(`   ℹ️  ${Math.abs(difference).toLocaleString()} persons have multiple FEC candidate IDs`);
    }
    
    // Check for any remaining duplicates
    const duplicateQuery = `
      SELECT 
        cand_id,
        COUNT(DISTINCT person_id) as person_id_count,
        array_agg(DISTINCT person_id) as person_ids
      FROM person_candidates 
      GROUP BY cand_id 
      HAVING COUNT(DISTINCT person_id) > 1
      ORDER BY person_id_count DESC, cand_id
    `;
    
    const duplicateResult = await fecCompletePool.query(duplicateQuery);
    
    if (duplicateResult.rows.length === 0) {
      console.log('\n✅ No remaining duplicates found!');
    } else {
      console.log(`\n❌ ${duplicateResult.rows.length} FEC IDs still have multiple person IDs:`);
      duplicateResult.rows.slice(0, 10).forEach(row => {
        console.log(`   ${row.cand_id}: ${row.person_ids.join(', ')}`);
      });
      if (duplicateResult.rows.length > 10) {
        console.log(`   ... and ${duplicateResult.rows.length - 10} more`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error checking person ID count:', error);
  } finally {
    await fecCompletePool.end();
  }
}

checkPersonIdCount(); 