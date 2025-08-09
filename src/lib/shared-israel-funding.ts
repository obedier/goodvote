import { executeQuery } from './database';

export interface SharedIsraelFundingResult {
  total_amount: number;
  total_count: number;
  contributions: Array<{
    source_table: string;
    unique_identifier: string;
    image_num: string;
    election_cycle_year: number;
    transaction_type: string;
    contribution_receipt_amount: number;
    committee_name: string;
    committee_id: string;
    committee_type: string;
    committee_designation: string;
    contribution_receipt_date: string;
    transaction_type_code: string;
    fec_document_url: string;
  }>;
}

/**
 * Shared function to calculate Israel lobby funding using the optimized SQL query
 * This ensures consistency between the lobby detail page, map, and district list
 */
export async function getSharedIsraelFunding(
  personId: string,
  cycleParam: string = '2024'
): Promise<{ success: boolean; data?: SharedIsraelFundingResult; error?: string }> {
  try {
    const baseQuery = `
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
filtered AS (
  SELECT
    cc.sub_id,
    cc.image_num,
    cc.file_year,
    cc.transaction_tp,
    cc.transaction_amt,
    cc.transaction_dt,
    cc.cmte_id,
    cm.cmte_nm,
    cm.cmte_tp,
    cm.cmte_dsgn,
    ROW_NUMBER() OVER (
      PARTITION BY cc.sub_id
      ORDER BY cc.transaction_dt DESC, cc.transaction_amt DESC
    ) AS rn
  FROM committee_candidate_contributions cc
  JOIN committee_master cm
    ON cc.cmte_id = cm.cmte_id
  JOIN person_candidates pc
    ON cc.cand_id = pc.cand_id
  WHERE pc.person_id = $1
    AND cc.transaction_amt > 0
    AND cc.transaction_tp IN ('24A','24K','24N','24F','24E','24C')
    AND (
      cc.cmte_id IN (SELECT fec_committee_id FROM config_committees)
      OR
      cc.cmte_id IN (SELECT cmte_id FROM name_patterns)
    )
)
SELECT
  'committee_candidate_contributions' AS source_table,
  f.sub_id           AS unique_identifier,
  f.image_num        AS image_num,
  f.file_year        AS election_cycle_year,
  CASE f.transaction_tp
    WHEN '24E' THEN 'Independent Expenditure (unspecified S/O in PAS2)'
    WHEN '24A' THEN 'Direct Contribution (cash)'
    WHEN '24N' THEN 'Direct Contribution (in-kind)'
    WHEN '24K' THEN 'Earmarked via Conduit'
    WHEN '24F' THEN 'Party Coordinated Expenditure'
    ELSE 'Other Transaction'
  END               AS transaction_type,
  f.transaction_amt AS contribution_receipt_amount,
  f.cmte_nm         AS committee_name,
  f.cmte_id         AS committee_id,
  f.cmte_tp         AS committee_type,
  f.cmte_dsgn       AS committee_designation,
  f.transaction_dt  AS contribution_receipt_date,
  f.transaction_tp  AS transaction_type_code
FROM filtered f
WHERE f.rn = 1
ORDER BY f.sub_id, f.transaction_dt DESC, f.transaction_amt DESC`;

    // Build the complete query with year filtering
    let completeQuery = baseQuery;
    let queryParams: any[] = [personId];
    
    if (cycleParam === 'last3') {
      completeQuery = completeQuery.replace(
        'WHERE pc.person_id = $1',
        'WHERE pc.person_id = $1 AND cc.file_year IN (2020, 2022, 2024)'
      );
    } else if (cycleParam === 'all') {
      // No additional year filter needed
    } else {
      const year = parseInt(cycleParam);
      completeQuery = completeQuery.replace(
        'WHERE pc.person_id = $1',
        'WHERE pc.person_id = $1 AND cc.file_year = $2'
      );
      queryParams.push(year);
    }

    const result = await executeQuery(completeQuery, queryParams, true);

    if (!result.success) {
      return { success: false, error: result.error };
    }

    const contributions = (result.data || []).map((row: any) => ({
      source_table: row.source_table,
      unique_identifier: row.unique_identifier,
      image_num: row.image_num,
      election_cycle_year: row.election_cycle_year,
      transaction_type: row.transaction_type,
      contribution_receipt_amount: parseFloat(row.contribution_receipt_amount || '0'),
      committee_name: row.committee_name,
      committee_id: row.committee_id,
      committee_type: row.committee_type,
      committee_designation: row.committee_designation,
      contribution_receipt_date: row.contribution_receipt_date,
      transaction_type_code: row.transaction_type_code,
      fec_document_url: `https://docquery.fec.gov/cgi-bin/fecimg/?${row.image_num}`
    }));

    const total_amount = contributions.reduce((sum, contrib) => sum + contrib.contribution_receipt_amount, 0);
    const total_count = contributions.length;

    return {
      success: true,
      data: {
        total_amount,
        total_count,
        contributions
      }
    };

  } catch (error) {
    console.error('Error in getSharedIsraelFunding:', error);
    return { success: false, error: 'Failed to calculate Israel funding' };
  }
}
