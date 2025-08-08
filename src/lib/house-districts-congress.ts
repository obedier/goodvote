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
  bioguide_id: string | null;
}

// Simple in-memory cache for humanity scores
const humanityScoreCache = new Map<string, { score: number; timestamp: number }>();
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

async function getCachedHumanityScore(personId: string): Promise<number> {
  const now = Date.now();
  const cached = humanityScoreCache.get(personId);
  
  if (cached && (now - cached.timestamp) < CACHE_DURATION) {
    return cached.score;
  }
  
  try {
    const result = await getIsraelLobbyScore(personId);
    const score = result.success ? result.data.humanity_score : 0;
    
    // Cache the result
    humanityScoreCache.set(personId, { score, timestamp: now });
    
    return score;
  } catch (error) {
    console.error(`Error getting humanity score for ${personId}:`, error);
    return 0;
  }
}

export async function getHouseDistrictsData(): Promise<{ success: boolean; data?: HouseDistrict[]; error?: string }> {
  try {
    console.log('Starting house districts data fetch using congressional data...');
    
    // Get all House districts from the authoritative congressional data with bioguide_id
    const districtsQuery = `
      SELECT 
        dm.state,
        dm.district,
        dm.representative,
        dm.status,
        dm.voting,
        dm.previous_representative,
        lc.bioguide_id,
        lc.official_full,
        lc.first_name,
        lc.last_name
      FROM cng_district_mapping dm
      LEFT JOIN cng_legislators_current lc ON 
        lc.bioguide_id IN (
          SELECT bioguide_id 
          FROM cng_legislators_current,
          LATERAL jsonb_array_elements(terms) AS t
          WHERE t->>'type' = 'rep'
            AND t->>'state' = dm.state
            AND t->>'district' = dm.district::text
            AND (t->>'end')::date >= CURRENT_DATE
        )
      WHERE dm.district > 0  -- Exclude Senate seats
      ORDER BY dm.state, dm.district
    `;
    
    const districtsResult = await executeQuery(districtsQuery, [], true);
    
    if (!districtsResult.success) {
      console.error('Failed to fetch districts:', districtsResult.error);
      return { success: false, error: 'Failed to fetch districts data' };
    }
    
    console.log(`Found ${districtsResult.data.length} House districts`);
    
    const districtsWithDetails: HouseDistrict[] = [];
    
    // Process each district
    for (const district of districtsResult.data) {
      try {
        const districtName = district.district === 0 
          ? `${district.state} At-Large`
          : `${district.state} District ${district.district}`;
        
        // For filled seats, try to find FEC data using bioguide_id
        let incumbentPersonId = null;
        let incumbentName = district.representative;
        let incumbentParty = null;
        let firstElectedYear = null;
        let incumbentCashOnHand = null;
        let incumbentIsraelScore = null;
        
        if (district.status === 'FILLED' && district.representative !== 'VACANT' && district.bioguide_id) {
          console.log(`Looking for FEC match for: ${district.representative} (${district.state}-${district.district}) with bioguide_id: ${district.bioguide_id}`);
          
          // Try to find matching FEC data using bioguide_id (if available) or name matching as fallback
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
                LOWER(pc.display_name) LIKE CONCAT('%', LOWER($3), '%')
                OR LOWER(pc.display_name) LIKE CONCAT('%', LOWER(SPLIT_PART($4, ' ', -1)), '%')
              )
            ORDER BY pc.current_party, pc.display_name
            LIMIT 1
          `;
          
          const fecMatchResult = await executeQuery(fecMatchQuery, [
            district.state, 
            district.district.toString(), 
            district.bioguide_id || '',
            district.representative
          ], true);
          
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
        
        // Get challengers for this district (only for filled seats)
        let challengerCount = 0;
        let topChallengerName = null;
        let topChallengerPersonId = null;
        let topChallengerParty = null;
        let topChallengerCashOnHand = null;
        let topChallengerIsraelScore = null;
        
        if (district.status === 'FILLED') {
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
          `;
          
          const challengersResult = await executeQuery(challengersQuery, [
            district.state, 
            district.district.toString(), 
            incumbentPersonId || 'NULL'
          ], true);
          
          const challengers = challengersResult.success ? challengersResult.data : [];
          challengerCount = challengers.length;
          
          if (challengers.length > 0) {
            const topChallenger = challengers[0];
            topChallengerName = topChallenger.challenger_name;
            topChallengerPersonId = topChallenger.challenger_person_id;
            topChallengerParty = topChallenger.challenger_party;
            
            // Get top challenger's cash on hand
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
            
            // Get top challenger's Israel score (cached)
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
          voting: district.voting,
          bioguide_id: district.bioguide_id
        });
        
      } catch (error) {
        console.error(`Error processing district ${district.state}-${district.district}:`, error);
      }
    }
    
    console.log(`Successfully processed ${districtsWithDetails.length} districts`);
    return { success: true, data: districtsWithDetails };
    
  } catch (error) {
    console.error('Error in getHouseDistrictsData:', error);
    return { success: false, error: 'Internal server error' };
  }
} 