import { executeQuery } from './database';
import { getIsraelLobbyScore } from './israel-lobby';

export interface HouseDistrict {
  state: string;
  district_name: string;
  incumbent_person_id: string | null;
  incumbent_name: string;
  incumbent_party: string;
  first_elected_year: number | null;
  incumbent_cash_on_hand: number | null;
  incumbent_israel_score: number | null;
  challenger_count: number;
  top_challenger_name: string | null;
  top_challenger_person_id: string | null;
  top_challenger_party: string | null;
  top_challenger_cash_on_hand: number | null;
  top_challenger_israel_score: number | null;
  status: 'FILLED' | 'VACANT';
  voting: boolean;
}

// Create humanity scores table if it doesn't exist
async function ensureHumanityScoresTable() {
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS humanity_scores (
      person_id VARCHAR(20) PRIMARY KEY,
      humanity_score INTEGER NOT NULL,
      last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      data_source VARCHAR(50) DEFAULT 'israel_lobby_api',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;
  
  await executeQuery(createTableQuery, [], false);
  console.log('Humanity scores table ensured');
}

async function getCachedHumanityScore(personId: string): Promise<number> {
  try {
    // Check if we have a recent cached score (within 24 hours)
    const cacheQuery = `
      SELECT humanity_score, last_updated 
      FROM humanity_scores 
      WHERE person_id = $1 
        AND last_updated > NOW() - INTERVAL '24 hours'
      ORDER BY last_updated DESC 
      LIMIT 1
    `;
    
    const cacheResult = await executeQuery(cacheQuery, [personId], false);
    
    if (cacheResult.success && cacheResult.data && cacheResult.data.length > 0) {
      console.log(`Using cached humanity score for ${personId}: ${cacheResult.data[0].humanity_score}`);
      return cacheResult.data[0].humanity_score;
    }
    
    // If not cached, calculate and store
    const result = await getIsraelLobbyScore(personId);
    const score = result.success ? result.data.humanity_score : 0;
    
    // Store the result
    const insertQuery = `
      INSERT INTO humanity_scores (person_id, humanity_score, last_updated, data_source)
      VALUES ($1, $2, NOW(), 'israel_lobby_api')
      ON CONFLICT (person_id) 
      DO UPDATE SET 
        humanity_score = EXCLUDED.humanity_score,
        last_updated = EXCLUDED.last_updated,
        data_source = EXCLUDED.data_source
    `;
    
    await executeQuery(insertQuery, [personId, score], false);
    console.log(`Calculated and stored humanity score for ${personId}: ${score}`);
    
    return score;
  } catch (error) {
    console.error(`Error getting humanity score for ${personId}:`, error);
    return 0;
  }
}

export async function getHouseDistrictsData(): Promise<{ success: boolean; data?: HouseDistrict[]; error?: string }> {
  try {
    console.log('=== STARTING HOUSE DISTRICTS TEST ===');
    console.log('Starting house districts test with congressional data...');
    
    // Ensure humanity scores table exists
    await ensureHumanityScoresTable();
    
    // Test congressional data access first
    const testQuery = `
      SELECT COUNT(*) as count FROM cng_district_mapping
    `;
    
    const testResult = await executeQuery(testQuery, [], true);
    
    if (!testResult.success) {
      console.error('Congressional data not accessible:', testResult.error);
      return { success: false, error: 'Congressional data not accessible' };
    }
    
    console.log(`Congressional data accessible. Found ${testResult.data[0].count} districts`);
    
    // Get just a few districts for testing (limit to 5)
    const districtsQuery = `
      SELECT DISTINCT
        dm.state,
        dm.district,
        dm.representative,
        dm.status,
        dm.voting,
        dm.previous_representative
      FROM cng_district_mapping dm
      WHERE dm.district > 0  -- Exclude Senate seats
      ORDER BY dm.state, dm.district
      LIMIT 5
    `;
    
    const districtsResult = await executeQuery(districtsQuery, [], true);
    
    console.log('Districts query result:', districtsResult);
    
    if (!districtsResult.success) {
      console.error('Failed to fetch districts:', districtsResult.error);
      return { success: false, error: 'Failed to fetch districts data' };
    }
    
    console.log(`Found ${districtsResult.data.length} test districts`);
    
    const districtsWithDetails: HouseDistrict[] = [];
    
    // Process each district
    for (const district of districtsResult.data) {
      try {
        const districtName = district.district === 0 
          ? `${district.state} At-Large`
          : `${district.state} District ${district.district}`;
        
        console.log(`Processing: ${districtName} - ${district.representative} (${district.bioguide_id})`);
        
        // For filled seats, try to find FEC data using bioguide_id
        let incumbentPersonId = null;
        let incumbentName = district.representative;
        let incumbentParty = null;
        let firstElectedYear = null;
        let incumbentCashOnHand = null;
        let incumbentIsraelScore = null;
        
        console.log(`Processing district: ${district.state}-${district.district}, status: ${district.status}, representative: ${district.representative}`);
        
        if (district.status === 'FILLED' && district.representative !== 'VACANT') {
          console.log(`Looking for FEC match for: ${district.representative} (${district.state}-${district.district})`);
          
          // Try to find matching FEC data using name matching
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
                -- Try to match by last name from congressional data
                LOWER(pc.display_name) LIKE CONCAT('%', LOWER(SPLIT_PART($3, ' ', -1)), '%')
                OR LOWER(pc.display_name) LIKE CONCAT('%', LOWER($3), '%')
                OR LOWER(REPLACE(pc.display_name, ',', ' ')) LIKE CONCAT('%', LOWER($3), '%')
                -- Handle cases where FEC has full name but congressional has partial
                OR LOWER(pc.display_name) LIKE CONCAT('%', LOWER($3), '%')
                -- Handle cases where congressional name is part of FEC name
                OR LOWER($3) LIKE CONCAT('%', SPLIT_PART(LOWER(pc.display_name), ' ', 2), '%')
                -- Handle cases where FEC has "LAST, FIRST" format
                OR LOWER(SPLIT_PART(pc.display_name, ',', 1)) LIKE CONCAT('%', LOWER(SPLIT_PART($3, ' ', -1)), '%')
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
          
          console.log(`FEC match result for ${district.representative}:`, fecMatchResult);
          
          if (fecMatchResult.success && fecMatchResult.data.length > 0) {
            const fecData = fecMatchResult.data[0];
            console.log(`Found FEC match: ${fecData.display_name} (${fecData.person_id})`);
            incumbentPersonId = fecData.person_id;
            incumbentName = fecData.display_name;
            incumbentParty = fecData.current_party;
            
            // Get first elected year
            const firstElectedQuery = `
              SELECT MIN(election_year) as first_elected_year
              FROM person_candidates 
              WHERE person_id = $1 AND current_office = 'H'
            `;
            
            const firstElectedResult = await executeQuery(firstElectedQuery, [incumbentPersonId], true);
            firstElectedYear = firstElectedResult.success && firstElectedResult.data.length > 0 
              ? firstElectedResult.data[0].first_elected_year 
              : null;
            
            // Get cash on hand
            const cashOnHandQuery = `
              SELECT 
                COALESCE(cs.coh_cop, 0) as cash_on_hand
              FROM candidate_summary cs
              JOIN person_candidates pc ON cs.cand_id = pc.cand_id AND cs.file_year = pc.election_year
              WHERE pc.person_id = $1 
                AND pc.current_office = 'H' 
                AND pc.election_year = 2024
              ORDER BY cs.file_year DESC
              LIMIT 1
            `;
            
            const cashOnHandResult = await executeQuery(cashOnHandQuery, [incumbentPersonId], true);
            incumbentCashOnHand = cashOnHandResult.success && cashOnHandResult.data.length > 0 
              ? cashOnHandResult.data[0].cash_on_hand 
              : null;
            
            // Get Israel score (cached)
            incumbentIsraelScore = await getCachedHumanityScore(incumbentPersonId);
          } else {
            console.log(`No FEC match found for bioguide_id: ${district.bioguide_id}`);
          }
        }
        
        // Simplified challenger logic for testing
        let challengerCount = 0;
        let topChallengerName = null;
        let topChallengerPersonId = null;
        let topChallengerParty = null;
        let topChallengerCashOnHand = null;
        let topChallengerIsraelScore = null;
        
        districtsWithDetails.push({
          state: district.state,
          district_name: districtName,
          incumbent_person_id: incumbentPersonId,
          incumbent_name: incumbentName,
          incumbent_party: incumbentParty,
          first_elected_year: firstElectedYear,
          incumbent_cash_on_hand: incumbentCashOnHand,
          incumbent_israel_score: incumbentIsraelScore,
          challenger_count: challengerCount,
          top_challenger_name: topChallengerName,
          top_challenger_person_id: topChallengerPersonId,
          top_challenger_party: topChallengerParty,
          top_challenger_cash_on_hand: topChallengerCashOnHand,
          top_challenger_israel_score: topChallengerIsraelScore,
          status: district.status,
          voting: district.voting,
          bioguide_id: district.bioguide_id
        });
        
      } catch (error) {
        console.error(`Error processing district ${district.state}-${district.district}:`, error);
      }
    }
    
    console.log(`Successfully processed ${districtsWithDetails.length} test districts`);
    return { success: true, data: districtsWithDetails };
    
  } catch (error) {
    console.error('Error in getHouseDistrictsData:', error);
    return { success: false, error: 'Internal server error' };
  }
} 