import { NextRequest, NextResponse } from 'next/server';
import { getRevolvingDoorData } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const industry = searchParams.get('industry');
    const agency = searchParams.get('agency');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    const filters = {
      search: search || undefined,
      industry: industry || undefined,
      agency: agency || undefined,
    };

    const result = await getRevolvingDoorData(filters, page, limit);

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
    console.error('Revolving door API error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch revolving door data' },
      { status: 500 }
    );
  }
} 