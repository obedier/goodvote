import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/database';

export async function GET() {
  try {
    // Test the new view directly
    const testQuery = `
      SELECT COUNT(*) as count FROM v_congress_proisrael_funding WHERE election_year = 2024
    `;

    const result = await executeQuery(testQuery, [], true); // Use fec_gold database

    return NextResponse.json({
      success: true,
      message: 'Successfully tested v_congress_proisrael_funding view',
      result: result.data,
      viewExists: true
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'Failed to test v_congress_proisrael_funding view',
      viewExists: false
    }, { status: 500 });
  }
}
