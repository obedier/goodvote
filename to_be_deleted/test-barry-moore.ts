import { executeQuery } from './database';

export async function testBarryMoore() {
  try {
    const congressionalName = 'Barry Moore';
    const state = 'AL';
    const district = '02'; // Changed from '01' to '02'

    // First, let's see all candidates in AL District 2
    const allCandidatesQuery = `
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
        AND pc.state = $1
        AND pc.current_district = $2
      ORDER BY pc.display_name
    `;

    const allCandidatesResult = await executeQuery(allCandidatesQuery, [state, district], true);

    // Search for Barry Moore across all AL districts
    const searchAllDistrictsQuery = `
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
        AND pc.state = $1
        AND LOWER(pc.display_name) LIKE '%moore%'
      ORDER BY pc.current_district, pc.display_name
    `;

    const searchAllDistrictsResult = await executeQuery(searchAllDistrictsQuery, [state], true);

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

    const result = await executeQuery(fecMatchQuery, [state, district, congressionalName], true);
    
    // Also test a simple query
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
      LIMIT 1
    `;

    const simpleResult = await executeQuery(simpleQuery, [state, district], true);

    return {
      success: true,
      data: {
        allCandidates: allCandidatesResult,
        searchAllDistricts: searchAllDistrictsResult,
        result1: result,
        simpleResult: simpleResult
      }
    };
  } catch (error) {
    console.error('Error in testBarryMoore:', error);
    return { success: false, error: error.message };
  }
} 