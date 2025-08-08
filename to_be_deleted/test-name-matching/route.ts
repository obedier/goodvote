import { NextResponse } from 'next/server';
import { testNameMatching } from '@/lib/test-name-matching';

export async function GET() {
  try {
    const result = await testNameMatching();
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error in test-name-matching API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 