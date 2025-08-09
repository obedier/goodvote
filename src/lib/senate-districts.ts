import { executeQuery } from './database';
import { getBulkIsraelFunding, getBulkCandidateInfo } from './bulk-israel-funding';

export interface SenateDistrict {
  state: string;
  state_name: string;
  senator1_name: string;
  senator1_party: string | null;
  senator1_person_id: string | null;
  senator1_first_elected_year: number | null;
  senator1_cash_on_hand: number | null;
  senator1_israel_score: number | null;
  senator1_total_israel_funding: number;
  senator1_term_end: string | null;
  senator2_name: string;
  senator2_party: string | null;
  senator2_person_id: string | null;
  senator2_first_elected_year: number | null;
  senator2_cash_on_hand: number | null;
  senator2_israel_score: number | null;
  senator2_total_israel_funding: number;
  senator2_term_end: string | null;
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

export async function getSenateDistrictsData(cycle: string = '2024'): Promise<{ success: boolean; data?: SenateDistrict[]; error?: string }> {
  try {
    console.log('=== STARTING SENATE DISTRICTS DATA FETCH ===');
    console.log(`Fetching data for cycle: ${cycle}`);
    
    // Get all senators from congressional data
    const senatorsQuery = `
      SELECT DISTINCT ON (lc.state)
        lc.state,
        lc.state_name,
        -- Senator 1 (most recent term start)
        (
          SELECT lc1.official_full 
          FROM cng_legislators_current lc1,
               jsonb_array_elements(lc1.terms) as term1
          WHERE lc1.state = lc.state
            AND term1->>'type' = 'sen'
            AND term1->>'end' > '2024-01-01'
          ORDER BY (term1->>'start')::date DESC
          LIMIT 1
        ) as senator1_name,
        (
          SELECT (term1->>'start')::date
          FROM cng_legislators_current lc1,
               jsonb_array_elements(lc1.terms) as term1
          WHERE lc1.state = lc.state
            AND term1->>'type' = 'sen'
            AND term1->>'end' > '2024-01-01'
          ORDER BY (term1->>'start')::date DESC
          LIMIT 1
        ) as senator1_term_start,
        (
          SELECT (term1->>'end')::date
          FROM cng_legislators_current lc1,
               jsonb_array_elements(lc1.terms) as term1
          WHERE lc1.state = lc.state
            AND term1->>'type' = 'sen'
            AND term1->>'end' > '2024-01-01'
          ORDER BY (term1->>'start')::date DESC
          LIMIT 1
        ) as senator1_term_end,
        -- Senator 2 (second most recent term start)
        (
          SELECT lc2.official_full 
          FROM cng_legislators_current lc2,
               jsonb_array_elements(lc2.terms) as term2
          WHERE lc2.state = lc.state
            AND term2->>'type' = 'sen'
            AND term2->>'end' > '2024-01-01'
          ORDER BY (term2->>'start')::date DESC
          OFFSET 1
          LIMIT 1
        ) as senator2_name,
        (
          SELECT (term2->>'start')::date
          FROM cng_legislators_current lc2,
               jsonb_array_elements(lc2.terms) as term2
          WHERE lc2.state = lc.state
            AND term2->>'type' = 'sen'
            AND term2->>'end' > '2024-01-01'
          ORDER BY (term2->>'start')::date DESC
          OFFSET 1
          LIMIT 1
        ) as senator2_term_start,
        (
          SELECT (term2->>'end')::date
          FROM cng_legislators_current lc2,
               jsonb_array_elements(lc2.terms) as term2
          WHERE lc2.state = lc.state
            AND term2->>'type' = 'sen'
            AND term2->>'end' > '2024-01-01'
          ORDER BY (term2->>'start')::date DESC
          OFFSET 1
          LIMIT 1
        ) as senator2_term_end
      FROM cng_legislators_current lc,
           jsonb_array_elements(lc.terms) as term
      WHERE term->>'type' = 'sen'
        AND term->>'end' > '2024-01-01'
      ORDER BY lc.state
    `;
    
    const senatorsResult = await executeQuery(senatorsQuery, [], true);
    
    if (!senatorsResult.success) {
      console.error('Failed to fetch senators:', senatorsResult.error);
      return { success: false, error: 'Failed to fetch senators data' };
    }
    
    console.log(`Found ${senatorsResult.data.length} states with senators`);
    
    // Get all senator names for FEC matching
    const allSenatorNames = [];
    senatorsResult.data.forEach((state: any) => {
      if (state.senator1_name) {
        allSenatorNames.push({ name: state.senator1_name, state: state.state, position: 1 });
      }
      if (state.senator2_name) {
        allSenatorNames.push({ name: state.senator2_name, state: state.state, position: 2 });
      }
    });
    
    console.log(`Looking for FEC matches for ${allSenatorNames.length} senators`);
    
    // Bulk FEC matching for senators
    const fecMatchesMap = new Map();
    
    if (allSenatorNames.length > 0) {
      const states = allSenatorNames.map(s => s.state);
      const names = allSenatorNames.map(s => s.name);
      const positions = allSenatorNames.map(s => s.position);
      
      const bulkFecQuery = `
        WITH sens AS (
          SELECT 
            unnest($1::text[]) as state,
            unnest($2::text[]) as sen_name,
            unnest($3::int[]) as position
        ),
        matches AS (
          SELECT DISTINCT ON (s.state, s.position)
            s.state as lookup_state,
            s.position as lookup_position,
            s.sen_name as lookup_name,
            pc.person_id,
            pc.display_name,
            pc.current_party,
            pc.election_year,
            CASE
              WHEN LOWER(pc.display_name) = LOWER(s.sen_name) THEN 1
              WHEN LOWER(pc.display_name) LIKE '%' || LOWER(SPLIT_PART(s.sen_name, ' ', -1)) || '%' THEN 2
              WHEN LOWER(pc.display_name) LIKE '%' || LOWER(s.sen_name) || '%' THEN 3
              WHEN LOWER(REPLACE(pc.display_name, ',', ' ')) LIKE '%' || LOWER(s.sen_name) || '%' THEN 4
              ELSE 5
            END as match_quality
          FROM sens s
          JOIN person_candidates pc ON 
            pc.current_office = 'S' 
            AND pc.election_year = $4
            AND pc.state = s.state
          WHERE (
            LOWER(pc.display_name) LIKE '%' || LOWER(SPLIT_PART(s.sen_name, ' ', -1)) || '%'
            OR LOWER(pc.display_name) LIKE '%' || LOWER(s.sen_name) || '%'
            OR LOWER(REPLACE(pc.display_name, ',', ' ')) LIKE '%' || LOWER(s.sen_name) || '%'
          )
          ORDER BY s.state, s.position, match_quality, pc.current_party, pc.display_name
        )
        SELECT * FROM matches
      `;
      
      const fecMatchesResult = await executeQuery(bulkFecQuery, [
        states,
        names,
        positions,
        parseInt(cycle)
      ], true);
      
      if (fecMatchesResult.success) {
        fecMatchesResult.data.forEach((match: any) => {
          const key = `${match.lookup_state}-${match.lookup_position}`;
          fecMatchesMap.set(key, match);
        });
        console.log(`Found ${fecMatchesResult.data.length} FEC matches out of ${allSenatorNames.length} senators`);
      } else {
        console.error('Senate FEC bulk query failed:', fecMatchesResult.error);
      }
    }
    
    // Get all person IDs for bulk funding queries
    const personIds = Array.from(fecMatchesMap.values()).map((match: any) => match.person_id);
    
    console.log(`Fetching bulk funding data for ${personIds.length} senators`);
    
    // Bulk fetch Israel funding data
    const bulkFundingResult = await getBulkIsraelFunding(personIds, cycle);
    const fundingMap = bulkFundingResult.success ? bulkFundingResult.data : new Map();
    
    // Bulk fetch candidate info
    const bulkCandidateResult = await getBulkCandidateInfo(personIds, cycle);
    const candidateInfoMap = bulkCandidateResult.success ? bulkCandidateResult.data : new Map();
    
    // Build final senate districts array
    const senateDistricts: SenateDistrict[] = [];
    
    for (const stateData of senatorsResult.data) {
      // Senator 1 data
      const senator1Key = `${stateData.state}-1`;
      const senator1Match = fecMatchesMap.get(senator1Key);
      
      let senator1PersonId = null;
      let senator1Party = null;
      let senator1FirstElectedYear = null;
      let senator1CashOnHand = null;
      let senator1TotalIsraelFunding = 0;
      let senator1IsraelScore = null;
      
      if (senator1Match) {
        senator1PersonId = senator1Match.person_id;
        senator1Party = senator1Match.current_party;
        
        const candidateInfo = candidateInfoMap?.get(senator1PersonId);
        if (candidateInfo) {
          senator1FirstElectedYear = candidateInfo.first_elected_year;
          senator1CashOnHand = candidateInfo.cash_on_hand;
        }
        
        senator1TotalIsraelFunding = fundingMap?.get(senator1PersonId) || 0;
        
        const israelLobbyData = await getCachedIsraelLobbyData(senator1PersonId);
        senator1IsraelScore = israelLobbyData.humanity_score;
      }
      
      // Senator 2 data
      const senator2Key = `${stateData.state}-2`;
      const senator2Match = fecMatchesMap.get(senator2Key);
      
      let senator2PersonId = null;
      let senator2Party = null;
      let senator2FirstElectedYear = null;
      let senator2CashOnHand = null;
      let senator2TotalIsraelFunding = 0;
      let senator2IsraelScore = null;
      
      if (senator2Match) {
        senator2PersonId = senator2Match.person_id;
        senator2Party = senator2Match.current_party;
        
        const candidateInfo = candidateInfoMap?.get(senator2PersonId);
        if (candidateInfo) {
          senator2FirstElectedYear = candidateInfo.first_elected_year;
          senator2CashOnHand = candidateInfo.cash_on_hand;
        }
        
        senator2TotalIsraelFunding = fundingMap?.get(senator2PersonId) || 0;
        
        const israelLobbyData = await getCachedIsraelLobbyData(senator2PersonId);
        senator2IsraelScore = israelLobbyData.humanity_score;
      }
      
      senateDistricts.push({
        state: stateData.state,
        state_name: stateData.state_name || stateData.state,
        senator1_name: stateData.senator1_name || 'Unknown',
        senator1_party: senator1Party,
        senator1_person_id: senator1PersonId,
        senator1_first_elected_year: senator1FirstElectedYear,
        senator1_cash_on_hand: senator1CashOnHand,
        senator1_israel_score: senator1IsraelScore,
        senator1_total_israel_funding: senator1TotalIsraelFunding,
        senator1_term_end: stateData.senator1_term_end,
        senator2_name: stateData.senator2_name || 'Unknown',
        senator2_party: senator2Party,
        senator2_person_id: senator2PersonId,
        senator2_first_elected_year: senator2FirstElectedYear,
        senator2_cash_on_hand: senator2CashOnHand,
        senator2_israel_score: senator2IsraelScore,
        senator2_total_israel_funding: senator2TotalIsraelFunding,
        senator2_term_end: stateData.senator2_term_end
      });
    }
    
    console.log(`=== COMPLETED SENATE DISTRICTS: ${senateDistricts.length} states ===`);
    
    return { success: true, data: senateDistricts };
    
  } catch (error) {
    console.error('Error in getSenateDistrictsData:', error);
    return { success: false, error: 'Failed to fetch senate districts data' };
  }
}
