import { NextRequest, NextResponse } from 'next/server';
import { getFECContributions, executeQuery } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const state = searchParams.get('state');
    const zipCode = searchParams.get('zip_code');
    const electionYear = parseInt(searchParams.get('election_year') || '2024');

    if (!state && !zipCode) {
      return NextResponse.json(
        { error: 'State or zip code is required' },
        { status: 400 }
      );
    }

    // Use the materialized view we created for state summaries
    const stateDataQuery = `
      SELECT 
        state,
        file_year,
        contribution_count,
        total_amount,
        unique_committees,
        unique_contributors,
        avg_amount
      FROM state_contributions_summary
      WHERE state = $1 AND file_year = $2
      ORDER BY file_year DESC
      LIMIT 1
    `;
    
    let stateData = null;
    try {
      const stateResult = await executeQuery(stateDataQuery, [state, electionYear]);
      if (stateResult.success && stateResult.data && stateResult.data.length > 0) {
        stateData = stateResult.data[0];
      }
    } catch (error) {
      console.warn('State data query failed, using fallback:', error);
    }
    
    // Get top cities for the state
    const topCitiesQuery = `
      SELECT 
        city,
        COUNT(*) as contribution_count,
        SUM(transaction_amt) as total_amount
      FROM individual_contributions ic
      WHERE ic.state = $1 
      AND ic.file_year = $2
      AND ic.transaction_amt > 0
      AND ic.city IS NOT NULL
      GROUP BY ic.city
      ORDER BY total_amount DESC
      LIMIT 5
    `;
    
    let topCities = [];
    try {
      const citiesResult = await executeQuery(topCitiesQuery, [state, electionYear]);
      if (citiesResult.success && citiesResult.data) {
        topCities = citiesResult.data.map(row => ({
          city: row.city,
          amount: parseFloat(row.total_amount || 0)
        }));
      }
    } catch (error) {
      console.warn('Top cities query failed:', error);
    }
    
    // Get top contributors for the state
    const topContributorsQuery = `
      SELECT 
        ic.name,
        COUNT(*) as contribution_count,
        SUM(ic.transaction_amt) as total_amount
      FROM individual_contributions ic
      WHERE ic.state = $1 
      AND ic.file_year = $2
      AND ic.transaction_amt > 0
      AND ic.name IS NOT NULL
      GROUP BY ic.name
      ORDER BY total_amount DESC
      LIMIT 5
    `;
    
    let topContributors = [];
    try {
      const contributorsResult = await executeQuery(topContributorsQuery, [state, electionYear]);
      if (contributorsResult.success && contributorsResult.data) {
        topContributors = contributorsResult.data.map(row => ({
          name: row.name,
          amount: parseFloat(row.total_amount || 0)
        }));
      }
    } catch (error) {
      console.warn('Top contributors query failed:', error);
    }
    
    // Get party breakdown
    const partyBreakdownQuery = `
      SELECT 
        pc.current_party,
        COUNT(*) as candidate_count
      FROM person_candidates pc
      WHERE pc.state = $1 
      AND pc.election_year = $2
      GROUP BY pc.current_party
    `;
    
    let partyBreakdown = { democrat: 0, republican: 0, other: 0 };
    try {
      const partyResult = await executeQuery(partyBreakdownQuery, [state, electionYear]);
      if (partyResult.success && partyResult.data) {
        const total = partyResult.data.reduce((sum, row) => sum + parseInt(row.candidate_count || 0), 0);
        partyResult.data.forEach(row => {
          const count = parseInt(row.candidate_count || 0);
          const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
          if (row.current_party === 'DEM') {
            partyBreakdown.democrat = percentage;
          } else if (row.current_party === 'REP') {
            partyBreakdown.republican = percentage;
          } else {
            partyBreakdown.other += percentage;
          }
        });
      }
    } catch (error) {
      console.warn('Party breakdown query failed:', error);
    }
    
    const realData = {
      state: state || 'Unknown',
      zip_code: zipCode || null,
      election_year: electionYear,
      total_contributions: stateData ? parseFloat(stateData.total_amount || 0) : 0,
      total_recipients: stateData ? parseInt(stateData.unique_contributors || 0) : 0,
      top_cities: topCities.length > 0 ? topCities : [
        { city: 'Data not available', amount: 0 }
      ],
      top_contributors: topContributors.length > 0 ? topContributors : [
        { name: 'Data not available', amount: 0 }
      ],
      party_breakdown: partyBreakdown,
      contribution_count: stateData ? parseInt(stateData.contribution_count || 0) : 0,
      note: stateData ? 'Real data from FEC database' : 'Limited data available for this state/year'
    };

    return NextResponse.json({
      success: true,
      data: realData,
    });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 