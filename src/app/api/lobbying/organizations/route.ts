import { NextRequest, NextResponse } from 'next/server';
import { getOrganizations } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const industry = searchParams.get('industry');
    const type = searchParams.get('type');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    const filters = {
      search: search || undefined,
      industry: industry || undefined,
      type: type || undefined,
    };

    const result = await getOrganizations(filters, page, limit);

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
    console.error('Organizations API error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch organizations data' },
      { status: 500 }
    );
  }
} 