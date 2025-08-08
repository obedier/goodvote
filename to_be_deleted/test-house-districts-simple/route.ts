import { NextResponse } from 'next/server';
import { testHouseDistrictsSimple } from '@/lib/test-house-districts-simple';

export async function GET() {
  try {
    const result = await testHouseDistrictsSimple();
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error in test-house-districts-simple API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 