import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { 
  getCandidateProfile, 
  getCandidateCampaignFinance, 
  getCandidateCareerTotals,
  getCandidateTopContributors,
  getCandidateTopIndustries,
  getCandidateElectionHistory
} from '@/lib/candidates';
import { getIsraelLobbyScore } from '@/lib/israel-lobby';

const fecCompleteConfig = {
  host: process.env.FEC_DB_HOST || process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.FEC_DB_PORT || process.env.DB_PORT || '5432'),
  database: process.env.FEC_DB_NAME || 'fec_gold',
  user: process.env.FEC_DB_USER || process.env.DB_USER || 'osamabedier',
  password: process.env.FEC_DB_PASSWORD || process.env.DB_PASSWORD || '',
  max: 5, // Increased pool size
  min: 1,
  idleTimeoutMillis: 30000, // Increased timeout
  connectionTimeoutMillis: 5000, // Increased timeout
  acquireTimeoutMillis: 5000, // Increased timeout
};

const fecCompletePool = new Pool(fecCompleteConfig);

// Simple in-memory cache (in production, use Redis)
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCacheKey(personId: string, electionYear: string | number) {
  return `candidate:${personId}:${electionYear}`;
}

function getCachedData(key: string) {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  return null;
}

function setCachedData(key: string, data: any) {
  cache.set(key, {
    data,
    timestamp: Date.now()
  });
}

async function executeQuery(query: string, params: any[] = []) {
  const client = await fecCompletePool.connect();
  try {
    // Set a shorter timeout for individual queries
    await client.query('SET statement_timeout = 10000'); // 10 seconds
    const result = await client.query(query, params);
    return { success: true, data: result.rows };
  } catch (error) {
    console.error('Database query error:', error);
    return { success: false, error: error };
  } finally {
    client.release();
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ personId: string }> }
) {
  try {
    const { personId } = await params;
    const { searchParams } = new URL(request.url);
    const electionYearParam = searchParams.get('election_year');
    const electionYear = electionYearParam === 'career' ? 'career' : (electionYearParam ? parseInt(electionYearParam) : 2024);
    
    if (!personId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Person ID is required' 
      });
    }

    // Check cache first
    const cacheKey = getCacheKey(personId, electionYear);
    const cachedData = getCachedData(cacheKey);
    if (cachedData) {
      return NextResponse.json({
        success: true,
        data: cachedData,
        cached: true
      });
    }

    // Get candidate profile with all election cycles
    const profileResult = await getCandidateProfile(personId);
    if (!profileResult.success || !profileResult.data || profileResult.data.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'Candidate not found' 
      });
    }

    const profileData = profileResult.data;
    const currentElection = profileData[0]; // Most recent election
    
    // Get campaign finance data for the specified election year
    let financeData = null;
    if (electionYear === 'career') {
      // Use career totals for career view
      const careerResult = await getCandidateCareerTotals(personId);
      if (careerResult.success && careerResult.data && careerResult.data.length > 0) {
        const careerData = careerResult.data[0];
        financeData = {
          election_year: 'career',
          total_receipts: careerData.career_total_receipts || 0,
          total_individual_contributions: careerData.career_total_individual_contributions || 0,
          other_committee_contributions: careerData.career_other_committee_contributions || 0,
          party_committee_contributions: 0, // Not available in career totals
          transfers_from_auth: careerData.career_transfers_from_auth || 0,
          total_disbursements: careerData.career_total_disbursements || 0,
          cash_on_hand: 0, // Not available in career totals
          contribution_count: 0, // Not available in career totals
          avg_contribution: 0, // Not available in career totals
          self_financing: careerData.career_self_financing || 0,
          self_financing_percentage: 0, // Calculate if needed
          total_debt: (careerData.career_candidate_loans || 0) + (careerData.career_other_loans || 0) + (careerData.career_debts_owed_by || 0),
          debt_to_receipts_ratio: 0, // Calculate if needed
          total_pac_contributions: 0, // Not available in career totals
          pac_percentage: 0, // Not available in career totals
          // Outside spending not available in career totals
          bundled_contributions: 0,
          independent_expenditures_in_favor: 0,
          communication_costs_in_favor: 0,
          soft_money_in_favor: 0,
          spending_against: 0,
          total_outside_spending: 0,
          outside_spending_percentage: 0
        };
      }
    } else {
      // Get specific election year data with timeout
      try {
        const financeResult = await Promise.race([
          getCandidateCampaignFinance(personId, electionYear),
          new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error('Campaign finance query timeout')), 8000)
          )
        ]);
        
        if (financeResult.success && financeResult.data) {
          financeData = financeResult.data;
        }
      } catch (error) {
        console.warn('Campaign finance query failed, using fallback data:', error);
        // Use fallback data
        financeData = {
          election_year: electionYear,
          total_receipts: 0,
          total_individual_contributions: 0,
          other_committee_contributions: 0,
          party_committee_contributions: 0,
          transfers_from_auth: 0,
          total_disbursements: 0,
          cash_on_hand: 0,
          contribution_count: 0,
          avg_contribution: 0,
          self_financing: 0,
          self_financing_percentage: 0,
          total_debt: 0,
          debt_to_receipts_ratio: 0,
          total_pac_contributions: 0,
          pac_percentage: 0,
          total_contributions: 0,
          other_receipts: 0,
          total_outside_spending: 0,
          outside_spending_percentage: 0
        };
      }
    }

    // Get top contributors with timeout
    let topContributors = [];
    try {
      const contributorsResult = await Promise.race([
        getCandidateTopContributors(personId, typeof electionYear === 'number' ? electionYear : 2024),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Contributors query timeout')), 5000)
        )
      ]);
      
      if (contributorsResult.success && contributorsResult.data) {
        topContributors = contributorsResult.data;
      }
    } catch (error) {
      console.warn('Top contributors query failed:', error);
    }

    // Get top industries with timeout
    let topIndustries = [];
    try {
      const industriesResult = await Promise.race([
        getCandidateTopIndustries(personId, typeof electionYear === 'number' ? electionYear : 2024),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Industries query timeout')), 5000)
        )
      ]);
      
      if (industriesResult.success && industriesResult.data) {
        topIndustries = industriesResult.data;
      }
    } catch (error) {
      console.warn('Top industries query failed:', error);
    }

    // Get election history with timeout
    let electionHistory = [];
    try {
      const historyResult = await Promise.race([
        getCandidateElectionHistory(personId),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Election history query timeout')), 5000)
        )
      ]);
      
      if (historyResult.success && historyResult.data) {
        electionHistory = historyResult.data;
      }
    } catch (error) {
      console.warn('Election history query failed:', error);
    }

    // Get Israel lobby data with timeout
    let israelLobbyData = null;
    try {
      const israelResult = await Promise.race([
        getIsraelLobbyScore(personId, typeof electionYear === 'number' ? electionYear : 2024),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Israel lobby query timeout')), 5000)
        )
      ]);
      
      if (israelResult.success && israelResult.data) {
        israelLobbyData = israelResult.data;
      }
    } catch (error) {
      console.warn('Israel lobby query failed:', error);
    }

    const responseData = {
      person_id: personId,
      display_name: currentElection.display_name,
      state: currentElection.state,
      current_office: currentElection.current_office,
      current_district: currentElection.current_district,
      current_party: currentElection.current_party,
      total_elections: currentElection.total_elections,
      is_current_office_holder: currentElection.is_current_office_holder,
      member_id: currentElection.bio_id,
      bio_id: currentElection.bio_id,
      cand_id: currentElection.cand_id,
      available_election_cycles: profileData.map((p: any) => p.election_year),
      current_election_year: currentElection.election_year,
      links: {
        fec: `https://www.fec.gov/data/candidate/${currentElection.cand_id}/`,
        open_secrets: `https://www.opensecrets.org/members-of-congress/${currentElection.bio_id}`,
        congress: currentElection.bio_id ? `https://www.congress.gov/member/${currentElection.bio_id}` : undefined,
      },
      campaign_finance: financeData,
      career_totals: null, // Will be populated if needed
      top_contributors: topContributors,
      top_industries: topIndustries,
      election_history: electionHistory,
      israel_lobby: israelLobbyData,
    };

    // Cache the result
    setCachedData(cacheKey, responseData);

    return NextResponse.json({
      success: true,
      data: responseData,
    });
  } catch (error) {
    console.error('Candidate API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
} 