import { NextRequest, NextResponse } from 'next/server';
import { performGlobalSearch } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    const type = searchParams.get('type');
    const state = searchParams.get('state');
    const party = searchParams.get('party');
    const election_year = searchParams.get('election_year');
    const min_amount = searchParams.get('min_amount');
    const max_amount = searchParams.get('max_amount');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    if (!query.trim()) {
      return NextResponse.json({
        success: true,
        data: [],
        pagination: {
          page,
          limit,
          total: 0,
          totalPages: 0,
        },
      });
    }

    const filters = {
      type: type || undefined,
      state: state || undefined,
      party: party || undefined,
      election_year: election_year ? parseInt(election_year) : undefined,
      min_amount: min_amount ? parseFloat(min_amount) : undefined,
      max_amount: max_amount ? parseFloat(max_amount) : undefined,
    };

    const result = await performGlobalSearch(query, filters, page, limit);

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
    console.error('Search API error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to perform search' },
      { status: 500 }
    );
  }
} 