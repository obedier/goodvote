import { executeQuery } from './database';

/**
 * Bulk fetch Israel lobby funding for multiple person IDs in a single query
 * This replaces hundreds of individual getSharedIsraelFunding calls for performance
 */
export async function getBulkIsraelFunding(
  personIds: string[],
  cycleParam: string = '2024'
): Promise<{ success: boolean; data?: Map<string, number>; error?: string }> {
  try {
    if (personIds.length === 0) {
      return { success: true, data: new Map() };
    }

    // Build year filter condition based on cycle parameter
    let yearFilter = '';
    if (cycleParam === 'last3') {
      yearFilter = 'AND cc.file_year IN (2020, 2022, 2024)';
    } else if (cycleParam === 'all') {
      yearFilter = ''; // No year restriction
    } else {
      const year = parseInt(cycleParam);
      yearFilter = `AND cc.file_year = ${year}`;
    }

    // Optimized bulk query - fetch all funding amounts in one go
    const bulkQuery = `
WITH config_committees AS (
  SELECT fec_committee_id 
  FROM cfg_israel_committee_ids 
  WHERE is_active = true
),
config_keywords AS (
  SELECT keyword 
  FROM cfg_israel_keywords 
  WHERE is_active = true
),
name_patterns AS (
  SELECT DISTINCT cm.cmte_id
  FROM committee_master cm
  CROSS JOIN config_keywords ck
  WHERE cm.cmte_nm ILIKE '%' || ck.keyword || '%'
),
person_funding AS (
  SELECT
    pc.person_id,
    SUM(DISTINCT cc.transaction_amt) as total_funding
  FROM person_candidates pc
  JOIN committee_candidate_contributions cc ON cc.cand_id = pc.cand_id
  JOIN committee_master cm ON cc.cmte_id = cm.cmte_id
  WHERE pc.person_id = ANY($1)
    ${yearFilter}
    AND cc.transaction_amt > 0
    AND cc.transaction_tp IN ('24A','24K','24N','24F','24E','24C')
    AND COALESCE(cc.memo_cd,'') <> 'X'
    AND (
      cc.cmte_id IN (SELECT fec_committee_id FROM config_committees)
      OR
      cc.cmte_id IN (SELECT cmte_id FROM name_patterns)
    )
  GROUP BY pc.person_id
)
SELECT 
  person_id,
  COALESCE(total_funding, 0) as funding_amount
FROM person_funding`;

    const result = await executeQuery(bulkQuery, [personIds], true);
    
    if (!result.success) {
      console.error('Bulk Israel funding query failed:', result.error);
      return { success: false, error: result.error };
    }

    // Convert to Map for fast lookups
    const fundingMap = new Map<string, number>();
    
    // Initialize all person IDs with 0
    personIds.forEach(personId => {
      fundingMap.set(personId, 0);
    });
    
    // Update with actual values
    result.data.forEach((row: any) => {
      fundingMap.set(row.person_id, parseFloat(row.funding_amount) || 0);
    });

    return { success: true, data: fundingMap };
    
  } catch (error) {
    console.error('Error in bulk Israel funding query:', error);
    return { success: false, error: 'Failed to fetch bulk Israel funding data' };
  }
}

/**
 * Bulk fetch basic candidate information for multiple person IDs
 */
export async function getBulkCandidateInfo(
  personIds: string[],
  cycle: string = '2024'
): Promise<{ success: boolean; data?: Map<string, any>; error?: string }> {
  try {
    if (personIds.length === 0) {
      return { success: true, data: new Map() };
    }

    const query = `
      SELECT 
        pc.person_id,
        pc.display_name,
        pc.current_party,
        pc.election_year,
        pc.state,
        pc.current_district,
        MIN(first_pc.election_year) as first_elected_year,
        COALESCE(cs.coh_cop, 0) as cash_on_hand
      FROM person_candidates pc
      LEFT JOIN person_candidates first_pc ON first_pc.person_id = pc.person_id 
        AND first_pc.current_office = 'H'
      LEFT JOIN candidate_summary cs ON cs.cand_id = pc.cand_id 
        AND cs.file_year = pc.election_year
      WHERE pc.person_id = ANY($1)
        AND pc.current_office = 'H'
        AND pc.election_year = $2
      GROUP BY pc.person_id, pc.display_name, pc.current_party, pc.election_year, 
               pc.state, pc.current_district, cs.coh_cop
    `;

    const result = await executeQuery(query, [personIds, parseInt(cycle)], true);
    
    if (!result.success) {
      return { success: false, error: result.error };
    }

    const infoMap = new Map();
    result.data.forEach((row: any) => {
      infoMap.set(row.person_id, {
        display_name: row.display_name,
        current_party: row.current_party,
        election_year: row.election_year,
        state: row.state,
        current_district: row.current_district,
        first_elected_year: row.first_elected_year,
        cash_on_hand: parseFloat(row.cash_on_hand) || 0
      });
    });

    return { success: true, data: infoMap };

  } catch (error) {
    console.error('Error in bulk candidate info query:', error);
    return { success: false, error: 'Failed to fetch bulk candidate info' };
  }
}
