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

const fecCompleteConfig = {
  host: process.env.FEC_DB_HOST || process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.FEC_DB_PORT || process.env.DB_PORT || '5432'),
  database: process.env.FEC_DB_NAME || 'fec_gold',
  user: process.env.FEC_DB_USER || process.env.DB_USER || 'osamabedier',
  password: process.env.FEC_DB_PASSWORD || process.env.DB_PASSWORD || '',
  max: 3,
  min: 0,
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 3000,
  acquireTimeoutMillis: 3000,
};

const fecCompletePool = new Pool(fecCompleteConfig);

async function executeQuery(query: string, params: any[] = []) {
  const client = await fecCompletePool.connect();
  try {
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
      const financeResult = await getCandidateCampaignFinance(personId, electionYear as number);
      financeData = financeResult.success ? financeResult.data : null;
    }
    
    // Get career totals
    const careerResult = await getCandidateCareerTotals(personId);
    const careerData = careerResult.success ? careerResult.data : null;
    
    // Get top contributors for the specified election year
    const contributorsResult = await getCandidateTopContributors(personId, electionYear);
    const contributors = contributorsResult.success ? contributorsResult.data : [];
    
    // Get top industries for the specified election year
    const industriesResult = await getCandidateTopIndustries(personId, electionYear);
    const industries = industriesResult.success ? industriesResult.data : [];
    
    // Get election history
    const historyResult = await getCandidateElectionHistory(personId);
    const electionHistory = historyResult.success ? historyResult.data : [];
    
    // Get available election cycles
    const availableCycles = profileData.map((election: any) => election.election_year).sort((a: number, b: number) => b - a);
    
    // Create FEC and OpenSecrets links
    const fecLink = currentElection.cand_id ? `https://www.fec.gov/data/candidate/${currentElection.cand_id}/` : null;
    
    // Get OpenSecrets CRP ID from the house_senate_current_campaigns table
    let openSecretsLink = null;
    let congressLink = null;
    
    if (currentElection.cand_id) {
      const houseSenateQuery = `
        SELECT cand_name, cand_office_st, cand_office_district
        FROM house_senate_current_campaigns 
        WHERE cand_id = $1
      `;
      const houseSenateResult = await executeQuery(houseSenateQuery, [currentElection.cand_id]);
      
      if (houseSenateResult.success && houseSenateResult.data && houseSenateResult.data.length > 0) {
        const candidateData = houseSenateResult.data[0];
        
        // For now, create a basic OpenSecrets link using the candidate name
        // In a real implementation, we would need to map to CRP IDs
        const candidateName = candidateData.cand_name?.replace(/[^A-Z]/g, '') || '';
        openSecretsLink = `https://www.opensecrets.org/members-of-congress/search?q=${encodeURIComponent(candidateData.cand_name || '')}`;
        
        // Create Congress.gov link using the candidate name and state/district
        const state = candidateData.cand_office_st;
        const district = candidateData.cand_office_district;
        if (state && district) {
          congressLink = `https://www.congress.gov/members?q=%7B%22congress%22:%22119%22,%22state%22:%22${state}%22,%22district%22:%22${district}%22%7D`;
        }
      }
    }
    
    const candidateData = {
      person_id: currentElection.person_id,
      display_name: currentElection.display_name,
      state: currentElection.state,
      current_office: currentElection.current_office,
      current_district: currentElection.current_district,
      current_party: currentElection.current_party,
      total_elections: currentElection.total_elections,
      is_current_office_holder: currentElection.is_current_office_holder,
      member_id: currentElection.member_id,
      bio_id: currentElection.bio_id,
      cand_id: currentElection.cand_id,
      available_election_cycles: availableCycles,
      current_election_year: electionYear,
      links: {
        fec: fecLink,
        open_secrets: openSecretsLink,
        congress: congressLink
      },
      campaign_finance: financeData,
      career_totals: careerData,
      top_contributors: contributors,
      top_industries: industries,
      election_history: electionHistory
    };

    return NextResponse.json({
      success: true,
      data: candidateData,
    });

  } catch (error) {
    console.error('Error in candidate profile API:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to fetch candidate profile' 
    });
  }
} 