import { executeQuery } from './database';

export async function testNameMatching() {
  try {
    console.log('Testing name matching for Barry Moore...');
    
    const congressionalName = 'Barry Moore';
    const state = 'AL';
    const district = '01';
    
    // Test the exact query from house-districts-test.ts
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
          LOWER(pc.display_name) LIKE CONCAT('%', LOWER(SPLIT_PART($3, ' ', -1)), '%')
          OR LOWER(pc.display_name) LIKE CONCAT('%', LOWER($3), '%')
          OR LOWER(REPLACE(pc.display_name, ',', ' ')) LIKE CONCAT('%', LOWER($3), '%')
          -- Handle cases where FEC has full name but congressional has partial
          OR LOWER(pc.display_name) LIKE CONCAT('%', LOWER($3), '%')
          -- Handle cases where congressional name is part of FEC name
          OR LOWER($3) LIKE CONCAT('%', SPLIT_PART(LOWER(pc.display_name), ' ', 2), '%')
          -- Handle cases where FEC has "LAST, FIRST" format
          OR LOWER(SPLIT_PART(pc.display_name, ',', 1)) LIKE CONCAT('%', LOWER(SPLIT_PART($3, ' ', -1)), '%')
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
    
    const result = await executeQuery(fecMatchQuery, [state, district, congressionalName], true);
    console.log('Name matching result:', result);
    
    // Also test a simpler query
    const simpleQuery = `
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
    `;
    
    const simpleResult = await executeQuery(simpleQuery, [state, district], true);
    console.log('Simple query result:', simpleResult);
    
    return { success: true, data: { result, simpleResult } };
  } catch (error) {
    console.error('Error in testNameMatching:', error);
    return { success: false, error: error.message };
  }
} 