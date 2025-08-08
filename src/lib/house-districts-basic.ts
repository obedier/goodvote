import { executeQuery } from './database';

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

export async function getHouseDistrictsData(): Promise<{ success: boolean; data?: HouseDistrict[]; error?: string }> {
  try {
    console.log('=== STARTING BASIC HOUSE DISTRICTS ===');
    
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
    
    console.log(`Found ${districtsResult.data.length} districts`);
    
    const districtsWithDetails: HouseDistrict[] = [];
    
    // Process each district
    for (const district of districtsResult.data) {
      try {
        const districtName = district.district === 0 
          ? `${district.state} At-Large`
          : `${district.state} District ${district.district}`;
        
        console.log(`Processing: ${districtName} - ${district.representative}`);
        
        // For filled seats, try to find FEC data using simple name matching
        let incumbentPersonId = null;
        let incumbentName = district.representative;
        let incumbentParty = null;
        let firstElectedYear = null;
        let incumbentCashOnHand = null;
        let incumbentIsraelScore = null;
        
        if (district.status === 'FILLED' && district.representative !== 'VACANT') {
          console.log(`Looking for FEC match for: ${district.representative}`);
          
          // Use simple name matching
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
              AND LOWER(pc.display_name) LIKE '%moore%'
            ORDER BY pc.display_name
            LIMIT 1
          `;
          
          const fecMatchResult = await executeQuery(fecMatchQuery, [
            district.state, 
            district.district.toString()
          ], true);
          
          console.log(`FEC match result:`, fecMatchResult);
          
          if (fecMatchResult.success && fecMatchResult.data.length > 0) {
            const fecData = fecMatchResult.data[0];
            console.log(`Found FEC match: ${fecData.display_name} (${fecData.person_id})`);
            incumbentPersonId = fecData.person_id;
            incumbentName = fecData.display_name;
            incumbentParty = fecData.current_party;
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
          challenger_count: 0,
          top_challenger_name: null,
          top_challenger_person_id: null,
          top_challenger_party: null,
          top_challenger_cash_on_hand: null,
          top_challenger_israel_score: null,
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