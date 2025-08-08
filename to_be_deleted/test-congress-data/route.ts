import { NextResponse } from 'next/server';
import { testCongressData } from '@/lib/test-congress-data';

export async function GET() {
  try {
    const result = await testCongressData();
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error in test-congress-data API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 