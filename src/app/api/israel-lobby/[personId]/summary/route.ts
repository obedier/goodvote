import { NextRequest, NextResponse } from 'next/server';
import { getIsraelLobbySummary } from '@/lib/israel-lobby';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ personId: string }> }
) {
  try {
    const { personId } = await params;

    if (!personId) {
      return NextResponse.json(
        { success: false, error: 'Person ID is required' },
        { status: 400 }
      );
    }

    const result = await getIsraelLobbySummary(personId);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to fetch Israel lobby summary' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.data
    });

  } catch (error) {
    console.error('Error in Israel lobby summary API:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
} 