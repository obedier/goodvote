import { NextRequest, NextResponse } from 'next/server';
import { getLobbyingOverview } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const electionYear = parseInt(searchParams.get('election_year') || '2024');

    const result = await getLobbyingOverview(electionYear);

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
    console.error('Lobbying overview API error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch lobbying overview data' },
      { status: 500 }
    );
  }
} 