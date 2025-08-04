import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/database';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ personId: string; committeeId: string }> }
) {
  try {
    const { personId, committeeId } = await params;
    const { searchParams } = new URL(request.url);
    const electionYear = parseInt(searchParams.get('election_year') || '2024');
    const spendingType = searchParams.get('type') || 'for';

    // Get candidate information
    const candidateQuery = `
      SELECT DISTINCT pc.person_id, pc.display_name, pc.state, pc.current_office, pc.current_district, pc.current_party, pc.election_year, pc.cand_id
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

    // Get committee information
    const committeeQuery = `
      SELECT cmte_id, cmte_nm, cmte_tp, cmte_st
      FROM committee_master
      WHERE cmte_id = $1
      AND file_year = $2
      LIMIT 1
    `;
    
    const committeeResult = await executeQuery(committeeQuery, [committeeId, electionYear], true);
    
    if (!committeeResult.success || committeeResult.data.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Committee not found'
      }, { status: 404 });
    }

    const committee = committeeResult.data[0];

    // Get individual transactions
    let transactionsQuery = '';
    let queryParams: any[] = [];

    if (spendingType === 'for') {
      transactionsQuery = `
        SELECT 
          ccc.sub_id as transaction_id,
          ccc.transaction_dt,
          CAST(ccc.transaction_amt AS NUMERIC) as transaction_amt,
          ccc.name,
          ccc.transaction_tp,
          ccc.memo_text
        FROM committee_candidate_contributions ccc
        WHERE ccc.cand_id = $1
        AND ccc.cmte_id = $2
        AND ccc.file_year = $3
        AND ccc.transaction_amt > 0
        AND ccc.transaction_tp IN ('24A', '24E', '24C', '24N', '24K')
        ORDER BY ccc.transaction_dt DESC, ccc.transaction_amt DESC
        LIMIT 1000
      `;
      queryParams = [candidate.cand_id, committeeId, electionYear];
    } else {
      transactionsQuery = `
        SELECT 
          ccc.sub_id as transaction_id,
          ccc.transaction_dt,
          CAST(ABS(ccc.transaction_amt) AS NUMERIC) as transaction_amt,
          ccc.name,
          ccc.transaction_tp,
          ccc.memo_text
        FROM committee_candidate_contributions ccc
        WHERE ccc.cand_id = $1
        AND ccc.cmte_id = $2
        AND ccc.file_year = $3
        AND ccc.transaction_amt < 0
        AND ccc.transaction_tp IN ('24A', '24E', '24C', '24N', '24K')
        ORDER BY ccc.transaction_dt DESC, ABS(ccc.transaction_amt) DESC
        LIMIT 1000
      `;
      queryParams = [candidate.cand_id, committeeId, electionYear];
    }

    const transactionsResult = await executeQuery(transactionsQuery, queryParams, true);
    const transactions = transactionsResult.success ? transactionsResult.data : [];

    return NextResponse.json({
      success: true,
      transactions: transactions,
      committee_info: {
        cmte_id: committee.cmte_id,
        cmte_nm: committee.cmte_nm,
        cmte_tp: committee.cmte_tp,
        cmte_st: committee.cmte_st
      },
      candidate_info: {
        person_id: candidate.person_id,
        display_name: candidate.display_name,
        state: candidate.state,
        current_office: candidate.current_office,
        current_district: candidate.current_district,
        current_party: candidate.current_party,
        election_year: candidate.election_year
      },
      election_year: electionYear,
      spending_type: spendingType
    });

  } catch (error) {
    console.error('Error fetching transactions:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch transactions'
    }, { status: 500 });
  }
} 