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

async function checkFecIdsWithoutPerson() {
  console.log('🔍 Checking for FEC IDs without person IDs...\n');

  const fecCompletePool = new Pool(fecCompleteConfig);

  try {
    // Check for any records without person_id
    const nullPersonQuery = `
      SELECT 
        COUNT(*) as null_person_records,
        COUNT(DISTINCT cand_id) as null_person_candidates
      FROM person_candidates 
      WHERE person_id IS NULL OR person_id = ''
    `;
    
    const nullPersonResult = await fecCompletePool.query(nullPersonQuery);
    const nullPersonStats = nullPersonResult.rows[0];
    
    console.log('📊 Records without person_id:');
    console.log(`   Total records: ${nullPersonStats.null_person_records.toLocaleString()}`);
    console.log(`   Unique candidates: ${nullPersonStats.null_person_candidates.toLocaleString()}`);
    
    if (nullPersonStats.null_person_records > 0) {
      console.log('\n❌ Found records without person_id!');
      
      // Show some examples
      const examplesQuery = `
        SELECT cand_id, election_year, display_name
        FROM person_candidates 
        WHERE person_id IS NULL OR person_id = ''
        LIMIT 10
      `;
      
      const examplesResult = await fecCompletePool.query(examplesQuery);
      console.log('\nExamples of records without person_id:');
      examplesResult.rows.forEach(row => {
        console.log(`   ${row.cand_id} (${row.election_year}): ${row.display_name}`);
      });
    } else {
      console.log('\n✅ All records have person_id assigned!');
    }
    
    // Check for orphaned FEC IDs (in candidate_master but not in person_candidates)
    console.log('\n🔍 Checking for orphaned FEC IDs...');
    
    const orphanedQuery = `
      SELECT 
        COUNT(DISTINCT cm.cand_id) as orphaned_candidates
      FROM candidate_master cm
      LEFT JOIN person_candidates pc ON cm.cand_id = pc.cand_id
      WHERE pc.cand_id IS NULL
    `;
    
    const orphanedResult = await fecCompletePool.query(orphanedQuery);
    const orphanedCount = orphanedResult.rows[0].orphaned_candidates;
    
    console.log(`   FEC IDs in candidate_master but not in person_candidates: ${orphanedCount.toLocaleString()}`);
    
    if (orphanedCount > 0) {
      console.log('\n📋 Sample orphaned FEC IDs:');
      const sampleOrphanedQuery = `
        SELECT cm.cand_id, cm.cand_name, cm.cand_office, cm.cand_status
        FROM candidate_master cm
        LEFT JOIN person_candidates pc ON cm.cand_id = pc.cand_id
        WHERE pc.cand_id IS NULL
        LIMIT 10
      `;
      
      const sampleResult = await fecCompletePool.query(sampleOrphanedQuery);
      sampleResult.rows.forEach(row => {
        console.log(`   ${row.cand_id}: ${row.cand_name} (${row.cand_office}, ${row.cand_state})`);
      });
    } else {
      console.log('   ✅ All FEC IDs in candidate_master are mapped to person_candidates!');
    }
    
    // Check the reverse - person_candidates not in candidate_master
    console.log('\n🔍 Checking for person_candidates not in candidate_master...');
    
    const reverseOrphanedQuery = `
      SELECT 
        COUNT(DISTINCT pc.cand_id) as reverse_orphaned_candidates
      FROM person_candidates pc
      LEFT JOIN candidate_master cm ON pc.cand_id = cm.cand_id
      WHERE cm.cand_id IS NULL
    `;
    
    const reverseOrphanedResult = await fecCompletePool.query(reverseOrphanedQuery);
    const reverseOrphanedCount = reverseOrphanedResult.rows[0].reverse_orphaned_candidates;
    
    console.log(`   FEC IDs in person_candidates but not in candidate_master: ${reverseOrphanedCount.toLocaleString()}`);
    
    if (reverseOrphanedCount > 0) {
      console.log('\n📋 Sample reverse orphaned FEC IDs:');
      const sampleReverseQuery = `
        SELECT pc.cand_id, pc.display_name, pc.election_year
        FROM person_candidates pc
        LEFT JOIN candidate_master cm ON pc.cand_id = cm.cand_id
        WHERE cm.cand_id IS NULL
        LIMIT 10
      `;
      
      const sampleReverseResult = await fecCompletePool.query(sampleReverseQuery);
      sampleReverseResult.rows.forEach(row => {
        console.log(`   ${row.cand_id}: ${row.display_name} (${row.election_year})`);
      });
    } else {
      console.log('   ✅ All FEC IDs in person_candidates exist in candidate_master!');
    }
    
    // Summary
    console.log('\n📊 Summary:');
    console.log(`   Records without person_id: ${nullPersonStats.null_person_records.toLocaleString()}`);
    console.log(`   Orphaned FEC IDs (not in person_candidates): ${orphanedCount.toLocaleString()}`);
    console.log(`   Reverse orphaned FEC IDs (not in candidate_master): ${reverseOrphanedCount.toLocaleString()}`);
    
    if (nullPersonStats.null_person_records === 0 && orphanedCount === 0 && reverseOrphanedCount === 0) {
      console.log('\n✅ Perfect! All FEC IDs are properly mapped with person IDs.');
    } else {
      console.log('\n⚠️  Some data inconsistencies found that may need attention.');
    }
    
  } catch (error) {
    console.error('❌ Error checking FEC IDs without person IDs:', error);
  } finally {
    await fecCompletePool.end();
  }
}

checkFecIdsWithoutPerson(); 