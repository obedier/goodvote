import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/database';

export async function GET() {
  try {
    const result = await executeQuery(
      `SELECT 
        r.relationship_id,
        r.committee_id,
        r.related_committee_id,
        r.relationship_type,
        r.description,
        r.is_active,
        r.created_at,
        r.updated_at
      FROM cfg_israel_committee_committee_relationship r
      ORDER BY r.relationship_id`,
      [],
      true
    );

    if (!result.success) {
      return NextResponse.json(
        { error: 'Failed to fetch relationships', details: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json(result.data || []);
  } catch (error) {
    console.error('Error fetching relationships:', error);
    return NextResponse.json(
      { error: 'Failed to fetch relationships' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { committee_id, related_committee_id, relationship_type, description } = body;

    // Validate required fields
    if (!committee_id || !related_committee_id || !relationship_type) {
      return NextResponse.json(
        { error: 'Committee ID, Related Committee ID, and Relationship Type are required' },
        { status: 400 }
      );
    }

    const result = await executeQuery(
      `INSERT INTO cfg_israel_committee_committee_relationship 
       (committee_id, related_committee_id, relationship_type, description) 
       VALUES ($1, $2, $3, $4) 
       RETURNING *`,
      [committee_id, related_committee_id, relationship_type, description || null],
      true
    );

    if (!result.success) {
      return NextResponse.json(
        { error: 'Failed to create relationship', details: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json(result.data?.[0], { status: 201 });
  } catch (error) {
    console.error('Error creating relationship:', error);
    return NextResponse.json(
      { error: 'Failed to create relationship' },
      { status: 500 }
    );
  }
}
