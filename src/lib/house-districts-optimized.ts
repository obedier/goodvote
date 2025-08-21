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
    console.log('=== STARTING HOUSE DISTRICTS (v_congress_proisrael_funding) ===');
    const year = parseInt(cycle);
    const electionYear = isNaN(year) ? 2024 : year;

    // Pull directly from the canonical view
    const viewQuery = `
      SELECT 
        pc.person_id,
        pc.display_name AS incumbent_name,
        pc.state,
        pc.current_district AS district,
        pc.current_party AS party,
        v.total_pro_israel_support AS total_israel_funding,
        NULL::numeric AS humanity_score,
        v.cycle AS election_year
      FROM v_congress_proisrael_funding v
      JOIN person_candidates pc 
        ON pc.cand_id = v.cand_id 
       AND pc.election_year = $1
       AND pc.current_office = 'H'
      WHERE v.cycle = $1
      ORDER BY pc.state, pc.current_district, pc.display_name
    `;

    const viewResult = await executeQuery(viewQuery, [electionYear], true);
    if (!viewResult.success) {
      console.error('Failed to fetch data from v_congress_proisrael_funding:', viewResult.error);
      return { success: false, error: 'Failed to fetch funding view' };
    }

    // Map rows to API shape
    const districtsWithDetails: HouseDistrict[] = viewResult.data.map((row: any) => {
      const districtNumber = row.district ?? 0;
      const districtName = districtNumber === 0 
        ? `${row.state} At-Large`
        : `${row.state} District ${districtNumber}`;
      return {
        state: row.state,
        district: districtNumber,
        district_name: districtName,
        incumbent_name: row.incumbent_name,
        incumbent_party: row.party,
        incumbent_person_id: row.person_id,
        first_elected_year: null,
        incumbent_cash_on_hand: null,
        incumbent_israel_score: row.humanity_score ?? null,
        incumbent_total_israel_funding: parseFloat(row.total_israel_funding) || 0,
        challenger_count: 0,
        top_challenger_name: null,
        top_challenger_party: null,
        status: 'FILLED',
        voting: true,
      } as HouseDistrict;
    });

    console.log(`=== COMPLETED HOUSE DISTRICTS (view): ${districtsWithDetails.length} districts ===`);
    return { success: true, data: districtsWithDetails };
  } catch (error) {
    console.error('Error in getHouseDistrictsData (view):', error);
    return { success: false, error: 'Failed to fetch house districts data' };
  }
}
