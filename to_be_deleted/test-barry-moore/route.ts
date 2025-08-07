import { NextResponse } from 'next/server';
import { testBarryMoore } from '@/lib/test-barry-moore';

export async function GET() {
  try {
    const result = await testBarryMoore();
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error in test-barry-moore API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 