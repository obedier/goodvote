import { NextRequest, NextResponse } from 'next/server';
import { getFECDataOverview } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const electionYear = parseInt(searchParams.get('election_year') || '2024');

    // Add timeout to the entire operation
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Request timeout')), 5000);
    });

    const result = await Promise.race([
      getFECDataOverview(electionYear),
      timeoutPromise
    ]);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Failed to fetch FEC data overview' },
        { status: 500 }
      );
    }

    // Transform the data for better presentation
    const overview = {
      election_year: electionYear,
      tables: result.data?.map((row: any) => ({
        table_name: row.table_name,
        record_count: parseInt(row.record_count),
        description: getTableDescription(row.table_name)
      })) || [],
      total_records: result.data?.reduce((sum: number, row: any) => sum + parseInt(row.record_count), 0) || 0
    };

    return NextResponse.json({
      success: true,
      data: overview,
    });
  } catch (error) {
    console.error('API Error:', error);
    if (error.message === 'Request timeout') {
      return NextResponse.json(
        { error: 'Request timeout - data query took too long' },
        { status: 408 }
      );
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function getTableDescription(tableName: string): string {
  const descriptions: { [key: string]: string } = {
    'candidates': 'All candidates who filed with the FEC',
    'committees': 'All committees (PACs, campaigns, parties)',
    'contributions': 'All individual contributions to candidates and committees',
    'expenditures': 'All operating expenditures by committees',
    'committee_transactions': 'Committee-to-committee transactions',
    'pac_summaries': 'Summary financial data for PACs',
    'current_campaigns': 'Current campaign committees for House and Senate candidates',
    'candidate_committee_linkages': 'Links candidates to their authorized committees'
  };
  
  return descriptions[tableName] || 'FEC data table';
} 