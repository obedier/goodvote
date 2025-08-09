import { executeQuery } from './database';
import { getIsraelLobbyScore } from './israel-lobby';
import { getSharedIsraelFunding } from './shared-israel-funding';

export interface HouseDistrict {
  state: string;
  district_name: string;
  incumbent_person_id: string | null;
  incumbent_name: string;
  incumbent_party: string;
  first_elected_year: number | null;
  incumbent_cash_on_hand: number | null;
  incumbent_israel_score: number | null;
  incumbent_total_israel_funding: number | null;
  challenger_count: number;
  top_challenger_name: string | null;
  top_challenger_person_id: string | null;
  top_challenger_party: string | null;
  top_challenger_cash_on_hand: number | null;
  top_challenger_israel_score: number | null;
  status: 'FILLED' | 'VACANT';
  voting: boolean;
}

// Create comprehensive Israel lobby cache table
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

// Get cached Israel lobby data or calculate and cache it
async function getCachedIsraelLobbyData(personId: string): Promise<{
  humanity_score: number;
  total_israel_funding: number;
}> {
  try {
    // Check if data exists in cache
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
      
      // Use cached data if it's less than 30 days old
      if (daysSinceCalculation < 30) {
        console.log(`Using cached Israel lobby data for ${personId} (${daysSinceCalculation.toFixed(1)} days old)`);
        return {
          humanity_score: cachedData.humanity_score,
          total_israel_funding: parseFloat(cachedData.total_israel_funding)
        };
      }
    }
    
    // Calculate new data
    console.log(`Calculating fresh Israel lobby data for ${personId}`);
    const scoreResult = await getIsraelLobbyScore(personId);
    
    const humanity_score = scoreResult.success ? scoreResult.data?.humanity_score || 0 : 0;
    const total_israel_funding = scoreResult.success ? scoreResult.data?.pro_israel_contribution_amount || 0 : 0;
    const lobby_score = scoreResult.success ? scoreResult.data?.lobby_score || 0 : 0;
    const lobby_grade = scoreResult.success ? scoreResult.data?.lobby_grade || 'F' : 'F';
    const pac_count = scoreResult.success ? scoreResult.data?.pro_israel_pac_count || 0 : 0;
    const superpac_count = scoreResult.success ? (scoreResult.data?.superpac_expenditures?.length || 0) : 0;
    
    // Cache the data
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
    
    return {
      humanity_score,
      total_israel_funding
    };
  } catch (error) {
    console.error(`Error getting Israel lobby data for ${personId}:`, error);
    return {
      humanity_score: 0,
      total_israel_funding: 0
    };
  }
}

export async function getHouseDistrictsData(cycle: string = '2024'): Promise<{ success: boolean; data?: HouseDistrict[]; error?: string }> {
  try {
    console.log('=== STARTING WORKING FINAL HOUSE DISTRICTS ===');
    
    // Ensure Israel lobby cache table exists
    await ensureIsraelLobbyCacheTable();
    
    // Get congressional districts
    const districtsQuery = `
      SELECT DISTINCT ON (state, district)
        (term->>'state') as state,
        CASE 
          WHEN term->>'type' = 'rep' THEN (term->>'district')::int
          ELSE 0
        END as district,
        official_full as representative,
        'FILLED' as status,
        true as voting,
        null as previous_representative
      FROM cng_legislators_current,
           jsonb_array_elements(terms) as term
      WHERE term->>'type' = 'rep'
        AND term->>'end' > '2024-01-01'
      ORDER BY state, district, (term->>'end') DESC
    `;
    
    const districtsResult = await executeQuery(districtsQuery, [], true);
    
    if (!districtsResult.success) {
      console.error('Failed to fetch districts:', districtsResult.error);
      return { success: false, error: 'Failed to fetch districts data' };
    }
    
    console.log(`Found ${districtsResult.data.length} districts`);
    
    const districtsWithDetails: HouseDistrict[] = [];
    
    // Process each district
    for (const district of districtsResult.data) {
      try {
        const districtName = district.district === 0 
          ? `${district.state} At-Large`
          : `${district.state} District ${district.district}`;
        
        console.log(`Processing: ${districtName} - ${district.representative}`);
        
        // For filled seats, try to find FEC data using name matching
        let incumbentPersonId = null;
        let incumbentName = district.representative;
        let incumbentParty = null;
        let firstElectedYear = null;
        let incumbentCashOnHand = null;
        let incumbentIsraelScore = null;
        let incumbentTotalIsraelFunding = null;
        
        if (district.status === 'FILLED' && district.representative !== 'VACANT') {
          console.log(`Looking for FEC match for: ${district.representative}`);
          
          // Try to find FEC match - first try the exact district, then try other districts
          let fecMatchResult = null;
          
          // First try: exact district match
          const exactDistrictQuery = `
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
          
          fecMatchResult = await executeQuery(exactDistrictQuery, [
            district.state, 
            district.district.toString(),
            district.representative
          ], true);
          
          // If no match found, try searching across all districts in the state
          if (!fecMatchResult.success || fecMatchResult.data.length === 0) {
            console.log(`No exact district match, searching across all districts for: ${district.representative}`);
            
            const allDistrictsQuery = `
              SELECT 
                pc.person_id,
                pc.display_name,
                pc.current_party,
                pc.election_year
              FROM person_candidates pc
              WHERE pc.current_office = 'H' 
                AND pc.election_year = 2024
                AND pc.state = $1
                AND (
                  LOWER(pc.display_name) LIKE CONCAT('%', LOWER(SPLIT_PART($2, ' ', -1)), '%')
                  OR LOWER(pc.display_name) LIKE CONCAT('%', LOWER($2), '%')
                  OR LOWER(REPLACE(pc.display_name, ',', ' ')) LIKE CONCAT('%', LOWER($2), '%')
                )
              ORDER BY
                CASE
                  WHEN LOWER(pc.display_name) = LOWER($2) THEN 1
                  WHEN LOWER(pc.display_name) LIKE CONCAT('%', LOWER(SPLIT_PART($2, ' ', -1)), '%') THEN 2
                  WHEN LOWER(pc.display_name) LIKE CONCAT('%', LOWER($2), '%') THEN 3
                  ELSE 4
                END,
                pc.current_party, pc.display_name
              LIMIT 1
            `;
            
            fecMatchResult = await executeQuery(allDistrictsQuery, [
              district.state,
              district.representative
            ], true);
          }
          
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
            
            // Get Israel lobby data using shared function for consistency
            const sharedFundingResult = await getSharedIsraelFunding(incumbentPersonId, cycle);
            incumbentTotalIsraelFunding = sharedFundingResult.success ? sharedFundingResult.data?.total_amount || 0 : 0;
            
            // Still use cached data for humanity score (which is more complex)
            const israelLobbyData = await getCachedIsraelLobbyData(incumbentPersonId);
            incumbentIsraelScore = israelLobbyData.humanity_score;
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
            const challengerIsraelData = await getCachedIsraelLobbyData(topChallengerPersonId);
            topChallengerIsraelScore = challengerIsraelData.humanity_score;
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
          incumbent_total_israel_funding: incumbentTotalIsraelFunding,
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
    
    console.log(`Completed processing ${districtsWithDetails.length} districts`);
    return { success: true, data: districtsWithDetails };
    
  } catch (error) {
    console.error('Error fetching house districts data:', error);
    return { success: false, error: 'Failed to fetch house districts data' };
  }
} 