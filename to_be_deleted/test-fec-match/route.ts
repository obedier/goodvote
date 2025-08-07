import { NextResponse } from 'next/server';
import { testFecMatch } from '@/lib/test-fec-match';

export async function GET() {
  try {
    const result = await testFecMatch();
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error in test-fec-match API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 