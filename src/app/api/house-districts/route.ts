import { NextResponse } from 'next/server';
import { getHouseDistrictsData } from '@/lib/house-districts-working-final';

export async function GET() {
  try {
    const districtsData = await getHouseDistrictsData();
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