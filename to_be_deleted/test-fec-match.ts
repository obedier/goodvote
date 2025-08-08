import { executeQuery } from './database';

export async function testFecMatch() {
  try {
    console.log('Testing FEC matching for AL District 1...');
    
    // Test 1: Check what candidates exist for AL District 1
    const testQuery1 = `
      SELECT 
        pc.person_id,
        pc.display_name,
        pc.current_party,
        pc.election_year,
        pc.state,
        pc.current_district
      FROM person_candidates pc
      WHERE pc.current_office = 'H' 
        AND pc.election_year = 2024
        AND pc.state = 'AL'
        AND pc.current_district = '01'
      ORDER BY pc.display_name
    `;
    
    const result1 = await executeQuery(testQuery1, [], true);
    console.log('AL District 1 candidates:', result1);
    
    // Test 2: Try to match "Barry Moore"
    const testQuery2 = `
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
        AND (
          LOWER(pc.display_name) LIKE '%moore%'
          OR LOWER(pc.display_name) LIKE '%barry%'
        )
      ORDER BY pc.display_name
    `;
    
    const result2 = await executeQuery(testQuery2, [], true);
    console.log('Barry Moore matches:', result2);
    
    return { success: true, data: { result1, result2 } };
  } catch (error) {
    console.error('Error in testFecMatch:', error);
    return { success: false, error: error.message };
  }
} 