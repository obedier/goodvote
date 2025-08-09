import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/database';

export async function GET() {
  try {
    const result = await executeQuery(
      `SELECT 
        keyword_id,
        keyword,
        category,
        description,
        is_active,
        created_at,
        updated_at
      FROM cfg_israel_keywords 
      ORDER BY keyword`,
      [],
      true
    );

    if (!result.success) {
      return NextResponse.json(
        { error: 'Failed to fetch keywords', details: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json(result.data || []);
  } catch (error) {
    console.error('Error fetching keywords:', error);
    return NextResponse.json(
      { error: 'Failed to fetch keywords' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { keyword, category, description } = body;

    // Validate required fields
    if (!keyword) {
      return NextResponse.json(
        { error: 'Keyword is required' },
        { status: 400 }
      );
    }

    const result = await executeQuery(
      `INSERT INTO cfg_israel_keywords 
       (keyword, category, description) 
       VALUES ($1, $2, $3) 
       RETURNING *`,
      [keyword, category || 'general', description || null],
      true
    );

    if (!result.success) {
      return NextResponse.json(
        { error: 'Failed to create keyword', details: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json(result.data?.[0], { status: 201 });
  } catch (error) {
    console.error('Error creating keyword:', error);
    return NextResponse.json(
      { error: 'Failed to create keyword' },
      { status: 500 }
    );
  }
}
