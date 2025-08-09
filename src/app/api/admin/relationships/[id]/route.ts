import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/database';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = await executeQuery(
      `SELECT * FROM cfg_israel_committee_committee_relationship WHERE relationship_id = $1`,
      [id],
      true
    );

    if (!result.success || !result.data || result.data.length === 0) {
      return NextResponse.json(
        { error: 'Relationship not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(result.data[0]);
  } catch (error) {
    console.error('Error fetching relationship:', error);
    return NextResponse.json(
      { error: 'Failed to fetch relationship' },
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
    const { is_active, committee_id, related_committee_id, relationship_type, description } = body;

    let query = 'UPDATE cfg_israel_committee_committee_relationship SET updated_at = CURRENT_TIMESTAMP';
    const values: any[] = [];
    let paramCount = 1;

    if (is_active !== undefined) {
      query += `, is_active = $${paramCount}`;
      values.push(is_active);
      paramCount++;
    }

    if (committee_id !== undefined) {
      query += `, committee_id = $${paramCount}`;
      values.push(committee_id);
      paramCount++;
    }

    if (related_committee_id !== undefined) {
      query += `, related_committee_id = $${paramCount}`;
      values.push(related_committee_id);
      paramCount++;
    }

    if (relationship_type !== undefined) {
      query += `, relationship_type = $${paramCount}`;
      values.push(relationship_type);
      paramCount++;
    }

    if (description !== undefined) {
      query += `, description = $${paramCount}`;
      values.push(description);
      paramCount++;
    }

    query += ` WHERE relationship_id = $${paramCount} RETURNING *`;
    values.push(id);

    const result = await executeQuery(query, values, true);

    if (!result.success || !result.data || result.data.length === 0) {
      return NextResponse.json(
        { error: 'Relationship not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(result.data[0]);
  } catch (error) {
    console.error('Error updating relationship:', error);
    return NextResponse.json(
      { error: 'Failed to update relationship' },
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
      'DELETE FROM cfg_israel_committee_committee_relationship WHERE relationship_id = $1 RETURNING *',
      [id],
      true
    );

    if (!result.success || !result.data || result.data.length === 0) {
      return NextResponse.json(
        { error: 'Relationship not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: 'Relationship deleted successfully' });
  } catch (error) {
    console.error('Error deleting relationship:', error);
    return NextResponse.json(
      { error: 'Failed to delete relationship' },
      { status: 500 }
    );
  }
}
