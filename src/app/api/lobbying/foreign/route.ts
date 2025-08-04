import { NextRequest, NextResponse } from 'next/server';
import { getForeignLobbyData } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const country = searchParams.get('country');
    const focus = searchParams.get('focus');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    const filters = {
      search: search || undefined,
      country: country || undefined,
      focus: focus || undefined,
    };

    const result = await getForeignLobbyData(filters, page, limit);

    if (result.success) {
      return NextResponse.json({
        success: true,
        data: result.data,
        pagination: result.pagination,
      });
    } else {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Foreign lobby API error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch foreign lobby data' },
      { status: 500 }
    );
  }
} 