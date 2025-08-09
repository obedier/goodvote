import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');

    if (!query || query.length < 2) {
      return NextResponse.json([]);
    }

    // Search committee_master for committees that aren't already in cfg_israel_committee_ids
    const result = await executeQuery(
      `SELECT DISTINCT 
        cm.cmte_id,
        cm.cmte_nm,
        cm.cmte_tp,
        cm.cmte_dsgn,
        cm.cmte_pty_affiliation
      FROM committee_master cm
      WHERE cm.cmte_nm ILIKE $1
        AND cm.cmte_id NOT IN (
          SELECT fec_committee_id 
          FROM cfg_israel_committee_ids 
          WHERE fec_committee_id IS NOT NULL
        )
      ORDER BY cm.cmte_nm
      LIMIT 20`,
      [`%${query}%`],
      true
    );

    if (!result.success) {
      return NextResponse.json(
        { error: 'Failed to search committees', details: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json(result.data || []);
  } catch (error) {
    console.error('Error searching committees:', error);
    return NextResponse.json(
      { error: 'Failed to search committees' },
      { status: 500 }
    );
  }
}
