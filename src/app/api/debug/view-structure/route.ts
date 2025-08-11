import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/database';

export async function GET() {
  try {
    // Test the new view structure
    const viewStructureQuery = `
      SELECT 
        column_name,
        data_type,
        is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'v_congress_proisrael_funding'
      ORDER BY ordinal_position
    `;

    const structureResult = await executeQuery(viewStructureQuery, [], false); // Use goodvote database for schema info

    // Test the view data with a sample
    const sampleDataQuery = `
      SELECT * FROM v_congress_proisrael_funding 
      LIMIT 5
    `;

    const sampleResult = await executeQuery(sampleDataQuery, [], true); // Use fec_gold database for view data

    return NextResponse.json({
      success: true,
      viewStructure: structureResult.data,
      sampleData: sampleResult.data,
      message: 'Successfully examined v_congress_proisrael_funding view'
    });

  } catch (error) {
    console.error('Error examining view structure:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'Failed to examine view structure'
    }, { status: 500 });
  }
}
