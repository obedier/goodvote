import { NextRequest, NextResponse } from 'next/server';
import { searchContributions } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    const state = searchParams.get('state');
    const occupation = searchParams.get('occupation');
    const employer = searchParams.get('employer');
    const committee_type = searchParams.get('committee_type');
    const min_amount = searchParams.get('min_amount');
    const max_amount = searchParams.get('max_amount');
    const election_year = searchParams.get('election_year');
    const transaction_type = searchParams.get('transaction_type');
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
      state: state || undefined,
      occupation: occupation || undefined,
      employer: employer || undefined,
      committee_type: committee_type || undefined,
      min_amount: min_amount ? parseFloat(min_amount) : undefined,
      max_amount: max_amount ? parseFloat(max_amount) : undefined,
      election_year: election_year ? parseInt(election_year) : undefined,
      transaction_type: transaction_type || undefined,
    };

    const result = await searchContributions(query, filters, page, limit);

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
    console.error('Contributions API error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to search contributions' },
      { status: 500 }
    );
  }
} 