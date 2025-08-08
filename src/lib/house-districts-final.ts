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
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `;
  
  await executeQuery(createTableQuery, [], true);
}

// Get cached humanity score or calculate and cache it
async function getCachedHumanityScore(personId: string): Promise<number> {
  try {
    // Check if score exists in cache
    const cacheQuery = `
      SELECT humanity_score FROM humanity_scores 
      WHERE person_id = $1
    `;
    
    const cacheResult = await executeQuery(cacheQuery, [personId], true);
    
    if (cacheResult.success && cacheResult.data.length > 0) {
      return cacheResult.data[0].humanity_score;
    }
    
    // Calculate new score
    const score = await getIsraelLobbyScore(personId);
    
    // Cache the score
    const insertQuery = `
      INSERT INTO humanity_scores (person_id, humanity_score)
      VALUES ($1, $2)
      ON CONFLICT (person_id) 
      DO UPDATE SET 
        humanity_score = EXCLUDED.humanity_score,
        updated_at = CURRENT_TIMESTAMP
    `;
    
    await executeQuery(insertQuery, [personId, score], true);
    
    return score;
  } catch (error) {
    console.error(`Error getting humanity score for ${personId}:`, error);
    return 0;
  }
}

export async function getHouseDistrictsData(): Promise<{ success: boolean; data?: HouseDistrict[]; error?: string }> {
  try {
    // Ensure humanity scores table exists
    await ensureHumanityScoresTable();
    
    // Get congressional districts (limit to 5 for testing)
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
    
    if (!districtsResult.success) {
      return { success: false, error: 'Failed to fetch districts data' };
    }
    
    const districtsWithDetails: HouseDistrict[] = [];
    
    // Process each district
    for (const district of districtsResult.data) {
      try {
        const districtName = district.district === 0 
          ? `${district.state} At-Large`
          : `${district.state} District ${district.district}`;
        
        // For filled seats, try to find FEC data using name matching
        let incumbentPersonId = null;
        let incumbentName = district.representative;
        let incumbentParty = null;
        let firstElectedYear = null;
        let incumbentCashOnHand = null;
        let incumbentIsraelScore = null;
        
        if (district.status === 'FILLED' && district.representative !== 'VACANT') {
          // Use the proven name matching query
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
          }
        }
        
        // Get challenger count and top challenger
        let challengerCount = 0;
        let topChallengerName = null;
        let topChallengerPersonId = null;
        let topChallengerParty = null;
        let topChallengerCashOnHand = null;
        let topChallengerIsraelScore = null;
        
        if (incumbentPersonId) {
          const challengersQuery = `
            SELECT 
              pc.person_id as challenger_person_id,
              pc.display_name as challenger_name,
              pc.current_party as challenger_party
            FROM person_candidates pc
            WHERE pc.current_office = 'H' 
              AND pc.election_year = 2024
              AND pc.state = $1
              AND pc.current_district = $2
              AND pc.person_id != $3
              AND pc.current_party IN ('DEM', 'REP', 'IND', 'LIB', 'GRN')
            ORDER BY 
              CASE pc.current_party 
                WHEN 'DEM' THEN 1 
                WHEN 'REP' THEN 2 
                WHEN 'IND' THEN 3 
                WHEN 'LIB' THEN 4 
                WHEN 'GRN' THEN 5 
                ELSE 6 
              END, pc.display_name
            LIMIT 1
          `;
          
          const challengersResult = await executeQuery(challengersQuery, [
            district.state, 
            district.district.toString(), 
            incumbentPersonId
          ], true);
          
          if (challengersResult.success && challengersResult.data.length > 0) {
            const topChallenger = challengersResult.data[0];
            topChallengerName = topChallenger.challenger_name;
            topChallengerPersonId = topChallenger.challenger_person_id;
            topChallengerParty = topChallenger.challenger_party;
            
            // Get challenger cash on hand
            const challengerCashQuery = `
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
            
            const challengerCashResult = await executeQuery(challengerCashQuery, [topChallengerPersonId], true);
            topChallengerCashOnHand = challengerCashResult.success && challengerCashResult.data.length > 0 
              ? challengerCashResult.data[0].cash_on_hand 
              : null;
            
            // Get challenger Israel score (cached)
            topChallengerIsraelScore = await getCachedHumanityScore(topChallengerPersonId);
          }
        }
        
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
          voting: district.voting
        });
        
      } catch (error) {
        console.error(`Error processing district ${district.state}-${district.district}:`, error);
      }
    }
    
    return { success: true, data: districtsWithDetails };
    
  } catch (error) {
    console.error('Error fetching house districts data:', error);
    return { success: false, error: 'Failed to fetch house districts data' };
  }
} 