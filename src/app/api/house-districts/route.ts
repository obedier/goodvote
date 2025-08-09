import { NextResponse } from 'next/server';
import { getHouseDistrictsData } from '@/lib/house-districts-optimized';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const cycle = searchParams.get('cycle') || '2024';
    
    const districtsData = await getHouseDistrictsData(cycle);
    if (!districtsData.success) {
      return NextResponse.json(
        { error: districtsData.error },
        { status: 500 }
      );
    }
    return NextResponse.json(districtsData);
  } catch (error) {
    console.error('Error in house-districts API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 