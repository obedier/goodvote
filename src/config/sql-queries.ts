/**
 * Centralized SQL Query Configuration for Israel Lobby Analysis
 * 
 * This file contains all SQL queries used throughout the application for Israel lobby
 * funding analysis. Centralizing these queries makes it easier to:
 * 1. Debug discrepancies between different views
 * 2. Ensure consistency across all endpoints
 * 3. Modify queries without hunting through multiple files
 * 4. Compare and validate SQL logic
 */

export const SQL_QUERIES = {
  /**
   * ISRAEL LOBBY FUNDING QUERIES
   */
  
  // Base query for getting Israel lobby contributions for a single person
  ISRAEL_LOBBY_CONTRIBUTIONS_BY_PERSON: `
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
        cc.cand_id,
        cc.cmte_id,
        cc.transaction_amt,
        cc.transaction_dt,
        cc.transaction_tp,
        cc.file_year,
        cc.image_num,
        cm.cmte_nm,
        cm.cmte_dsgn,
        cm.cmte_tp,
        ROW_NUMBER() OVER (
          PARTITION BY cc.sub_id
          ORDER BY cc.transaction_dt DESC, cc.transaction_amt DESC
        ) AS rn
      FROM committee_candidate_contributions cc
      JOIN person_candidates pc ON cc.cand_id = pc.cand_id
      JOIN committee_master cm ON cc.cmte_id = cm.cmte_id
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
      sub_id AS unique_identifier,
      image_num,
      file_year AS election_cycle_year,
      CASE transaction_tp
        WHEN '24E' THEN 'Independent Expenditure (unspecified S/O in PAS2)'
        WHEN '24A' THEN 'Direct Contribution (cash)'
        WHEN '24N' THEN 'Direct Contribution (in-kind)'
        WHEN '24K' THEN 'Earmarked via Conduit'
        WHEN '24F' THEN 'Party Coordinated Expenditure'
        ELSE 'Other Transaction'
      END AS transaction_type,
      transaction_amt AS contribution_receipt_amount,
      cmte_nm AS committee_name,
      cmte_id AS committee_id,
      cmte_tp AS committee_type,
      cmte_dsgn AS committee_designation,
      transaction_dt AS contribution_receipt_date,
      transaction_tp AS transaction_type_code,
      CONCAT('https://docquery.fec.gov/cgi-bin/fecimg/?', image_num) as fec_document_url
    FROM filtered
    WHERE rn = 1
    ORDER BY sub_id, transaction_dt DESC, transaction_amt DESC
  `,

  // Query for getting total Israel lobby funding for a single person (used in totals)
  ISRAEL_LOBBY_TOTAL_BY_PERSON: `
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
        cc.transaction_amt,
        ROW_NUMBER() OVER (
          PARTITION BY cc.sub_id
          ORDER BY cc.transaction_dt DESC, cc.transaction_amt DESC
        ) AS rn
      FROM committee_candidate_contributions cc
      JOIN person_candidates pc ON cc.cand_id = pc.cand_id
      JOIN committee_master cm ON cc.cmte_id = cm.cmte_id
      WHERE pc.person_id = $1
        AND cc.transaction_amt > 0
        AND cc.transaction_tp IN ('24A','24K','24N','24F','24E','24C')
        AND (
          cc.cmte_id IN (SELECT fec_committee_id FROM config_committees)
          OR
          cc.cmte_id IN (SELECT cmte_id FROM name_patterns)
        )
    )
    SELECT SUM(transaction_amt) as total_amount
    FROM filtered
    WHERE rn = 1
  `,

  // Bulk query for getting Israel lobby funding for multiple people
  // 🔧 CORRECTED: Now matches detail view logic exactly
  ISRAEL_LOBBY_BULK_FUNDING: `
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
        pc.person_id,
        cc.transaction_amt,
        ROW_NUMBER() OVER (
          PARTITION BY cc.sub_id
          ORDER BY cc.transaction_dt DESC, cc.transaction_amt DESC
        ) AS rn
      FROM committee_candidate_contributions cc
      JOIN person_candidates pc ON cc.cand_id = pc.cand_id
      JOIN committee_master cm ON cc.cmte_id = cm.cmte_id
      WHERE pc.person_id = ANY($1::text[])
        AND cc.transaction_amt > 0
        AND cc.transaction_tp IN ('24A','24K','24N','24F','24E','24C')
        AND (
          cc.cmte_id IN (SELECT fec_committee_id FROM config_committees)
          OR
          cc.cmte_id IN (SELECT cmte_id FROM name_patterns)
        )
    )
    SELECT
      person_id,
      SUM(transaction_amt) AS total_amount
    FROM filtered
    WHERE rn = 1
    GROUP BY person_id
  `,

  /**
   * CONGRESS MEMBER QUERIES
   */
  
  // Query for getting all congress members with their Israel funding
  CONGRESS_MEMBERS_WITH_FUNDING: `
    SELECT 
      person_id,
      candidate_name,
      party,
      chamber,
      state,
      district,
      incumbent_total_israel_funding,
      humanity_score
    FROM congress_member_pro_israel_report
    WHERE incumbent_total_israel_funding IS NOT NULL 
      AND incumbent_total_israel_funding > 0
    ORDER BY incumbent_total_israel_funding DESC
  `,

  // New optimized view for congress members with Israel funding
  CONGRESS_PROISRAEL_FUNDING_VIEW: `
    SELECT 
      person_id,
      candidate_name,
      state,
      district,
      chamber,
      party,
      total_israel_funding,
      humanity_score,
      election_year
    FROM v_congress_proisrael_funding
    WHERE election_year = $1
    ORDER BY state, district, candidate_name
  `,

  // Optimized query for house districts using the view
  HOUSE_DISTRICTS_OPTIMIZED: `
    SELECT 
      v.person_id,
      v.candidate_name as incumbent_name,
      v.state,
      v.district,
      v.party as incumbent_party,
      v.total_israel_funding as incumbent_israel_funding,
      v.humanity_score as incumbent_israel_score,
      v.election_year
    FROM v_congress_proisrael_funding v
    WHERE v.chamber = 'H' 
      AND v.election_year = $1
    ORDER BY v.state, v.district
  `,

  // Optimized query for senate districts using the view
  SENATE_DISTRICTS_OPTIMIZED: `
    SELECT 
      v.person_id,
      v.candidate_name as incumbent_name,
      v.state,
      v.district,
      v.party as incumbent_party,
      v.total_israel_funding as incumbent_israel_funding,
      v.humanity_score as incumbent_israel_score,
      v.election_year
    FROM v_congress_proisrael_funding v
    WHERE v.chamber = 'S' 
      AND v.election_year = $1
    ORDER BY v.state, v.district
  `,

  /**
   * CANDIDATE INFO QUERIES
   */
  
  // Query for getting candidate information by person_id  
  CANDIDATE_INFO_BY_PERSON: `
    SELECT 
      pc.person_id,
      pc.cand_id,
      pc.display_name,
      pc.current_party,
      pc.election_year
    FROM person_candidates pc
    WHERE pc.person_id = $1
    ORDER BY pc.election_year DESC
    LIMIT 1
  `,

  /**
   * UTILITY QUERIES
   */
  
  // Query for getting configuration data
  GET_CONFIG_COMMITTEES: `
    SELECT fec_committee_id 
    FROM cfg_israel_committee_ids 
    WHERE is_active = true
  `,
  
  GET_CONFIG_KEYWORDS: `
    SELECT keyword 
    FROM cfg_israel_keywords 
    WHERE is_active = true
  `
};

/**
 * Cycle-aware query builder
 * Adds appropriate WHERE clauses for election year filtering
 */
export function addCycleFilter(baseQuery: string, cycleParam: string, yearColumnName: string = 'file_year'): string {
  if (cycleParam === 'last3') {
    return baseQuery.replace(
      'WHERE pc.person_id',
      `WHERE cc.${yearColumnName} IN (2020, 2022, 2024) AND pc.person_id`
    );
  } else if (cycleParam === 'all') {
    // No additional filter for 'all'
    return baseQuery;
  } else {
    const year = parseInt(cycleParam);
    if (!isNaN(year)) {
      return baseQuery.replace(
        'WHERE pc.person_id',
        `WHERE cc.${yearColumnName} = ${year} AND pc.person_id`
      );
    }
  }
  return baseQuery;
}

/**
 * Parameter substitution for debugging
 * Replaces $1, $2, etc. with actual values for SQL debugging
 */
export function substituteParams(query: string, params: any[]): string {
  let substituted = query;
  params.forEach((param, index) => {
    const placeholder = `$${index + 1}`;
    let value: string;
    
    if (Array.isArray(param)) {
      value = `ARRAY[${param.map(p => `'${p}'`).join(', ')}]`;
    } else if (typeof param === 'string') {
      value = `'${param}'`;
    } else {
      value = String(param);
    }
    
    substituted = substituted.replace(new RegExp(`\\${placeholder}\\b`, 'g'), value);
  });
  
  return substituted;
}
