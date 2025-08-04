import { NextRequest, NextResponse } from 'next/server';
import { getIsraelLobbyScore } from '@/lib/israel-lobby';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ personId: string }> }
) {
  try {
    const { personId } = await params;
    const { searchParams } = new URL(request.url);
    const electionYear = parseInt(searchParams.get('election_year') || '2024');

    const result = await getIsraelLobbyScore(personId, electionYear);

    if (!result.success) {
      return NextResponse.json({ 
        success: false, 
        error: result.error 
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: result.data
    });

  } catch (error) {
    console.error('Error in Israel lobby API:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to fetch Israel lobby data' 
    }, { status: 500 });
  }
} 