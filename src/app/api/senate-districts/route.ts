import { NextResponse } from 'next/server';
import { getSenateDistrictsData } from '@/lib/senate-districts';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const cycle = searchParams.get('cycle') || '2024';
    
    const districtsData = await getSenateDistrictsData(cycle);
    if (!districtsData.success) {
      return NextResponse.json(
        { error: districtsData.error },
        { status: 500 }
      );
    }
    return NextResponse.json(districtsData);
  } catch (error) {
    console.error('Error in senate-districts API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
