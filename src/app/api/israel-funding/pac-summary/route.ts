import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/database';

export async function GET() {
  try {
    const query = `
      SELECT 
        cm.cmte_nm AS committee_name,
        SUM(ps.ttl_disb)::numeric AS total_disbursements,
        SUM(ps.tranf_to_aff)::numeric AS transfers_to_affiliates,
        SUM(ps.cand_contrib)::numeric AS candidate_contributions,
        SUM(ps.ttl_receipts)::numeric AS total_receipts
      FROM pac_summary ps
      JOIN committee_master cm ON cm.cmte_id = ps.cmte_id
      WHERE ps.cmte_id IN (
        SELECT fec_committee_id FROM cfg_israel_committee_ids
      )
      GROUP BY cm.cmte_nm
      ORDER BY total_disbursements DESC
    `;

    const result = await executeQuery(query, [], true);
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error || 'Query failed' }, { status: 500 });
    }
    return NextResponse.json({ success: true, data: result.data || [] });
  } catch (error) {
    console.error('Error fetching Israel funding PAC summary:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}



