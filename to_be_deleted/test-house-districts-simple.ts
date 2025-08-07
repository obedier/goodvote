import { executeQuery } from './database';

export async function testHouseDistrictsSimple() {
  try {
    console.log('Testing simple house districts function...');
    
    // Test 1: Check congressional data
    const districtsQuery = `
      SELECT DISTINCT
        dm.state,
        dm.district,
        dm.representative,
        dm.status,
        dm.voting
      FROM cng_district_mapping dm
      WHERE dm.district > 0
      ORDER BY dm.state, dm.district
      LIMIT 3
    `;
    
    const districtsResult = await executeQuery(districtsQuery, [], true);
    console.log('Congressional data result:', districtsResult);
    
    // Test 2: Check FEC matching for Barry Moore
    if (districtsResult.success && districtsResult.data.length > 0) {
      const district = districtsResult.data[0]; // AL District 1
      console.log('Testing FEC matching for:', district.representative);
      
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
      
      console.log('FEC match result:', fecMatchResult);
    }
    
    return { success: true, data: { districtsResult } };
  } catch (error) {
    console.error('Error in testHouseDistrictsSimple:', error);
    return { success: false, error: error.message };
  }
} 