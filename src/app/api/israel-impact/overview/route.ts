import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const cyclesParam = searchParams.get('cycles') || '2024';
    const cycles = cyclesParam
      .split(',')
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => !Number.isNaN(n));

    if (cycles.length === 0) {
      return NextResponse.json({ success: false, error: 'No valid cycles provided' }, { status: 400 });
    }

    // Overview totals by cycle - direct query without views
    const overviewByCycle: any[] = [];
    
    for (const cycle of cycles) {
      try {
        const overviewQuery = `
          WITH committees AS (
            SELECT fec_committee_id FROM cfg_israel_committee_ids WHERE is_active = TRUE
          ),
          individual_in AS (
            SELECT COALESCE(SUM(CAST(ic.transaction_amt AS NUMERIC)), 0) AS total
            FROM individual_contributions ic
            JOIN committees c ON ic.cmte_id = c.fec_committee_id
            WHERE ic.file_year = $1 AND ic.transaction_amt > 0
          ),
          committee_out AS (
            SELECT COALESCE(SUM(CAST(ct.transaction_amt AS NUMERIC)), 0) AS total
            FROM committee_transactions ct
            JOIN committees c ON ct.cmte_id = c.fec_committee_id
            WHERE ct.file_year = $1 AND ct.transaction_amt > 0
          ),
          expenditures AS (
            SELECT COALESCE(SUM(CAST(oe.expenditure_amount AS NUMERIC)), 0) AS total
            FROM operating_expenditures oe
            JOIN committees c ON oe.cmte_id = c.fec_committee_id
            WHERE oe.file_year = $1 AND oe.expenditure_amount > 0
          ),
          direct_contribs AS (
            SELECT COALESCE(SUM(CAST(ccc.transaction_amt AS NUMERIC)), 0) AS total
            FROM committee_candidate_contributions ccc
            JOIN committees c ON ccc.cmte_id = c.fec_committee_id
            WHERE ccc.file_year = $1 AND ccc.transaction_amt > 0
              AND COALESCE(ccc.memo_cd,'') <> 'X'
          ),
          ie_support AS (
            SELECT COALESCE(SUM(CAST(ie.expenditure_amount AS NUMERIC)), 0) AS total
            FROM independent_expenditures ie
            JOIN committees c ON ie.committee_id = c.fec_committee_id
            WHERE ie.two_year_transaction_period = $1 AND ie.support_oppose_indicator = 'S'
          ),
          ie_opposition AS (
            SELECT COALESCE(SUM(CAST(ie.expenditure_amount AS NUMERIC)), 0) AS total
            FROM independent_expenditures ie
            JOIN committees c ON ie.committee_id = c.fec_committee_id
            WHERE ie.two_year_transaction_period = $1 AND ie.support_oppose_indicator = 'O'
          )
          SELECT 
            $1 AS cycle,
            individual_in.total AS total_individual_contributions_in,
            committee_out.total AS total_committee_transactions_out,
            expenditures.total AS total_operating_expenditures,
            direct_contribs.total AS total_direct_candidate_contributions,
            ie_support.total AS total_ie_support,
            ie_opposition.total AS total_ie_opposition,
            0 AS total_commcost_support,
            0 AS total_commcost_opposition,
            0 AS total_unique_transactions
          FROM individual_in, committee_out, expenditures, direct_contribs, ie_support, ie_opposition
        `;

        const overviewResult = await executeQuery(overviewQuery, [cycle], true, 30000);
        if (overviewResult.success && overviewResult.data && overviewResult.data.length > 0) {
          overviewByCycle.push(overviewResult.data[0]);
        } else {
          // Fallback with minimal data if query fails
          overviewByCycle.push({
            cycle,
            total_individual_contributions_in: 0,
            total_committee_transactions_out: 0,
            total_operating_expenditures: 0,
            total_direct_candidate_contributions: 0,
            total_ie_support: 0,
            total_ie_opposition: 0,
            total_commcost_support: 0,
            total_commcost_opposition: 0,
            total_unique_transactions: 0
          });
        }
      } catch (error) {
        console.warn(`Failed to get overview for cycle ${cycle}:`, error);
        // Add fallback data for this cycle
        overviewByCycle.push({
          cycle,
          total_individual_contributions_in: 0,
          total_committee_transactions_out: 0,
          total_operating_expenditures: 0,
          total_direct_candidate_contributions: 0,
          total_ie_support: 0,
          total_ie_opposition: 0,
          total_commcost_support: 0,
          total_commcost_opposition: 0,
          total_unique_transactions: 0
        });
      }
    }

    // Top committees by cycle
    const topCommitteesByCycle: Record<number, any[]> = {};
    for (const cycle of cycles) {
      try {
        const topCommitteesQuery = `
          SELECT 
            cm.cmte_nm AS committee_name,
            cic.category,
            COUNT(DISTINCT ccc.sub_id) AS transaction_count,
            SUM(CAST(ccc.transaction_amt AS NUMERIC))::numeric AS total_amount
          FROM committee_candidate_contributions ccc
          JOIN cfg_israel_committee_ids cic ON ccc.cmte_id = cic.fec_committee_id
          JOIN committee_master cm ON ccc.cmte_id = cm.cmte_id
          WHERE cic.is_active = TRUE 
            AND ccc.file_year = $1 
            AND ccc.transaction_amt > 0
            AND COALESCE(ccc.memo_cd,'') <> 'X'
          GROUP BY cm.cmte_nm, cic.category
          ORDER BY total_amount DESC
          LIMIT 10
        `;
        
        const topCommitteesResult = await executeQuery(topCommitteesQuery, [cycle], true, 30000);
        topCommitteesByCycle[cycle] = topCommitteesResult.success && topCommitteesResult.data ? topCommitteesResult.data : [];
      } catch (error) {
        console.warn(`Failed to get top committees for cycle ${cycle}:`, error);
        topCommitteesByCycle[cycle] = [];
      }
    }

    // Top recipients (candidates) by cycle
    const topRecipientsByCycle: Record<number, any[]> = {};
    for (const cycle of cycles) {
      try {
        const topRecipientsQuery = `
          SELECT 
            cm.cand_name AS candidate_name,
            cm.cand_id,
            cm.cand_office_st AS state,
            cm.cand_office_district AS district,
            SUM(CAST(ccc.transaction_amt AS NUMERIC))::numeric AS total_support
          FROM committee_candidate_contributions ccc
          JOIN cfg_israel_committee_ids cic ON ccc.cmte_id = cic.fec_committee_id
          JOIN candidate_master cm ON ccc.cand_id = cm.cand_id
          WHERE cic.is_active = TRUE 
            AND ccc.file_year = $1 
            AND COALESCE(ccc.memo_cd,'') <> 'X'
          GROUP BY cm.cand_name, cm.cand_id, cm.cand_office_st, cm.cand_office_district
          ORDER BY total_support DESC
          LIMIT 10
        `;
        
        const topRecipientsResult = await executeQuery(topRecipientsQuery, [cycle], true, 30000);
        topRecipientsByCycle[cycle] = topRecipientsResult.success && topRecipientsResult.data ? topRecipientsResult.data : [];
      } catch (error) {
        console.warn(`Failed to get top recipients for cycle ${cycle}:`, error);
        topRecipientsByCycle[cycle] = [];
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        cycles,
        overview: overviewByCycle,
        topCommittees: topCommitteesByCycle,
        topRecipients: topRecipientsByCycle,
      },
    });
  } catch (error) {
    console.error('Israel Impact API error:', error);
    return NextResponse.json({ success: false, error: 'Failed to compute Israel lobby impact overview' }, { status: 500 });
  }
}


