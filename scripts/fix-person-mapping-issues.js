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

async function fixPersonMappingIssues() {
  console.log('🔍 Analyzing and Fixing Person Mapping Issues\n');
  console.log('================================================================================');

  const fecCompletePool = new Pool(fecCompleteConfig);

  try {
    // Step 1: Analyze the current state
    console.log('📊 Step 1: Analyzing current person mapping state...');
    
    const analysisQuery = `
      SELECT 
        cand_id,
        COUNT(DISTINCT person_id) as person_id_count,
        array_agg(DISTINCT person_id) as person_ids,
        array_agg(DISTINCT display_name) as display_names,
        array_agg(DISTINCT election_year) as election_years,
        array_agg(DISTINCT bioguide_id) FILTER (WHERE bioguide_id IS NOT NULL) as bioguide_ids
      FROM person_candidates 
      GROUP BY cand_id 
      HAVING COUNT(DISTINCT person_id) > 1
      ORDER BY person_id_count DESC, cand_id
    `;
    
    const analysisResult = await fecCompletePool.query(analysisQuery);
    
    if (analysisResult.rows.length === 0) {
      console.log('✅ No person mapping issues found!');
      return;
    }
    
    console.log(`❌ Found ${analysisResult.rows.length} FEC IDs with multiple person IDs:`);
    
    // Step 2: Create a mapping strategy for each problematic cand_id
    console.log('\n📊 Step 2: Creating mapping strategy...');
    
    const mappingStrategy = new Map();
    
    for (const row of analysisResult.rows) {
      const candId = row.cand_id;
      const personIds = row.person_ids;
      const displayNames = row.display_names;
      const bioguideIds = row.bioguide_ids;
      
      console.log(`\n🔍 Analyzing ${candId}:`);
      console.log(`   Person IDs: ${personIds.join(', ')}`);
      console.log(`   Names: ${displayNames.join(', ')}`);
      console.log(`   BioGuide IDs: ${bioguideIds && bioguideIds.length > 0 ? bioguideIds.join(', ') : 'None'}`);
      
      // Strategy: Choose the best person_id based on:
      // 1. Has BioGuide ID (preferred)
      // 2. Most recent election year
      // 3. Most complete name
      
      let bestPersonId = personIds[0];
      let bestScore = 0;
      
      for (let i = 0; i < personIds.length; i++) {
        const personId = personIds[i];
        const displayName = displayNames[i];
        
        // Get detailed info for this person_id
        const detailQuery = `
          SELECT 
            person_id,
            display_name,
            bioguide_id,
            MAX(election_year) as latest_year,
            COUNT(*) as record_count
          FROM person_candidates 
          WHERE person_id = $1
          GROUP BY person_id, display_name, bioguide_id
        `;
        
        const detailResult = await fecCompletePool.query(detailQuery, [personId]);
        const detail = detailResult.rows[0];
        
        // Calculate score
        let score = 0;
        if (detail.bioguide_id) score += 100; // BioGuide ID is gold standard
        score += detail.latest_year; // More recent is better
        score += detail.record_count * 10; // More records is better
        if (detail.display_name && !detail.display_name.includes('MR.') && !detail.display_name.includes('SEN.')) {
          score += 50; // Cleaner name is better
        }
        
        console.log(`     ${personId}: score=${score} (${detail.display_name}, latest=${detail.latest_year}, records=${detail.record_count})`);
        
        if (score > bestScore) {
          bestScore = score;
          bestPersonId = personId;
        }
      }
      
      console.log(`   ✅ Selected: ${bestPersonId} (score: ${bestScore})`);
      mappingStrategy.set(candId, bestPersonId);
    }
    
    // Step 3: Apply the fixes
    console.log('\n📊 Step 3: Applying fixes...');
    
    let totalFixed = 0;
    
    for (const [candId, bestPersonId] of mappingStrategy) {
      // Get all person_ids for this cand_id
      const getPersonIdsQuery = `
        SELECT DISTINCT person_id FROM person_candidates WHERE cand_id = $1
      `;
      
      const personIdsResult = await fecCompletePool.query(getPersonIdsQuery, [candId]);
      const allPersonIds = personIdsResult.rows.map(row => row.person_id);
      
      // Update all records for this cand_id to use the best person_id
      for (const oldPersonId of allPersonIds) {
        if (oldPersonId !== bestPersonId) {
          const updateQuery = `
            UPDATE person_candidates 
            SET person_id = $1 
            WHERE cand_id = $2 AND person_id = $3
          `;
          
          const updateResult = await fecCompletePool.query(updateQuery, [bestPersonId, candId, oldPersonId]);
          totalFixed += updateResult.rowCount;
          
          console.log(`   ✅ Updated ${updateResult.rowCount} records: ${candId} (${oldPersonId} → ${bestPersonId})`);
        }
      }
    }
    
    console.log(`\n✅ Total records updated: ${totalFixed}`);
    
    // Step 4: Verify the fixes
    console.log('\n📊 Step 4: Verifying fixes...');
    
    const verifyQuery = `
      SELECT 
        cand_id,
        COUNT(DISTINCT person_id) as person_id_count,
        array_agg(DISTINCT person_id) as person_ids
      FROM person_candidates 
      GROUP BY cand_id 
      HAVING COUNT(DISTINCT person_id) > 1
      ORDER BY person_id_count DESC, cand_id
    `;
    
    const verifyResult = await fecCompletePool.query(verifyQuery);
    
    if (verifyResult.rows.length === 0) {
      console.log('✅ All person mapping issues have been resolved!');
    } else {
      console.log(`❌ ${verifyResult.rows.length} FEC IDs still have multiple person IDs:`);
      verifyResult.rows.forEach(row => {
        console.log(`   ${row.cand_id}: ${row.person_ids.join(', ')}`);
      });
    }
    
    // Step 5: Final statistics
    console.log('\n📊 Step 5: Final statistics...');
    
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
    
    console.log(`   Total records: ${stats.total_records}`);
    console.log(`   Unique persons: ${stats.unique_persons}`);
    console.log(`   Unique candidates: ${stats.unique_candidates}`);
    console.log(`   Unique BioGuide IDs: ${stats.unique_bioguide_ids}`);
    
    if (stats.unique_candidates === stats.unique_persons) {
      console.log('✅ Perfect 1:1 mapping between FEC candidates and persons!');
    } else {
      console.log(`⚠️  ${stats.unique_candidates - stats.unique_persons} FEC candidates still have multiple persons`);
    }
    
  } catch (error) {
    console.error('❌ Error fixing person mapping issues:', error);
  } finally {
    await fecCompletePool.end();
  }
}

fixPersonMappingIssues(); 