import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/database';

export async function GET() {
  try {
    // Get stats from all configuration tables
    const stats = {
      committees: 0,
      relationships: 0,
      keywords: 0,
      transactionTypes: 0,
      congressMembers: 0,
      proIsraelMembers: 0,
      neutralMembers: 0,
      oppositionMembers: 0,
      totalProIsraelFunding: 0,
      top10CandidatesFunding: 0,
      fundingByParty: {},
      fundingByElectionCycle: {},
      fundingBySupport: {},
      topContributors: []
    };

    // Count committees
    const committeesResult = await executeQuery(
      'SELECT COUNT(*) as count FROM cfg_israel_committee_ids WHERE is_active = true',
      [],
      true
    );
    if (committeesResult.success && committeesResult.data) {
      stats.committees = parseInt(committeesResult.data[0]?.count || '0');
    }

    // Count relationships
    const relationshipsResult = await executeQuery(
      'SELECT COUNT(*) as count FROM cfg_israel_committee_committee_relationship WHERE is_active = true',
      [],
      true
    );
    if (relationshipsResult.success && relationshipsResult.data) {
      stats.relationships = parseInt(relationshipsResult.data[0]?.count || '0');
    }

    // Count keywords
    const keywordsResult = await executeQuery(
      'SELECT COUNT(*) as count FROM cfg_israel_keywords WHERE is_active = true',
      [],
      true
    );
    if (keywordsResult.success && keywordsResult.data) {
      stats.keywords = parseInt(keywordsResult.data[0]?.count || '0');
    }

    // Count transaction types
    const transactionTypesResult = await executeQuery(
      'SELECT COUNT(*) as count FROM cfg_israel_transaction_type WHERE is_active = true',
      [],
      true
    );
    if (transactionTypesResult.success && transactionTypesResult.data) {
      stats.transactionTypes = parseInt(transactionTypesResult.data[0]?.count || '0');
    }

    // Count congress members
    const congressMembersResult = await executeQuery(
      'SELECT COUNT(*) as count FROM congress_member_pro_israel_report',
      [],
      true
    );
    if (congressMembersResult.success && congressMembersResult.data) {
      stats.congressMembers = parseInt(congressMembersResult.data[0]?.count || '0');
    }

    // Count pro-Israel members
    const proIsraelResult = await executeQuery(
      `SELECT COUNT(*) as count FROM congress_member_pro_israel_report 
       WHERE pro_israel_category IN ('Strong Pro-Israel', 'Moderate Pro-Israel')`,
      [],
      true
    );
    if (proIsraelResult.success && proIsraelResult.data) {
      stats.proIsraelMembers = parseInt(proIsraelResult.data[0]?.count || '0');
    }

    // Count neutral members
    const neutralResult = await executeQuery(
      `SELECT COUNT(*) as count FROM congress_member_pro_israel_report 
       WHERE pro_israel_category = 'Neutral'`,
      [],
      true
    );
    if (neutralResult.success && neutralResult.data) {
      stats.neutralMembers = parseInt(neutralResult.data[0]?.count || '0');
    }

    // Count opposition members
    const oppositionResult = await executeQuery(
      `SELECT COUNT(*) as count FROM congress_member_pro_israel_report 
       WHERE pro_israel_category IN ('Limited Pro-Israel', 'Anti-Israel')`,
      [],
      true
    );
    if (oppositionResult.success && oppositionResult.data) {
      stats.oppositionMembers = parseInt(oppositionResult.data[0]?.count || '0');
    }

    // Get total pro-Israel funding
    const totalFundingResult = await executeQuery(
      `SELECT COALESCE(SUM(CAST(pro_israel_contributions AS NUMERIC)), 0) as total_funding 
       FROM congress_member_pro_israel_report`,
      [],
      true
    );
    if (totalFundingResult.success && totalFundingResult.data) {
      stats.totalProIsraelFunding = parseFloat(totalFundingResult.data[0]?.total_funding || '0');
    }

    // Get top 10 candidates funding
    const top10FundingResult = await executeQuery(
      `SELECT COALESCE(SUM(CAST(pro_israel_contributions AS NUMERIC)), 0) as top10_funding 
       FROM (
         SELECT pro_israel_contributions 
         FROM congress_member_pro_israel_report 
         ORDER BY CAST(pro_israel_contributions AS NUMERIC) DESC 
         LIMIT 10
       ) top10`,
      [],
      true
    );
    if (top10FundingResult.success && top10FundingResult.data) {
      stats.top10CandidatesFunding = parseFloat(top10FundingResult.data[0]?.top10_funding || '0');
    }

    // Get funding by party
    const partyFundingResult = await executeQuery(
      `SELECT party, COALESCE(SUM(CAST(pro_israel_contributions AS NUMERIC)), 0) as total_funding
       FROM congress_member_pro_israel_report 
       GROUP BY party 
       ORDER BY total_funding DESC`,
      [],
      true
    );
    if (partyFundingResult.success && partyFundingResult.data) {
      stats.fundingByParty = partyFundingResult.data.reduce((acc: any, row: any) => {
        acc[row.party] = parseFloat(row.total_funding);
        return acc;
      }, {});
    }

    // Get funding by election cycle (using 2024 as current cycle)
    const cycleFundingResult = await executeQuery(
      `SELECT 
         CASE 
           WHEN pro_israel_category IN ('Strong Pro-Israel', 'Moderate Pro-Israel') THEN 'Support'
           WHEN pro_israel_category = 'Neutral' THEN 'Neutral'
           ELSE 'Opposition'
         END as support_level,
         COALESCE(SUM(CAST(pro_israel_contributions AS NUMERIC)), 0) as total_funding
       FROM congress_member_pro_israel_report 
       GROUP BY support_level 
       ORDER BY total_funding DESC`,
      [],
      true
    );
    if (cycleFundingResult.success && cycleFundingResult.data) {
      stats.fundingBySupport = cycleFundingResult.data.reduce((acc: any, row: any) => {
        acc[row.support_level] = parseFloat(row.total_funding);
        return acc;
      }, {});
    }

    // Get top contributors (simplified - using committee names from congress data)
    const topContributorsResult = await executeQuery(
      `SELECT 
         representative_name,
         pro_israel_contributions,
         pro_israel_category
       FROM congress_member_pro_israel_report 
       ORDER BY CAST(pro_israel_contributions AS NUMERIC) DESC 
       LIMIT 10`,
      [],
      true
    );
    if (topContributorsResult.success && topContributorsResult.data) {
      stats.topContributors = topContributorsResult.data.map((row: any) => ({
        name: row.representative_name,
        amount: parseFloat(row.pro_israel_contributions),
        category: row.pro_israel_category
      }));
    }

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch admin statistics' },
      { status: 500 }
    );
  }
}
