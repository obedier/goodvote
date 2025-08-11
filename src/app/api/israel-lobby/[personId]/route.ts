import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/database';
import { SQL_QUERIES, substituteParams } from '@/config/sql-queries';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ personId: string }> }
) {
  try {
    const { personId } = await params;
    const { searchParams } = new URL(request.url);
    const cycleParam = searchParams.get('cycle') || '2024'; // Default to 2024
    
    if (!personId) {
      return NextResponse.json(
        { error: 'Person ID is required' },
        { status: 400 }
      );
    }

    // Determine years to query based on cycle parameter
    let yearCondition = '';
    let candidateParams: any[] = [personId];
    
    if (cycleParam === 'last3') {
      yearCondition = 'AND pc.election_year IN (2020, 2022, 2024)';
    } else if (cycleParam === 'all') {
      yearCondition = ''; // No year restriction
    } else {
      const year = parseInt(cycleParam);
      yearCondition = 'AND pc.election_year = $2';
      candidateParams.push(year);
    }

    // Get candidate info using centralized query
    let candidateQuery = SQL_QUERIES.CANDIDATE_INFO_BY_PERSON;
    
    // Add year condition if needed
    if (yearCondition) {
      candidateQuery = candidateQuery.replace(
        'WHERE pc.person_id = $1',
        `WHERE pc.person_id = $1 ${yearCondition}`
      );
    }
    
    const candidateResult = await executeQuery(
      candidateQuery,
      candidateParams,
      true
    );

    if (!candidateResult.success || !candidateResult.data || candidateResult.data.length === 0) {
      return NextResponse.json(
        { error: 'Candidate not found' },
        { status: 404 }
      );
    }

    const candidate = candidateResult.data[0];

    // Use centralized SQL query for contributions
    let realContributionsQuery = SQL_QUERIES.ISRAEL_LOBBY_CONTRIBUTIONS_BY_PERSON;

    // Add cycle filtering to the centralized query
    let completeQuery = realContributionsQuery;
    let queryParams: any[] = [personId];
    
    if (cycleParam === 'last3') {
      completeQuery = completeQuery.replace(
        'WHERE pc.person_id = $1',
        'WHERE pc.person_id = $1 AND cc.file_year IN (2020, 2022, 2024)'
      );
    } else if (cycleParam === 'all') {
      // No additional year filter needed
    } else {
      const year = parseInt(cycleParam);
      completeQuery = completeQuery.replace(
        'WHERE pc.person_id = $1',
        'WHERE pc.person_id = $1 AND cc.file_year = $2'
      );
      queryParams.push(year);
    }
    
    // Generate debug SQL for logging
    const debugSql = substituteParams(completeQuery, queryParams);
    console.log(`🔍 Israel Lobby Detail Query for ${personId} (cycle: ${cycleParam})`);
    console.log(`📝 SQL Preview: ${debugSql.substring(0, 200)}...`);

    const realContributionsResult = await executeQuery(
      completeQuery,
      queryParams,
      true
    );

    if (!realContributionsResult.success || !realContributionsResult.data) {
      console.error('🚨 Failed to fetch contributions data:', realContributionsResult.error);
      return NextResponse.json(
        { error: 'Failed to fetch contributions data', details: realContributionsResult.error },
        { status: 500 }
      );
    }

    console.log(`📊 Found ${realContributionsResult.data.length} contribution records`);

    // The centralized query already includes FEC document URLs and proper field mapping
    const allContributions = realContributionsResult.data.map((record: any) => ({
      source_table: record.source_table,
      unique_identifier: record.unique_identifier,
      image_num: record.image_num,
      election_cycle_year: record.election_cycle_year,
      transaction_type: record.transaction_type,
      contribution_receipt_amount: parseFloat(record.contribution_receipt_amount),
      committee_name: record.committee_name,
      committee_id: record.committee_id,
      committee_type: record.committee_type,
      committee_designation: record.committee_designation,
      contribution_receipt_date: record.contribution_receipt_date,
      transaction_type_code: record.transaction_type_code,
      fec_document_url: record.fec_document_url
    }));

    // Calculate totals
    const totalAmount = allContributions.reduce((sum: number, contrib: any) => sum + contrib.contribution_receipt_amount, 0);
    const totalCount = allContributions.length;

    // Group data for summary view
    const summaryMap = new Map();
    allContributions.forEach((contrib: any) => {
      const key = `${contrib.committee_name}|${contrib.transaction_type}|${contrib.election_cycle_year}`;
      if (!summaryMap.has(key)) {
        summaryMap.set(key, {
          committee_name: contrib.committee_name,
          transaction_type: contrib.transaction_type,
          election_cycle_year: contrib.election_cycle_year,
          total_amount: 0,
          record_count: 0
        });
      }
      const summary = summaryMap.get(key);
      summary.total_amount += contrib.contribution_receipt_amount;
      summary.record_count += 1;
    });

    const summaryData = Array.from(summaryMap.values()).sort((a, b) => b.total_amount - a.total_amount);

    // Calculate totals by category (committee type, transaction type, etc.)
    const totalsByCategory: { [key: string]: { amount: number; count: number } } = {};

    allContributions.forEach((contrib: any) => {
      // By committee
      const committeeName = contrib.committee_name;
      if (!totalsByCategory[committeeName]) {
        totalsByCategory[committeeName] = { amount: 0, count: 0 };
      }
      totalsByCategory[committeeName].amount += contrib.contribution_receipt_amount;
      totalsByCategory[committeeName].count += 1;

      // By transaction type
      const transactionType = contrib.transaction_type;
      if (!totalsByCategory[transactionType]) {
        totalsByCategory[transactionType] = { amount: 0, count: 0 };
      }
      totalsByCategory[transactionType].amount += contrib.contribution_receipt_amount;
      totalsByCategory[transactionType].count += 1;

      // By election year
      const yearKey = `Year ${contrib.election_cycle_year}`;
      if (!totalsByCategory[yearKey]) {
        totalsByCategory[yearKey] = { amount: 0, count: 0 };
      }
      totalsByCategory[yearKey].amount += contrib.contribution_receipt_amount;
      totalsByCategory[yearKey].count += 1;
    });

    return NextResponse.json({
      candidate: {
        person_id: candidate.person_id,
        fec_id: candidate.cand_id,
        name: candidate.display_name,
        party: candidate.current_party,
        election_year: candidate.election_year
      },
      funding_breakdown: {
        total_amount: totalAmount,
        total_count: totalCount,
        totals_by_category: totalsByCategory,
        summary_data: summaryData,
        contributions: allContributions
      },
      debug: {
        sql_query: debugSql, // The actual SQL query with substituted parameters
        raw_sql_template: completeQuery, // The template with placeholders
        query_source: "Centralized SQL config: SQL_QUERIES.ISRAEL_LOBBY_CONTRIBUTIONS_BY_PERSON",
        person_id: personId,
        cycle_param: cycleParam,
        total_records: allContributions.length,
        total_amount: totalAmount,
        query_params: queryParams,
        note: "🔧 UPDATED: Now using centralized SQL config with corrected deduplication logic"
      }
    });

  } catch (error) {
    console.error('Error fetching Israel lobby funding:', error);
    return NextResponse.json(
      { error: 'Failed to fetch Israel lobby funding' },
      { status: 500 }
    );
  }
}