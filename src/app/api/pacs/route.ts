import { NextRequest, NextResponse } from 'next/server';
import { getPACSummaries, getTopPACs } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    
    if (action === 'top') {
      const electionYear = parseInt(searchParams.get('election_year') || '2024');
      const limit = parseInt(searchParams.get('limit') || '50');
      
      const result = await getTopPACs(electionYear, limit);
      
      if (!result.success) {
        return NextResponse.json(
          { error: 'Failed to fetch top PACs' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        data: result.data,
        rowCount: result.rowCount,
      });
    } else {
      // Regular PAC search
      const filters = {
        election_year: searchParams.get('election_year') ? parseInt(searchParams.get('election_year')!) : undefined,
        committee_id: searchParams.get('committee_id') || undefined,
        committee_name: searchParams.get('committee_name') || undefined,
        min_receipts: searchParams.get('min_receipts') ? parseFloat(searchParams.get('min_receipts')!) : undefined,
        max_receipts: searchParams.get('max_receipts') ? parseFloat(searchParams.get('max_receipts')!) : undefined,
        limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 100,
        offset: searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : 0,
      };

      const result = await getPACSummaries(filters);

      if (!result.success) {
        return NextResponse.json(
          { error: 'Failed to fetch PAC data' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        data: result.data,
        rowCount: result.rowCount,
      });
    }
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 