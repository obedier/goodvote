import { NextRequest, NextResponse } from 'next/server';
import { 
  getCandidateProfile, 
  getCandidateCampaignFinance, 
  getCandidateCareerTotals,
  getCandidateTopContributors,
  getCandidateTopIndustries,
  getCandidateElectionHistory
} from '@/lib/candidates';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ personId: string }> }
) {
  try {
    const { personId } = await params;
    const { searchParams } = new URL(request.url);
    const electionYear = searchParams.get('election_year') ? parseInt(searchParams.get('election_year')!) : 2024;
    
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
    const financeResult = await getCandidateCampaignFinance(personId, electionYear);
    const financeData = financeResult.success ? financeResult.data : null;
    
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
    const openSecretsLink = currentElection.cand_id ? `https://www.opensecrets.org/members-of-congress/${currentElection.cand_id}` : null;
    const congressLink = currentElection.bio_id ? `https://www.congress.gov/member/${currentElection.bio_id}` : null;
    
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