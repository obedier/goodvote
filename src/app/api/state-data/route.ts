import { NextRequest, NextResponse } from 'next/server';
import { getFECContributions } from '@/lib/database';

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

    // Build query based on state or zip code
    let query = `
      SELECT 
        ic.contributor_state,
        ic.contributor_city,
        ic.contributor_zip,
        ic.contributor_name,
        ic.contribution_amount,
        ic.contribution_date,
        cm.committee_name,
        cm.committee_type,
        cm.committee_party
      FROM fec_contributions ic
      LEFT JOIN fec_committees cm ON ic.committee_id = cm.committee_id
      WHERE ic.election_year = $1
    `;
    
    const params: any[] = [electionYear];
    let paramIndex = 2;

    if (state) {
      query += ` AND ic.contributor_state = $${paramIndex}`;
      params.push(state);
      paramIndex++;
    }

    if (zipCode) {
      query += ` AND ic.contributor_zip LIKE $${paramIndex}`;
      params.push(`${zipCode}%`);
      paramIndex++;
    }

    query += ` ORDER BY ic.contribution_amount DESC LIMIT 1000`;

    const result = await getFECContributions({
      election_year: electionYear,
      limit: 1000,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: 'Failed to fetch state data' },
        { status: 500 }
      );
    }

    // Process the data to create summary statistics
    const contributions = result.data || [];
    
    // Calculate totals
    const totalContributions = contributions.reduce((sum: number, c: any) => sum + (c.contribution_amount || 0), 0);
    const uniqueRecipients = new Set(contributions.map((c: any) => c.committee_id)).size;
    
    // Group by city
    const cityTotals: { [key: string]: number } = {};
    contributions.forEach((c: any) => {
      if (c.contributor_city) {
        cityTotals[c.contributor_city] = (cityTotals[c.contributor_city] || 0) + (c.contribution_amount || 0);
      }
    });
    
    // Top cities
    const topCities = Object.entries(cityTotals)
      .map(([city, amount]) => ({ city, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);

    // Group by contributor
    const contributorTotals: { [key: string]: number } = {};
    contributions.forEach((c: any) => {
      if (c.contributor_name) {
        contributorTotals[c.contributor_name] = (contributorTotals[c.contributor_name] || 0) + (c.contribution_amount || 0);
      }
    });
    
    // Top contributors
    const topContributors = Object.entries(contributorTotals)
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);

    // Party breakdown
    const partyTotals: { [key: string]: number } = {};
    contributions.forEach((c: any) => {
      const party = c.committee_party || 'Other';
      partyTotals[party] = (partyTotals[party] || 0) + (c.contribution_amount || 0);
    });

    const totalPartyAmount = Object.values(partyTotals).reduce((sum: number, amount: number) => sum + amount, 0);
    const partyBreakdown = {
      democrat: totalPartyAmount > 0 ? Math.round((partyTotals['DEM'] || 0) / totalPartyAmount * 100) : 0,
      republican: totalPartyAmount > 0 ? Math.round((partyTotals['REP'] || 0) / totalPartyAmount * 100) : 0,
      other: totalPartyAmount > 0 ? Math.round((partyTotals['Other'] || 0) / totalPartyAmount * 100) : 0,
    };

    const summary = {
      state: state || 'Unknown',
      zip_code: zipCode || null,
      election_year: electionYear,
      total_contributions: totalContributions,
      total_recipients: uniqueRecipients,
      top_cities: topCities,
      top_contributors: topContributors,
      party_breakdown: partyBreakdown,
      contribution_count: contributions.length,
    };

    return NextResponse.json({
      success: true,
      data: summary,
    });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 