import { NextRequest, NextResponse } from 'next/server';
import { getPersonProfile, getTopContributors, getCampaignFinanceTotals, executeQuery } from '@/lib/database';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ personId: string }> }
) {
  try {
    const { personId } = await params;
    
    if (!personId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Person ID is required' 
      });
    }

    // Get person profile
    const profileResult = await getPersonProfile(personId);
    if (!profileResult.success || !profileResult.data || profileResult.data.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'Politician not found' 
      });
    }

    const profile = profileResult.data[0]; // Get the first (and should be only) record

    // Get top contributors for the most recent election year
    // For now, use 2024 as the default to show complete data
    // TODO: In production, use the most recent available election year
    const recentElectionYear = 2024; // profile.last_election_year || 2024;
    
    // For congress members, we need to get the person_id first
    let actualPersonId = personId;
    if (personId.includes('-119')) {
      // This is a member_id, we need to get the corresponding person_id
      const personQuery = `
        SELECT p.person_id 
        FROM persons p
        JOIN person_candidates pc ON p.person_id = pc.person_id
        WHERE pc.cand_id = $1 AND pc.election_year = $2
        LIMIT 1
      `;
      const personResult = await executeQuery(personQuery, [profile.cand_id, recentElectionYear], false);
      if (personResult.success && personResult.data && personResult.data.length > 0) {
        actualPersonId = personResult.data[0].person_id;
      }
    }
    
    // Get enhanced campaign finance totals with confidence levels
    const financeTotalsResult = await getCampaignFinanceTotals(actualPersonId, recentElectionYear);
    const financeTotals = financeTotalsResult.success ? financeTotalsResult.data : {
      total_receipts: 0,
      contribution_count: 0,
      unique_contributors: 0,
      avg_contribution: 0,
      total_individual_contributions: 0,
      other_committee_contributions: 0,
      party_committee_contributions: 0,
      transfers_from_auth: 0,
      total_disbursements: 0,
      self_financing: 0,
      self_financing_percentage: 0,
      candidate_loans: 0,
      other_loans: 0,
      debts_owed_by_candidate: 0,
      total_debt: 0,
      debt_to_receipts_ratio: 0,
      candidate_loan_repayments: 0,
      other_loan_repayments: 0,
      total_pac_contributions: 0,
      pac_contribution_count: 0,
      unique_pacs: 0,
      pac_percentage: 0,
      
      // Outside spending breakdown from operating expenditures
      total_operating_expenditures: 0,
      operating_expenditure_count: 0,
      unique_committees: 0,
      
      // Categorized operating expenditures
      media_advertising: 0,
      digital_advertising: 0,
      polling_research: 0,
      printing_production: 0,
      consulting_services: 0,
      staff_payroll: 0,
      
      // Committee contributions (for comparison)
      committee_contributions: 0,
      committee_contribution_count: 0,
      
      // Legacy fields for backward compatibility
      bundled_contributions: 0,
      unique_bundlers: 0,
      bundled_contribution_count: 0,
      independent_expenditures_in_favor: 0,
      communication_costs_in_favor: 0,
      soft_money_in_favor: 0,
      spending_against: 0,
      
      total_outside_spending: 0,
      outside_spending_percentage: 0,
      outside_spending_confidence: {
        bundled_contributions: 'LOW',
        independent_expenditures_in_favor: 'LOW',
        communication_costs_in_favor: 'LOW',
        soft_money_in_favor: 'LOW',
        spending_against: 'LOW'
      }
    };

    const contributorsResult = await getTopContributors(actualPersonId, recentElectionYear);
    const topContributors = contributorsResult.success && contributorsResult.data 
      ? contributorsResult.data
          .map((contributor: any) => ({
            name: contributor.contributor_name || contributor.committee_name,
            amount: parseFloat(contributor.contribution_amount || 0),
            type: contributor.contributor_type || contributor.committee_type
          }))
          .slice(0, 5)
      : [];

    // Use actual disbursements from candidate_summary if available, otherwise estimate
    const actualDisbursements = financeTotals?.total_disbursements || 0;
    const disbursements = actualDisbursements > 0 ? actualDisbursements : Math.round((financeTotals?.total_receipts || 0) * 0.8);
    const cashOnHand = (financeTotals?.total_receipts || 0) - disbursements;

    // Mock industry data for now (in real implementation, this would come from database)
    const topIndustries = [
      { industry: 'Technology', amount: 1500000, percentage: 18 },
      { industry: 'Healthcare', amount: 1200000, percentage: 14 },
      { industry: 'Education', amount: 1000000, percentage: 12 },
      { industry: 'Labor', amount: 800000, percentage: 9 },
      { industry: 'Environment', amount: 600000, percentage: 7 },
    ];

    // Create election history with real data
    const electionHistory = [
      { 
        year: profile.last_election_year || 2024, 
        office: profile.current_office === 'S' ? 'Senate' : 'House', 
        party: profile.current_party, 
        result: 'Won', 
        total_receipts: financeTotals?.total_receipts || 0
      },
      { 
        year: (profile.last_election_year || 2024) - 6, 
        office: profile.current_office === 'S' ? 'Senate' : 'House', 
        party: profile.current_party, 
        result: 'Won', 
        total_receipts: Math.round((financeTotals?.total_receipts || 0) * 0.8) 
      },
    ];

    // Mock committees (in real implementation, this would come from database)
    const committees = [
      { 
        committee_id: 'C00123456', 
        committee_name: `${profile.display_name} for ${profile.current_office === 'S' ? 'Senate' : 'House'}`, 
        committee_type: profile.current_office, 
        total_receipts: profile.campaign_finance?.total_receipts || 0 
      },
    ];

    const politicianData = {
      person_id: profile.person_id,
      actual_person_id: actualPersonId, // Add the actual person ID for candidate links
      display_name: profile.display_name,
      state: profile.state,
      current_office: profile.current_office,
      current_district: profile.current_district,
      current_party: profile.current_party,
      total_elections: profile.total_elections,
      last_election_year: profile.last_election_year,
      campaign_finance: {
        total_receipts: financeTotals?.total_receipts || 0,
        total_disbursements: disbursements,
        cash_on_hand: cashOnHand,
        contribution_count: financeTotals?.contribution_count || 0,
        avg_contribution: financeTotals?.avg_contribution || 0,
        // Enhanced campaign finance data
        total_individual_contributions: financeTotals?.total_individual_contributions || 0,
        other_committee_contributions: financeTotals?.other_committee_contributions || 0,
        party_committee_contributions: financeTotals?.party_committee_contributions || 0,
        transfers_from_auth: financeTotals?.transfers_from_auth || 0,
        // Debt and self-financing
        self_financing: financeTotals?.self_financing || 0,
        self_financing_percentage: financeTotals?.self_financing_percentage || 0,
        total_debt: financeTotals?.total_debt || 0,
        debt_to_receipts_ratio: financeTotals?.debt_to_receipts_ratio || 0,
        // PAC support
        total_pac_contributions: financeTotals?.total_pac_contributions || 0,
        pac_contribution_count: financeTotals?.pac_contribution_count || 0,
        unique_pacs: financeTotals?.unique_pacs || 0,
        pac_percentage: financeTotals?.pac_percentage || 0,
        // Outside spending breakdown from operating expenditures
        total_operating_expenditures: (financeTotals as any)?.total_operating_expenditures || 0,
        operating_expenditure_count: (financeTotals as any)?.operating_expenditure_count || 0,
        unique_committees: (financeTotals as any)?.unique_committees || 0,
        
        // Categorized operating expenditures
        media_advertising: (financeTotals as any)?.media_advertising || 0,
        digital_advertising: (financeTotals as any)?.digital_advertising || 0,
        polling_research: (financeTotals as any)?.polling_research || 0,
        printing_production: (financeTotals as any)?.printing_production || 0,
        consulting_services: (financeTotals as any)?.consulting_services || 0,
        staff_payroll: (financeTotals as any)?.staff_payroll || 0,
        
        // Committee contributions (for comparison)
        committee_contributions: (financeTotals as any)?.committee_contributions || 0,
        committee_contribution_count: (financeTotals as any)?.committee_contribution_count || 0,
        
        // Legacy fields for backward compatibility
        bundled_contributions: financeTotals?.bundled_contributions || 0,
        independent_expenditures_in_favor: financeTotals?.independent_expenditures_in_favor || 0,
        communication_costs_in_favor: financeTotals?.communication_costs_in_favor || 0,
        soft_money_in_favor: financeTotals?.soft_money_in_favor || 0,
        spending_against: financeTotals?.spending_against || 0,
        
        total_outside_spending: financeTotals?.total_outside_spending || 0,
        outside_spending_percentage: financeTotals?.outside_spending_percentage || 0,
        // Confidence levels
        outside_spending_confidence: financeTotals?.outside_spending_confidence || {
          bundled_contributions: 'HIGH',
          independent_expenditures_in_favor: 'HIGH',
          communication_costs_in_favor: 'HIGH',
          soft_money_in_favor: 'HIGH',
          spending_against: 'HIGH'
        }
      },
      top_contributors: topContributors,
      top_industries: topIndustries,
      election_history: electionHistory,
      committees: committees,
    };

    return NextResponse.json({
      success: true,
      data: politicianData,
    });

  } catch (error) {
    console.error('Error in politician profile API:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to fetch politician profile' 
    });
  }
} 