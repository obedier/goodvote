import { executeQuery } from './database';

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

    const query = `
      WITH senate_rows AS (
        SELECT 
          pc.state,
          pc.person_id,
          pc.display_name AS incumbent_name,
          pc.current_party,
          COALESCE(v.total_pro_israel_support, 0) AS total_israel_funding,
          ROW_NUMBER() OVER (
            PARTITION BY pc.state 
            ORDER BY COALESCE(v.total_pro_israel_support, 0) DESC, pc.display_name
          ) AS rn
        FROM person_candidates pc
        LEFT JOIN v_congress_proisrael_funding v 
          ON v.cand_id = pc.cand_id AND v.cycle = $1
        WHERE pc.current_office = 'S' AND pc.election_year = $1
      )
      SELECT 
        s.state,
        s.state AS state_name,
        MAX(CASE WHEN s.rn = 1 THEN s.incumbent_name END) AS senator1_name,
        MAX(CASE WHEN s.rn = 1 THEN s.current_party END) AS senator1_party,
        MAX(CASE WHEN s.rn = 1 THEN s.person_id END) AS senator1_person_id,
        NULL::numeric AS senator1_cash_on_hand,
        NULL::numeric AS senator1_israel_score,
        COALESCE(MAX(CASE WHEN s.rn = 1 THEN s.total_israel_funding END), 0) AS senator1_total_israel_funding,
        NULL::text AS senator1_term_end,
        MAX(CASE WHEN s.rn = 2 THEN s.incumbent_name END) AS senator2_name,
        MAX(CASE WHEN s.rn = 2 THEN s.current_party END) AS senator2_party,
        MAX(CASE WHEN s.rn = 2 THEN s.person_id END) AS senator2_person_id,
        NULL::numeric AS senator2_cash_on_hand,
        NULL::numeric AS senator2_israel_score,
        COALESCE(MAX(CASE WHEN s.rn = 2 THEN s.total_israel_funding END), 0) AS senator2_total_israel_funding,
        NULL::text AS senator2_term_end
      FROM senate_rows s
      WHERE s.rn <= 2
      GROUP BY s.state
      ORDER BY s.state;
    `;

    const result = await executeQuery(query, [parseInt(cycle)], true);
    if (!result.success) {
      return { success: false, error: result.error || 'Failed to fetch senate data' };
    }
    console.log(`=== COMPLETED SENATE DISTRICTS: ${result.data.length} states ===`);
    return { success: true, data: result.data as any };
  } catch (error) {
    console.error('Error in getSenateDistrictsData:', error);
    return { success: false, error: 'Failed to fetch senate districts data' };
  }
}
