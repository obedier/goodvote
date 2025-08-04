import { NextRequest, NextResponse } from 'next/server';
import { getSearchSuggestions } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';

    if (!query.trim() || query.length < 2) {
      return NextResponse.json({
        success: true,
        data: [],
      });
    }

    const result = await getSearchSuggestions(query);

    if (result.success) {
      return NextResponse.json({
        success: true,
        data: result.data,
      });
    } else {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Search suggestions API error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get search suggestions' },
      { status: 500 }
    );
  }
} 