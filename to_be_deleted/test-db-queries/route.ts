import { NextResponse } from 'next/server';
import { testDbQueries } from '@/lib/test-db-queries';

export async function GET() {
  try {
    const result = await testDbQueries();
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error in test-db-queries API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 