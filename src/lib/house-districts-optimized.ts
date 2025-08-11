import { executeQuery } from './database';
import { getBulkIsraelFunding, getBulkCandidateInfo } from './bulk-israel-funding';

export interface HouseDistrict {
  state: string;
  district: number;
  district_name: string;
  incumbent_name: string;
  incumbent_party: string | null;
  incumbent_person_id: string | null;
  first_elected_year: number | null;
  incumbent_cash_on_hand: number | null;
  incumbent_israel_score: number | null;
  incumbent_total_israel_funding: number;
  challenger_count: number;
  top_challenger_name: string | null;
  top_challenger_party: string | null;
  status: string;
  voting: boolean;
}

async function getCachedIsraelLobbyData(personId: string): Promise<{
  humanity_score: number;
  total_israel_funding: number;
}> {
  try {
    const query = `
      SELECT 
        person_id, 
        humanity_score, 
        total_israel_funding 
      FROM israel_lobby_cache 
      WHERE person_id = $1
    `;
    
    const result = await executeQuery(query, [personId], true);
    
    if (result.success && result.data.length > 0) {
      const data = result.data[0];
      return {
        humanity_score: parseFloat(data.humanity_score) || 0,
        total_israel_funding: parseFloat(data.total_israel_funding) || 0
      };
    }
    
    return {
      humanity_score: 0,
      total_israel_funding: 0
    };
  } catch (error) {
    console.error(`Error fetching cached Israel lobby data for ${personId}:`, error);
    return {
      humanity_score: 0,
      total_israel_funding: 0
    };
  }
}

export async function getHouseDistrictsData(cycle: string = '2024'): Promise<{ success: boolean; data?: HouseDistrict[]; error?: string }> {
  try {
    console.log('=== STARTING OPTIMIZED HOUSE DISTRICTS ===');
    console.log(`Fetching data for cycle: ${cycle}`);
    
    // Step 1: Get all districts and their representatives in one query
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
    
    // Step 2: Get all FEC matches for ALL representatives in bulk
    const representativeNames = districtsResult.data
      .filter(d => d.status === 'FILLED' && d.representative !== 'VACANT')
      .map(d => ({ name: d.representative, state: d.state, district: d.district }));
    
    console.log(`Looking for FEC matches for ${representativeNames.length} representatives`);
    
    // Build a bulk query to find all FEC matches at once using a safer approach
    const fecMatchesMap = new Map();
    
    if (representativeNames.length > 0) {
      // Use a more efficient approach with arrays and ANY operator
      const states = representativeNames.map(r => r.state);
      const districts = representativeNames.map(r => r.district.toString());
      const names = representativeNames.map(r => r.name);
      
      // Simpler bulk query using arrays - much safer and faster
      const bulkFecQuery = `
        WITH reps AS (
          SELECT 
            unnest($1::text[]) as state,
            unnest($2::text[]) as district,
            unnest($3::text[]) as rep_name
        ),
        matches AS (
          SELECT DISTINCT ON (r.state, r.district)
            r.state as lookup_state,
            r.district as lookup_district,
            r.rep_name as lookup_name,
            pc.person_id,
            pc.display_name,
            pc.current_party,
            pc.election_year,
            CASE
              WHEN LOWER(pc.display_name) = LOWER(r.rep_name) THEN 1
              WHEN LOWER(pc.display_name) LIKE '%' || LOWER(SPLIT_PART(r.rep_name, ' ', -1)) || '%' THEN 2
              WHEN LOWER(pc.display_name) LIKE '%' || LOWER(r.rep_name) || '%' THEN 3
              WHEN LOWER(REPLACE(pc.display_name, ',', ' ')) LIKE '%' || LOWER(r.rep_name) || '%' THEN 4
              ELSE 5
            END as match_quality
          FROM reps r
          JOIN person_candidates pc ON 
            pc.current_office = 'H' 
            AND pc.election_year = $4
            AND pc.state = r.state
            AND pc.current_district = r.district
          WHERE (
            LOWER(pc.display_name) LIKE '%' || LOWER(SPLIT_PART(r.rep_name, ' ', -1)) || '%'
            OR LOWER(pc.display_name) LIKE '%' || LOWER(r.rep_name) || '%'
            OR LOWER(REPLACE(pc.display_name, ',', ' ')) LIKE '%' || LOWER(r.rep_name) || '%'
          )
          ORDER BY r.state, r.district, match_quality, pc.current_party, pc.display_name
        )
        SELECT * FROM matches
      `;
      
      const fecMatchesResult = await executeQuery(bulkFecQuery, [
        states,
        districts, 
        names,
        parseInt(cycle)
      ], true);
      
      if (fecMatchesResult.success) {
        fecMatchesResult.data.forEach((match: any) => {
          const key = `${match.lookup_state}-${match.lookup_district}`;
          fecMatchesMap.set(key, match);
        });
        console.log(`Found ${fecMatchesResult.data.length} FEC matches out of ${representativeNames.length} representatives`);
      } else {
        console.error('FEC bulk query failed:', fecMatchesResult.error);
      }
    }
    
    // Step 3: Get all person IDs for bulk funding queries
    const personIds = Array.from(fecMatchesMap.values()).map((match: any) => match.person_id);
    
    console.log(`Fetching bulk funding data for ${personIds.length} candidates`);
    
    // Step 4: Bulk fetch Israel funding data
    const bulkFundingResult = await getBulkIsraelFunding(personIds, cycle);
    const fundingMap = bulkFundingResult.success ? bulkFundingResult.data : new Map();
    
    // Step 5: Bulk fetch candidate info
    const bulkCandidateResult = await getBulkCandidateInfo(personIds, cycle);
    const candidateInfoMap = bulkCandidateResult.success ? bulkCandidateResult.data : new Map();
    
    // Step 6: Build final districts array
    const districtsWithDetails: HouseDistrict[] = [];
    
    for (const district of districtsResult.data) {
      const districtName = district.district === 0 
        ? `${district.state} At-Large`
        : `${district.state} District ${district.district}`;
      
      const districtKey = `${district.state}-${district.district}`;
      const fecMatch = fecMatchesMap.get(districtKey);
      
      let incumbentPersonId = null;
      let incumbentName = district.representative;
      let incumbentParty = null;
      let firstElectedYear = null;
      let incumbentCashOnHand = null;
      let incumbentTotalIsraelFunding = 0;
      let incumbentIsraelScore = null;
      
      if (fecMatch) {
        incumbentPersonId = fecMatch.person_id;
        incumbentName = fecMatch.display_name;
        incumbentParty = fecMatch.current_party;
        
        // Get data from bulk results
        const candidateInfo = candidateInfoMap?.get(incumbentPersonId);
        if (candidateInfo) {
          firstElectedYear = candidateInfo.first_elected_year;
          incumbentCashOnHand = candidateInfo.cash_on_hand;
        }
        
        // Get funding from bulk results
        incumbentTotalIsraelFunding = fundingMap?.get(incumbentPersonId) || 0;
        
        // Get humanity score from candidate info (already fetched in bulk)
        if (candidateInfo) {
          incumbentIsraelScore = candidateInfo.israel_score;
        }
      }
      
      // For now, set challenger data to defaults (could be optimized separately)
      const challengerCount = 0;
      const topChallengerName = null;
      const topChallengerParty = null;
      
      districtsWithDetails.push({
        state: district.state,
        district: district.district,
        district_name: districtName,
        incumbent_name: incumbentName,
        incumbent_party: incumbentParty,
        incumbent_person_id: incumbentPersonId,
        first_elected_year: firstElectedYear,
        incumbent_cash_on_hand: incumbentCashOnHand,
        incumbent_israel_score: incumbentIsraelScore,
        incumbent_total_israel_funding: incumbentTotalIsraelFunding,
        challenger_count: challengerCount,
        top_challenger_name: topChallengerName,
        top_challenger_party: topChallengerParty,
        status: district.status,
        voting: district.voting
      });
    }
    
    console.log(`=== COMPLETED OPTIMIZED HOUSE DISTRICTS: ${districtsWithDetails.length} districts ===`);
    
    return { success: true, data: districtsWithDetails };
    
  } catch (error) {
    console.error('Error in optimized getHouseDistrictsData:', error);
    return { success: false, error: 'Failed to fetch house districts data' };
  }
}
