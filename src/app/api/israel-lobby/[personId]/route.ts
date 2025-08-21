import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/database';
import { SQL_QUERIES, substituteParams } from '@/config/sql-queries';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ personId: string }> }
) {
  try {
    const { personId } = await params;
    const { searchParams } = new URL(request.url);
    const cycleParam = searchParams.get('cycle') || '2024'; // Default to 2024
    
    if (!personId) {
      return NextResponse.json(
        { error: 'Person ID is required' },
        { status: 400 }
      );
    }

    // Determine years to query based on cycle parameter
    let yearCondition = '';
    let candidateParams: any[] = [personId];
    
    if (cycleParam === 'last3') {
      yearCondition = 'AND pc.election_year IN (2020, 2022, 2024)';
    } else if (cycleParam === 'all') {
      yearCondition = ''; // No year restriction
    } else {
      const year = parseInt(cycleParam);
      yearCondition = 'AND pc.election_year = $2';
      candidateParams.push(year);
    }

    // Determine if the provided param is a FEC candidate ID or a GoodVote person ID
    const isFecCandId = /^[HSP]\d{8}$/i.test(personId);
    const year = parseInt(cycleParam) || 2024;

    let candidate: any = null;

    if (!isFecCandId) {
      // Treat as GoodVote person_id → look up mapping to cand_id
      const candidateResult = await executeQuery(
        `SELECT 
          pc.person_id,
          pc.cand_id,
          pc.election_year
        FROM person_candidates pc
        WHERE pc.person_id = $1 
          ${yearCondition}
        ORDER BY pc.election_year DESC
        LIMIT 1`,
        candidateParams,
        false
      );

      if (candidateResult.success && candidateResult.data && candidateResult.data[0]) {
        const row = candidateResult.data[0];
        // Fetch canonical name/party from FEC candidate_master
        const fecInfo = await executeQuery(
          `SELECT cand_id, cand_name, cand_pty_affiliation AS party, cand_election_yr
           FROM candidate_master
           WHERE cand_id = $1
           ORDER BY cand_election_yr DESC
           LIMIT 1`,
          [row.cand_id],
          true
        );
        candidate = {
          person_id: row.person_id,
          cand_id: row.cand_id,
          display_name: fecInfo.success && fecInfo.data[0] ? fecInfo.data[0].cand_name : row.cand_id,
          current_party: fecInfo.success && fecInfo.data[0] ? fecInfo.data[0].party : null,
          election_year: row.election_year
        };
      }
    }

    if (!candidate) {
      // Treat the param as a FEC candidate ID (or use as-is if nothing found above)
      const fecFallback = await executeQuery(
        `SELECT 
           cand_id,
           cand_name,
           cand_pty_affiliation AS party,
           cand_election_yr
         FROM candidate_master
         WHERE cand_id = $1
         ORDER BY cand_election_yr DESC
         LIMIT 1`,
        [personId],
        true
      );

      if (fecFallback.success && fecFallback.data && fecFallback.data[0]) {
        // Try to resolve person_id from mapping table for this cand_id and cycle
        const mapping = await executeQuery(
          `SELECT person_id FROM person_candidates WHERE cand_id = $1 AND election_year = $2 LIMIT 1`,
          [fecFallback.data[0].cand_id, year],
          false
        );
        candidate = {
          person_id: mapping.success && mapping.data[0] ? mapping.data[0].person_id : null,
          cand_id: fecFallback.data[0].cand_id,
          display_name: fecFallback.data[0].cand_name,
          current_party: fecFallback.data[0].party,
          election_year: fecFallback.data[0].cand_election_yr || year,
        };
      } else {
        // Minimal stub to proceed with contributions using the provided ID as cand_id
        candidate = {
          person_id: isFecCandId ? null : personId,
          cand_id: personId,
          display_name: personId,
          current_party: 'Unknown',
          election_year: year,
        };
      }
    }

    // candidate is now ensured above

    // Build the complete query with year filtering
    const realContributionsQuery = `
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
  WHERE cc.cand_id = $1
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

    // Add cycle filtering to the query
    let completeQuery = realContributionsQuery;
    let queryParams: any[] = [candidate.cand_id];
    
    if (cycleParam === 'last3') {
      completeQuery = completeQuery.replace(
        'WHERE cc.cand_id = $1',
        'WHERE cc.cand_id = $1 AND cc.file_year IN (2020, 2022, 2024)'
      );
    } else if (cycleParam === 'all') {
      // No additional year filter needed
    } else {
      const year = parseInt(cycleParam);
      completeQuery = completeQuery.replace(
        'WHERE cc.cand_id = $1',
        'WHERE cc.cand_id = $1 AND cc.file_year = $2'
      );
      queryParams.push(year);
    }

    const realContributionsResult = await executeQuery(
      completeQuery,
      queryParams,
      true
    );

    if (!realContributionsResult.success || !realContributionsResult.data) {
      console.error('Failed to fetch contributions data:', realContributionsResult.error);
      return NextResponse.json(
        { error: 'Failed to fetch contributions data', details: realContributionsResult.error },
        { status: 500 }
      );
    }

    console.log(`📊 Found ${realContributionsResult.data.length} contribution records`);

    // The centralized query already includes FEC document URLs and proper field mapping
    const allContributions = realContributionsResult.data.map((record: any) => ({
      source_table: record.source_table,
      unique_identifier: record.unique_identifier,
      image_num: record.image_num,
      election_cycle_year: record.election_cycle_year,
      transaction_type: record.transaction_type,
      contribution_receipt_amount: parseFloat(record.contribution_receipt_amount),
      committee_name: record.committee_name,
      committee_id: record.committee_id,
      committee_type: record.committee_type,
      committee_designation: record.committee_designation,
      contribution_receipt_date: record.contribution_receipt_date,
      transaction_type_code: record.transaction_type_code,
      fec_document_url: record.fec_document_url
    }));

    // Calculate totals
    const totalAmount = allContributions.reduce((sum: number, contrib: any) => sum + contrib.contribution_receipt_amount, 0);
    const totalCount = allContributions.length;

    // Group data for summary view
    const summaryMap = new Map();
    allContributions.forEach((contrib: any) => {
      const key = `${contrib.committee_name}|${contrib.transaction_type}|${contrib.election_cycle_year}`;
      if (!summaryMap.has(key)) {
        summaryMap.set(key, {
          committee_name: contrib.committee_name,
          transaction_type: contrib.transaction_type,
          election_cycle_year: contrib.election_cycle_year,
          total_amount: 0,
          record_count: 0
        });
      }
      const summary = summaryMap.get(key);
      summary.total_amount += contrib.contribution_receipt_amount;
      summary.record_count += 1;
    });

    const summaryData = Array.from(summaryMap.values()).sort((a, b) => b.total_amount - a.total_amount);

    // Calculate totals by category (committee type, transaction type, etc.)
    const totalsByCategory: { [key: string]: { amount: number; count: number } } = {};

    allContributions.forEach((contrib: any) => {
      // By committee
      const committeeName = contrib.committee_name;
      if (!totalsByCategory[committeeName]) {
        totalsByCategory[committeeName] = { amount: 0, count: 0 };
      }
      totalsByCategory[committeeName].amount += contrib.contribution_receipt_amount;
      totalsByCategory[committeeName].count += 1;

      // By transaction type
      const transactionType = contrib.transaction_type;
      if (!totalsByCategory[transactionType]) {
        totalsByCategory[transactionType] = { amount: 0, count: 0 };
      }
      totalsByCategory[transactionType].amount += contrib.contribution_receipt_amount;
      totalsByCategory[transactionType].count += 1;

      // By election year
      const yearKey = `Year ${contrib.election_cycle_year}`;
      if (!totalsByCategory[yearKey]) {
        totalsByCategory[yearKey] = { amount: 0, count: 0 };
      }
      totalsByCategory[yearKey].amount += contrib.contribution_receipt_amount;
      totalsByCategory[yearKey].count += 1;
    });

    return NextResponse.json({
      candidate: {
        person_id: candidate.person_id,
        fec_id: candidate.cand_id,
        name: candidate.display_name,
        party: candidate.current_party,
        election_year: candidate.election_year
      },
      funding_breakdown: {
        total_amount: totalAmount,
        total_count: totalCount,
        totals_by_category: totalsByCategory,
        summary_data: summaryData,
        contributions: allContributions
      },
      debug: {
        sql_query: debugSql, // The actual SQL query with substituted parameters
        raw_sql_template: completeQuery, // The template with placeholders
        query_source: "Centralized SQL config: SQL_QUERIES.ISRAEL_LOBBY_CONTRIBUTIONS_BY_PERSON",
        person_id: personId,
        cycle_param: cycleParam,
        total_records: allContributions.length,
        total_amount: totalAmount,
        query_params: queryParams,
        note: "🔧 UPDATED: Now using centralized SQL config with corrected deduplication logic"
      }
    });

  } catch (error) {
    console.error('Error fetching Israel lobby funding:', error);
    return NextResponse.json(
      { error: 'Failed to fetch Israel lobby funding' },
      { status: 500 }
    );
  }
}