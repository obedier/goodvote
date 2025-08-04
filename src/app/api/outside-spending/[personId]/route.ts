import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/database';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ personId: string }> }
) {
  try {
    const { searchParams } = new URL(request.url);
    const { personId } = await params;
    const electionYear = parseInt(searchParams.get('election_year') || '2024');
    const spendingType = searchParams.get('type') || 'for';

    // First, get candidate information - be more flexible with election year
    const candidateQuery = `
      SELECT 
        pc.person_id,
        pc.display_name,
        pc.state,
        pc.current_office,
        pc.current_district,
        pc.current_party,
        pc.cand_id,
        pc.election_year
      FROM person_candidates pc
      WHERE pc.person_id = $1
      AND pc.election_year >= $2 - 4
      ORDER BY pc.election_year DESC
      LIMIT 1
    `;

    const candidateResult = await executeQuery(candidateQuery, [personId, electionYear], true);
    
    if (!candidateResult.success || candidateResult.data.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Candidate not found'
      }, { status: 404 });
    }

    const candidate = candidateResult.data[0];

    // Get outside spending details grouped by committee
    let spendingQuery = '';
    let queryParams: any[] = [];

    if (spendingType === 'for') {
      // Spending FOR the candidate - using committee contributions
      // This represents actual outside spending from other committees
      spendingQuery = `
        SELECT 
          ccc.cmte_id,
          cm.cmte_nm as committee_name,
          cm.cmte_tp as committee_type,
          cm.cmte_st as state,
          CAST(SUM(CAST(ccc.transaction_amt AS NUMERIC)) AS INTEGER) as total_amount,
          CAST(COUNT(*) AS INTEGER) as contribution_count,
          MIN(ccc.transaction_dt) as first_contribution_date,
          MAX(ccc.transaction_dt) as last_contribution_date,
          'SUPPORT' as support_oppose,
          STRING_AGG(DISTINCT ccc.transaction_tp, ', ') as transaction_types
        FROM committee_candidate_contributions ccc
        JOIN committee_master cm ON ccc.cmte_id = cm.cmte_id
        WHERE ccc.cand_id = $1
        AND ccc.file_year = $2
        AND ccc.transaction_amt > 0
        AND ccc.transaction_tp IN ('24A', '24E', '24C', '24N', '24K')
        GROUP BY ccc.cmte_id, cm.cmte_nm, cm.cmte_tp, cm.cmte_st
        ORDER BY total_amount DESC
        LIMIT 100
      `;
      queryParams = [candidate.cand_id, electionYear];
    } else {
      // Spending AGAINST the candidate - using committee contributions
      // This represents actual outside spending against the candidate
      spendingQuery = `
        SELECT 
          ccc.cmte_id,
          cm.cmte_nm as committee_name,
          cm.cmte_tp as committee_type,
          cm.cmte_st as state,
          CAST(SUM(CAST(ABS(ccc.transaction_amt) AS NUMERIC)) AS INTEGER) as total_amount,
          CAST(COUNT(*) AS INTEGER) as contribution_count,
          MIN(ccc.transaction_dt) as first_contribution_date,
          MAX(ccc.transaction_dt) as last_contribution_date,
          'OPPOSE' as support_oppose,
          STRING_AGG(DISTINCT ccc.transaction_tp, ', ') as transaction_types
        FROM committee_candidate_contributions ccc
        JOIN committee_master cm ON ccc.cmte_id = cm.cmte_id
        WHERE ccc.cand_id = $1
        AND ccc.file_year = $2
        AND ccc.transaction_amt < 0
        AND ccc.transaction_tp IN ('24A', '24E', '24C', '24N', '24K')
        GROUP BY ccc.cmte_id, cm.cmte_nm, cm.cmte_tp, cm.cmte_st
        ORDER BY total_amount DESC
        LIMIT 100
      `;
      queryParams = [candidate.cand_id, electionYear];
    }

    const spendingResult = await executeQuery(spendingQuery, queryParams, true);
    const spendingDetails = spendingResult.success ? spendingResult.data : [];

    // Calculate totals
    const totalAmount = spendingDetails.reduce((sum: number, detail: any) => sum + parseFloat(detail.total_amount || 0), 0);
    const totalContributions = spendingDetails.reduce((sum: number, detail: any) => sum + parseInt(detail.contribution_count || 0), 0);
    const committeeCount = spendingDetails.length;

    // Use the actual committee contributions data for outside spending
    // This represents real outside spending from other committees
    const finalTotalAmount = totalAmount;

    return NextResponse.json({
      success: true,
      candidate_info: {
        person_id: candidate.person_id,
        display_name: candidate.display_name,
        state: candidate.state,
        current_office: candidate.current_office,
        current_district: candidate.current_district,
        current_party: candidate.current_party,
        election_year: candidate.election_year
      },
      spending_details: spendingDetails,
      total_amount: finalTotalAmount,
      total_contributions: totalContributions,
      committee_count: committeeCount,
      election_year: electionYear,
      spending_type: spendingType
    });

  } catch (error) {
    console.error('Error fetching outside spending details:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch outside spending details'
    }, { status: 500 });
  }
} 