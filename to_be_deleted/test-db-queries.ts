import { executeQuery } from './database';

export async function testDbQueries() {
  try {
    console.log('=== TESTING DATABASE QUERIES ===');
    
    // Test 1: Congressional data query
    console.log('Testing congressional data query...');
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
    
    // Test 2: FEC data query
    console.log('Testing FEC data query...');
    const fecQuery = `
      SELECT 
        pc.person_id,
        pc.display_name,
        pc.current_party,
        pc.election_year
      FROM person_candidates pc
      WHERE pc.current_office = 'H' 
        AND pc.election_year = 2024
        AND pc.state = 'AL'
        AND pc.current_district = '01'
        AND LOWER(pc.display_name) LIKE '%moore%'
      ORDER BY pc.display_name
      LIMIT 3
    `;
    
    const fecResult = await executeQuery(fecQuery, [], true);
    console.log('FEC data result:', fecResult);
    
    return { 
      success: true, 
      data: { 
        districtsResult, 
        fecResult 
      } 
    };
  } catch (error) {
    console.error('Error in testDbQueries:', error);
    return { success: false, error: error.message };
  }
} 