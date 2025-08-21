import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/database';

// Aggregated total net pro-Israel contributions across all candidates
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const cycleParam = searchParams.get('cycle');
    const cycles = cycleParam === 'all' ? null : (cycleParam ? [parseInt(cycleParam)] : [2024]);

    const query = `
      WITH committees AS (
        SELECT fec_committee_id FROM cfg_israel_committee_ids WHERE is_active = TRUE
      ),
      direct AS (
        SELECT SUM(ccc.transaction_amt)::numeric AS amount
        FROM committee_candidate_contributions ccc
        JOIN committees c ON ccc.cmte_id = c.fec_committee_id
        WHERE ccc.transaction_amt > 0
          AND COALESCE(ccc.memo_cd,'') <> 'X'
          ${cycles ? 'AND ccc.file_year = ANY($1)' : ''}
      ),
      ie AS (
        SELECT 
          SUM(CASE WHEN ie.support_oppose_indicator = 'S' THEN ie.expenditure_amount ELSE 0 END)::numeric AS support,
          SUM(CASE WHEN ie.support_oppose_indicator = 'O' THEN ie.expenditure_amount ELSE 0 END)::numeric AS opposition
        FROM independent_expenditures ie
        JOIN committees c ON ie.committee_id = c.fec_committee_id
        ${cycles ? 'WHERE ie.two_year_transaction_period = ANY($1)' : ''}
      )
      SELECT 
        COALESCE(direct.amount, 0) 
        + COALESCE(ie.support, 0)
        - COALESCE(ie.opposition, 0) AS total_pro_israel_contributions
      FROM direct, ie;
    `;

    const params = cycles ? [cycles] as any[] : [];
    const result = await executeQuery(query, params, true, 30000);
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error || 'Query failed' }, { status: 500 });
    }
    const total = result.data?.[0]?.total_pro_israel_contributions || 0;
    return NextResponse.json({ success: true, data: { total_pro_israel_contributions: Number(total), last_updated: new Date().toISOString() } });
  } catch (error) {
    console.error('Error computing Israel funding totals:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}


