import { NextRequest, NextResponse } from 'next/server';
import { SQL_QUERIES, substituteParams } from '@/config/sql-queries';
import { executeQuery } from '@/lib/database';

/**
 * Debug endpoint to export all SQL queries for easy access and debugging
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const queryName = searchParams.get('query');
    const personId = searchParams.get('personId') || 'EXAMPLE_PERSON_ID';
    const cycle = searchParams.get('cycle') || '2024';
    const testView = searchParams.get('testView');
    
    // Test the new view if requested
    if (testView === 'true') {
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
          message: 'Successfully tested v_congress_proisrael_funding view',
          viewStructure: structureResult.data,
          sampleData: sampleResult.data,
          viewExists: true
        });
      } catch (viewError) {
        return NextResponse.json({
          success: false,
          error: viewError instanceof Error ? viewError.message : 'Unknown error',
          message: 'Failed to test v_congress_proisrael_funding view',
          viewExists: false
        }, { status: 500 });
      }
    }
    
    if (queryName && queryName in SQL_QUERIES) {
      // Return specific query with example parameters
      const baseQuery = SQL_QUERIES[queryName as keyof typeof SQL_QUERIES];
      const exampleParams = [personId];
      
      // Add cycle filtering if applicable
      let processedQuery = baseQuery;
      if (baseQuery.includes('pc.person_id = $1')) {
        if (cycle === 'last3') {
          processedQuery = baseQuery.replace(
            'WHERE pc.person_id = $1',
            'WHERE pc.person_id = $1 AND cc.file_year IN (2020, 2022, 2024)'
          );
        } else if (cycle !== 'all') {
          const year = parseInt(cycle);
          processedQuery = baseQuery.replace(
            'WHERE pc.person_id = $1',
            `WHERE pc.person_id = $1 AND cc.file_year = ${year}`
          );
        }
      }
      
      const substitutedQuery = substituteParams(processedQuery, exampleParams);
      
      return NextResponse.json({
        query_name: queryName,
        raw_template: baseQuery,
        processed_query: processedQuery,
        substituted_query: substitutedQuery,
        example_params: exampleParams,
        cycle: cycle
      });
    }
    
    // Return all available queries
    const queryList = Object.keys(SQL_QUERIES).map(key => ({
      name: key,
      description: getQueryDescription(key),
      preview: SQL_QUERIES[key as keyof typeof SQL_QUERIES].substring(0, 200) + '...'
    }));
    
    return NextResponse.json({
      message: "Available SQL queries - Use ?query=QUERY_NAME to get specific query",
      total_queries: queryList.length,
      queries: queryList,
      usage: {
        get_specific_query: "/api/debug/sql-queries?query=ISRAEL_LOBBY_BULK_FUNDING",
        with_person_id: "/api/debug/sql-queries?query=ISRAEL_LOBBY_CONTRIBUTIONS_BY_PERSON&personId=P12345678&cycle=2024",
        test_view: "/api/debug/sql-queries?testView=true"
      }
    });
    
  } catch (error) {
    console.error('Error in SQL debug endpoint:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve SQL queries' },
      { status: 500 }
    );
  }
}

function getQueryDescription(queryName: string): string {
  const descriptions: Record<string, string> = {
    'ISRAEL_LOBBY_CONTRIBUTIONS_BY_PERSON': 'Get detailed Israel lobby contributions for a single person',
    'ISRAEL_LOBBY_TOTAL_BY_PERSON': 'Get total Israel lobby funding amount for a single person',
    'ISRAEL_LOBBY_BULK_FUNDING': 'Get Israel lobby funding for multiple people in bulk (corrected version)',
    'CONGRESS_MEMBERS_WITH_FUNDING': 'Get all congress members with their Israel funding amounts',
    'CANDIDATE_INFO_BY_PERSON': 'Get candidate information by person_id',
    'GET_CONFIG_COMMITTEES': 'Get active committee IDs from configuration',
    'GET_CONFIG_KEYWORDS': 'Get active keywords from configuration'
  };
  
  return descriptions[queryName] || 'SQL query for Israel lobby analysis';
}
