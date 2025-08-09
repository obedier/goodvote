import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/database';

export async function GET() {
  try {
    const result = await executeQuery(
      `SELECT * FROM (
        SELECT DISTINCT ON (c.fec_committee_id)
          c.committee_id,
          c.fec_committee_id,
          c.category,
          c.is_active,
          c.created_at,
          c.updated_at,
          cm.cmte_nm as committee_name,
          cm.cmte_dsgn as committee_designation,
          cm.cmte_tp as committee_type
        FROM cfg_israel_committee_ids c
        LEFT JOIN committee_master cm ON c.fec_committee_id = cm.cmte_id
        ORDER BY c.fec_committee_id, c.created_at DESC
      ) subquery
      ORDER BY created_at DESC`,
      [],
      true
    );

    if (!result.success) {
      return NextResponse.json(
        { error: 'Failed to fetch committees', details: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json(result.data || []);
  } catch (error) {
    console.error('Error fetching committees:', error);
    return NextResponse.json(
      { error: 'Failed to fetch committees' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fec_committee_id, category } = body;

    // Validate required fields
    if (!fec_committee_id) {
      return NextResponse.json(
        { error: 'FEC Committee ID is required' },
        { status: 400 }
      );
    }

    const result = await executeQuery(
      `INSERT INTO cfg_israel_committee_ids 
       (fec_committee_id, category) 
       VALUES ($1, $2) 
       RETURNING *`,
      [fec_committee_id, category || 'general'],
      true
    );

    if (!result.success) {
      return NextResponse.json(
        { error: 'Failed to create committee', details: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json(result.data?.[0], { status: 201 });
  } catch (error) {
    console.error('Error creating committee:', error);
    return NextResponse.json(
      { error: 'Failed to create committee' },
      { status: 500 }
    );
  }
}
