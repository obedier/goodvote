const { executeQuery } = require('../src/lib/database');
const { getIsraelLobbyScore } = require('../src/lib/israel-lobby');

async function ensureIsraelLobbyCacheTable() {
  try {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS israel_lobby_cache (
        person_id VARCHAR(20) PRIMARY KEY,
        humanity_score INTEGER NOT NULL,
        total_israel_funding DECIMAL(15,2) NOT NULL,
        lobby_score INTEGER,
        lobby_grade VARCHAR(5),
        pac_count INTEGER,
        superpac_count INTEGER,
        last_calculated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    await executeQuery(createTableQuery, [], true);
    console.log('Israel lobby cache table ensured');
  } catch (error) {
    console.error('Error creating Israel lobby cache table:', error);
  }
}

async function populateIsraelCache() {
  try {
    console.log('Starting Israel lobby cache population...');
    
    // Ensure cache table exists
    await ensureIsraelLobbyCacheTable();
    
    // Get all current House representatives
    const districtsQuery = `
      SELECT DISTINCT ON (state, district)
        (term->>'state') as state,
        CASE 
          WHEN term->>'type' = 'rep' THEN (term->>'district')::int
          ELSE 0
        END as district,
        official_full as representative
      FROM cng_legislators_current,
           jsonb_array_elements(terms) as term
      WHERE term->>'type' = 'rep'
        AND term->>'end' > '2024-01-01'
      ORDER BY state, district, (term->>'end') DESC
    `;
    
    const districtsResult = await executeQuery(districtsQuery, [], true);
    
    if (!districtsResult.success) {
      console.error('Failed to fetch districts:', districtsResult.error);
      return;
    }
    
    console.log(`Found ${districtsResult.data.length} districts to process`);
    
    let processedCount = 0;
    let cachedCount = 0;
    let calculatedCount = 0;
    
    for (const district of districtsResult.data) {
      try {
        // Find FEC match for this representative
        const fecMatchQuery = `
          SELECT 
            pc.person_id,
            pc.display_name,
            pc.current_party,
            pc.election_year
          FROM person_candidates pc
          WHERE pc.current_office = 'H' 
            AND pc.election_year = 2024
            AND pc.state = $1
            AND pc.current_district = $2
            AND (
              LOWER(pc.display_name) LIKE CONCAT('%', LOWER(SPLIT_PART($3, ' ', -1)), '%')
              OR LOWER(pc.display_name) LIKE CONCAT('%', LOWER($3), '%')
              OR LOWER(REPLACE(pc.display_name, ',', ' ')) LIKE CONCAT('%', LOWER($3), '%')
            )
          ORDER BY
            CASE
              WHEN LOWER(pc.display_name) = LOWER($3) THEN 1
              WHEN LOWER(pc.display_name) LIKE CONCAT('%', LOWER(SPLIT_PART($3, ' ', -1)), '%') THEN 2
              WHEN LOWER(pc.display_name) LIKE CONCAT('%', LOWER($3), '%') THEN 3
              ELSE 4
            END,
            pc.current_party, pc.display_name
          LIMIT 1
        `;
        
        const fecMatchResult = await executeQuery(fecMatchQuery, [
          district.state, 
          district.district.toString(),
          district.representative
        ], true);
        
        if (fecMatchResult.success && fecMatchResult.data.length > 0) {
          const fecData = fecMatchResult.data[0];
          const personId = fecData.person_id;
          
          // Check if already cached
          const cacheQuery = `
            SELECT humanity_score, total_israel_funding, last_calculated 
            FROM israel_lobby_cache 
            WHERE person_id = $1
          `;
          
          const cacheResult = await executeQuery(cacheQuery, [personId], true);
          
          if (cacheResult.success && cacheResult.data.length > 0) {
            const cachedData = cacheResult.data[0];
            const lastCalculated = new Date(cachedData.last_calculated);
            const now = new Date();
            const daysSinceCalculation = (now.getTime() - lastCalculated.getTime()) / (1000 * 60 * 60 * 24);
            
            if (daysSinceCalculation < 30) {
              console.log(`✓ Cached: ${district.representative} (${personId}) - ${daysSinceCalculation.toFixed(1)} days old`);
              cachedCount++;
            } else {
              console.log(`🔄 Recalculating: ${district.representative} (${personId}) - ${daysSinceCalculation.toFixed(1)} days old`);
              await calculateAndCacheIsraelData(personId, district.representative);
              calculatedCount++;
            }
          } else {
            console.log(`🆕 Calculating: ${district.representative} (${personId})`);
            await calculateAndCacheIsraelData(personId, district.representative);
            calculatedCount++;
          }
          
          processedCount++;
          
          // Add delay to avoid overwhelming the system
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      } catch (error) {
        console.error(`Error processing ${district.representative}:`, error);
      }
    }
    
    console.log(`\nCache population completed!`);
    console.log(`Total processed: ${processedCount}`);
    console.log(`Already cached: ${cachedCount}`);
    console.log(`Newly calculated: ${calculatedCount}`);
    
  } catch (error) {
    console.error('Error populating Israel cache:', error);
  }
}

async function calculateAndCacheIsraelData(personId, representativeName) {
  try {
    const scoreResult = await getIsraelLobbyScore(personId);
    
    const humanity_score = scoreResult.success ? scoreResult.data?.humanity_score || 0 : 0;
    const total_israel_funding = scoreResult.success ? scoreResult.data?.pro_israel_contribution_amount || 0 : 0;
    const lobby_score = scoreResult.success ? scoreResult.data?.lobby_score || 0 : 0;
    const lobby_grade = scoreResult.success ? scoreResult.data?.lobby_grade || 'F' : 'F';
    const pac_count = scoreResult.success ? scoreResult.data?.pro_israel_pac_count || 0 : 0;
    const superpac_count = scoreResult.success ? (scoreResult.data?.superpac_expenditures?.length || 0) : 0;
    
    const insertQuery = `
      INSERT INTO israel_lobby_cache (
        person_id, humanity_score, total_israel_funding, lobby_score, 
        lobby_grade, pac_count, superpac_count, last_calculated
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
      ON CONFLICT (person_id) 
      DO UPDATE SET 
        humanity_score = EXCLUDED.humanity_score,
        total_israel_funding = EXCLUDED.total_israel_funding,
        lobby_score = EXCLUDED.lobby_score,
        lobby_grade = EXCLUDED.lobby_grade,
        pac_count = EXCLUDED.pac_count,
        superpac_count = EXCLUDED.superpac_count,
        last_calculated = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
    `;
    
    await executeQuery(insertQuery, [
      personId, humanity_score, total_israel_funding, lobby_score, 
      lobby_grade, pac_count, superpac_count
    ], true);
    
    console.log(`  ✓ Cached: ${representativeName} - Score: ${humanity_score}, Funding: $${total_israel_funding.toLocaleString()}`);
    
  } catch (error) {
    console.error(`  ✗ Error caching ${representativeName}:`, error);
  }
}

// Run the population script
if (require.main === module) {
  populateIsraelCache()
    .then(() => {
      console.log('Cache population script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Cache population script failed:', error);
      process.exit(1);
    });
}

module.exports = { populateIsraelCache }; 