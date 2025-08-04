import { NextRequest, NextResponse } from 'next/server';
import { getIsraelLobbyOverview } from '@/lib/israel-lobby';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const electionYear = parseInt(searchParams.get('election_year') || '2024');

    const result = await getIsraelLobbyOverview(electionYear);

    if (!result.success) {
      return NextResponse.json({ 
        success: false, 
        error: result.error 
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: result.data
    });

  } catch (error) {
    console.error('Error in Israel lobby overview API:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to fetch Israel lobby overview' 
    }, { status: 500 });
  }
} 