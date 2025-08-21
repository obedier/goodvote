import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/database';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = await executeQuery(
      `SELECT 
        c.id AS committee_id,
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
      WHERE c.id = $1`,
      [id],
      true
    );

    if (!result.success || !result.data || result.data.length === 0) {
      return NextResponse.json(
        { error: 'Committee not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(result.data[0]);
  } catch (error) {
    console.error('Error fetching committee:', error);
    return NextResponse.json(
      { error: 'Failed to fetch committee' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { is_active, committee_name, description, category } = body;

    let query = 'UPDATE cfg_israel_committee_ids SET updated_at = CURRENT_TIMESTAMP';
    const values: any[] = [];
    let paramCount = 1;

    if (is_active !== undefined) {
      query += `, is_active = $${paramCount}`;
      values.push(is_active);
      paramCount++;
    }

    if (committee_name !== undefined) {
      query += `, committee_name = $${paramCount}`;
      values.push(committee_name);
      paramCount++;
    }

    if (description !== undefined) {
      query += `, description = $${paramCount}`;
      values.push(description);
      paramCount++;
    }

    if (category !== undefined) {
      query += `, category = $${paramCount}`;
      values.push(category);
      paramCount++;
    }

    query += ` WHERE id = $${paramCount} RETURNING *`;
    values.push(id);

    const result = await executeQuery(query, values, true);

    if (!result.success || !result.data || result.data.length === 0) {
      return NextResponse.json(
        { error: 'Committee not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(result.data[0]);
  } catch (error) {
    console.error('Error updating committee:', error);
    return NextResponse.json(
      { error: 'Failed to update committee' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = await executeQuery(
      'DELETE FROM cfg_israel_committee_ids WHERE id = $1 RETURNING *',
      [id],
      true
    );

    if (!result.success || !result.data || result.data.length === 0) {
      return NextResponse.json(
        { error: 'Committee not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: 'Committee deleted successfully' });
  } catch (error) {
    console.error('Error deleting committee:', error);
    return NextResponse.json(
      { error: 'Failed to delete committee' },
      { status: 500 }
    );
  }
}
