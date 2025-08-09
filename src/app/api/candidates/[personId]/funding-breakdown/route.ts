import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/database';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ personId: string }> }
) {
  try {
    const { personId } = await params;
    
    if (!personId) {
      return NextResponse.json(
        { error: 'Person ID is required' },
        { status: 400 }
      );
    }

    // Get candidate info
    const candidateResult = await executeQuery(
      `SELECT 
        pc.person_id,
        pc.display_name,
        pc.current_party,
        pc.election_year
      FROM person_candidates pc
      WHERE pc.person_id = $1
      ORDER BY pc.election_year DESC
      LIMIT 1`,
      [personId],
      true
    );

    if (!candidateResult.success || !candidateResult.data?.length) {
      return NextResponse.json(
        { error: 'Candidate not found' },
        { status: 404 }
      );
    }

    const candidate = candidateResult.data[0];

    // For now, return sample data structure - we'll implement the full funding breakdown later
    const sampleContributions = [
      {
        source_table: 'individual_contributions',
        contribution_receipt_amount: '5000',
        contributor_name: 'Sample Contributor',
        contributor_employer: 'Sample Company',
        contributor_occupation: 'Executive',
        contribution_receipt_date: '2024-01-15',
        committee_name: 'Sample Committee',
        committee_id: 'C00123456',
        committee_type: 'Q'
      }
    ];

    const totalAmount = 5000;
    const totalCount = 1;

    return NextResponse.json({
      success: true,
      candidate: {
        person_id: candidate.person_id,
        name: candidate.display_name,
        party: candidate.current_party,
        election_year: candidate.election_year
      },
      funding_breakdown: {
        total_amount: totalAmount,
        total_count: totalCount,
        contributions: sampleContributions
      }
    });

  } catch (error) {
    console.error('Error fetching funding breakdown:', error);
    return NextResponse.json(
      { error: 'Failed to fetch funding breakdown' },
      { status: 500 }
    );
  }
}
