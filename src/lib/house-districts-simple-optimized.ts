import { executeQuery } from './database';
import { SQL_QUERIES } from '@/config/sql-queries';

export interface SimpleHouseDistrict {
  state: string;
  district: number;
  district_name: string;
  incumbent_name: string;
  incumbent_party: string;
  incumbent_israel_funding: number;
  incumbent_israel_score: number;
  incumbent_person_id: string;
}

export async function getSimpleHouseDistricts(electionYear: number = 2024): Promise<{ success: boolean; data?: SimpleHouseDistrict[]; error?: string }> {
  try {
    console.log('=== STARTING SIMPLE OPTIMIZED HOUSE DISTRICTS - NEW VERSION ===');
    console.log(`Fetching data for cycle: ${electionYear}`);
    
    // Use the new optimized view query
    const districtsQuery = SQL_QUERIES.HOUSE_DISTRICTS_OPTIMIZED;
    
    const districtsResult = await executeQuery(districtsQuery, [electionYear], true); // Use fec_gold database for the view
    
    if (!districtsResult.success || !districtsResult.data) {
      console.error('Failed to fetch house districts from optimized view:', districtsResult.error);
      return { success: false, error: 'Failed to fetch house districts data' };
    }

    console.log(`Found ${districtsResult.data.length} districts from optimized view`);
    
    // Transform the data to match the expected interface
    const enrichedDistricts = districtsResult.data.map((district: any) => {
      // Create district_name from state and district
      const district_name = district.district === 0 ? 
        `${district.state} At-Large` : 
        `${district.state} District ${district.district}`;
      
      return {
        state: district.state,
        district: district.district,
        district_name,
        incumbent_name: district.incumbent_name,
        incumbent_party: district.incumbent_party || 'Unknown',
        incumbent_israel_funding: district.incumbent_israel_funding || 0,
        incumbent_israel_score: district.incumbent_israel_score || 0,
        incumbent_person_id: district.person_id
      };
    });

    console.log(`=== COMPLETED SIMPLE OPTIMIZED HOUSE DISTRICTS: ${enrichedDistricts.length} districts ===`);
    
    return { success: true, data: enrichedDistricts };
  } catch (error) {
    console.error('Error fetching house districts from optimized view:', error);
    return { success: false, error: 'Failed to fetch house districts data' };
  }
}
