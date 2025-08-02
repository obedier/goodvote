import { Pool } from 'pg';

// Database configurations
const goodvoteConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'goodvote',
  user: process.env.DB_USER || 'osamabedier',
  password: process.env.DB_PASSWORD || '',
  max: 3,
  min: 0,
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 3000,
  acquireTimeoutMillis: 3000,
};

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

const goodvotePool = new Pool(goodvoteConfig);
const fecCompletePool = new Pool(fecCompleteConfig);

async function executeQuery(pool: Pool, query: string, params: any[] = []) {
  let client = null;
  try {
    client = await pool.connect();
    const result = await client.query(query, params);
    return { success: true, data: result.rows };
  } catch (error) {
    console.error('Query error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  } finally {
    if (client) client.release();
  }
}

// Get all candidates (both current office holders and previous candidates)
export async function getAllCandidates() {
  const query = `
    SELECT DISTINCT
      p.person_id,
      p.display_name,
      p.state,
      p.current_office,
      p.current_district,
      p.current_party,
      p.total_elections,
      pc.cand_id,
      pc.election_year,
      CASE 
        WHEN cm.member_id IS NOT NULL THEN true 
        ELSE false 
      END as is_current_office_holder,
      cm.member_id,
      cm.bioguide_id as bio_id
    FROM persons p
    JOIN person_candidates pc ON p.person_id = pc.person_id
    LEFT JOIN congress_members_119th cm ON pc.cand_id = cm.fec_candidate_id
    WHERE pc.election_year >= 2018
    ORDER BY p.display_name, pc.election_year DESC
  `;

  return await executeQuery(goodvotePool, query);
}

// Get candidate profile with all election cycles
export async function getCandidateProfile(personId: string) {
  const query = `
    SELECT 
      p.person_id,
      p.display_name,
      p.state,
      p.current_office,
      p.current_district,
      p.current_party,
      p.total_elections,
      pc.cand_id,
      pc.election_year,
      CASE 
        WHEN cm.member_id IS NOT NULL THEN true 
        ELSE false 
      END as is_current_office_holder,
      cm.member_id,
      cm.bioguide_id as bio_id
    FROM persons p
    JOIN person_candidates pc ON p.person_id = pc.person_id
    LEFT JOIN congress_members_119th cm ON pc.cand_id = cm.fec_candidate_id
    WHERE p.person_id = $1
    ORDER BY pc.election_year DESC
  `;

  return await executeQuery(goodvotePool, query, [personId]);
}

// Get campaign finance data for a specific election cycle
export async function getCandidateCampaignFinance(personId: string, electionYear: number) {
  // Get candidate ID for the specific election year
  const candidateQuery = `
    SELECT cand_id 
    FROM person_candidates 
    WHERE person_id = $1 AND election_year = $2
  `;
  
  const candidateResult = await executeQuery(goodvotePool, candidateQuery, [personId, electionYear]);
  
  if (!candidateResult.success || !candidateResult.data || candidateResult.data.length === 0) {
    return { success: false, error: 'Candidate not found for this election year' };
  }
  
  const candId = candidateResult.data[0].cand_id;
  
  // Get comprehensive campaign finance data
  const financeQuery = `
    SELECT 
      cs.ttl_receipts,
      cs.ttl_indiv_contrib,
      cs.other_pol_cmte_contrib,
      cs.pol_pty_contrib,
      cs.trans_from_auth,
      cs.ttl_disb,
      cs.cand_contrib,
      cs.cand_loans,
      cs.other_loans,
      cs.debts_owed_by,
      cs.cand_loan_repay,
      cs.other_loan_repay,
      cs.ttl_receipts - cs.ttl_disb as cash_on_hand,
      cs.ttl_indiv_contrib + cs.other_pol_cmte_contrib + cs.pol_pty_contrib + cs.trans_from_auth as total_contributions,
      cs.ttl_receipts - cs.ttl_indiv_contrib - cs.other_pol_cmte_contrib - cs.pol_pty_contrib - cs.trans_from_auth as other_receipts
    FROM candidate_summary cs
    WHERE cs.cand_id = $1 AND cs.file_year = $2
  `;
  
  const financeResult = await executeQuery(fecCompletePool, financeQuery, [candId, electionYear]);
  
  if (!financeResult.success || !financeResult.data || financeResult.data.length === 0) {
    return { success: false, error: 'No campaign finance data found for this election year' };
  }
  
  const financeData = financeResult.data[0];
  
  // Get contribution count
  const contributionCountQuery = `
    SELECT COUNT(*) as contribution_count
    FROM individual_contributions ic
    JOIN (
      SELECT DISTINCT cmte_id, cand_id, cand_election_yr
      FROM candidate_committee_linkages
      WHERE cand_id = $1 AND cand_election_yr = $2
    ) ccl ON ic.cmte_id = ccl.cmte_id
    WHERE ic.file_year = $2 AND ic.transaction_amt > 0
  `;
  
  const contributionCountResult = await executeQuery(fecCompletePool, contributionCountQuery, [candId, electionYear]);
  const contributionCount = contributionCountResult.success && contributionCountResult.data && contributionCountResult.data.length > 0 
    ? contributionCountResult.data[0].contribution_count 
    : 0;
  
  // Get PAC contributions
  const pacQuery = `
    SELECT 
      COALESCE(SUM(cc.transaction_amt), 0) as total_pac_contributions,
      COUNT(*) as pac_contribution_count,
      COUNT(DISTINCT cc.cmte_id) as unique_pacs
    FROM committee_candidate_contributions cc
    WHERE cc.cand_id = $1 AND cc.file_year = $2 AND cc.transaction_amt > 0
  `;
  
  const pacResult = await executeQuery(fecCompletePool, pacQuery, [candId, electionYear]);
  const pacData = pacResult.success && pacResult.data && pacResult.data.length > 0 
    ? pacResult.data[0] 
    : { total_pac_contributions: 0, pac_contribution_count: 0, unique_pacs: 0 };
  
  // Calculate percentages
  const totalReceipts = parseFloat(financeData.ttl_receipts || 0);
  const pacPercentage = totalReceipts > 0 ? (parseFloat(pacData.total_pac_contributions || 0) / totalReceipts) * 100 : 0;
  const selfFinancingPercentage = totalReceipts > 0 ? (parseFloat(financeData.cand_contrib || 0) / totalReceipts) * 100 : 0;
  
  // Get outside spending breakdown
  const outsideSpendingQuery = `
    SELECT 
      -- Bundled contributions (Type 24K)
      COALESCE(SUM(CASE WHEN transaction_tp = '24K' THEN transaction_amt ELSE 0 END), 0) as bundled_contributions,
      COUNT(CASE WHEN transaction_tp = '24K' THEN 1 END) as bundled_contribution_count,
      COUNT(DISTINCT CASE WHEN transaction_tp = '24K' THEN cmte_id END) as unique_bundlers,
      
      -- Independent expenditures in favor (Type 24A)
      COALESCE(SUM(CASE WHEN transaction_tp = '24A' THEN transaction_amt ELSE 0 END), 0) as independent_expenditures_in_favor,
      COUNT(CASE WHEN transaction_tp = '24A' THEN 1 END) as independent_expenditures_in_favor_count,
      COUNT(DISTINCT CASE WHEN transaction_tp = '24A' THEN cmte_id END) as independent_expenditures_in_favor_committees,
      
      -- Communication costs in favor (Type 24E)
      COALESCE(SUM(CASE WHEN transaction_tp = '24E' THEN transaction_amt ELSE 0 END), 0) as communication_costs_in_favor,
      COUNT(CASE WHEN transaction_tp = '24E' THEN 1 END) as communication_costs_in_favor_count,
      COUNT(DISTINCT CASE WHEN transaction_tp = '24E' THEN cmte_id END) as communication_costs_in_favor_committees,
      
      -- Soft money in favor (Type 24C)
      COALESCE(SUM(CASE WHEN transaction_tp = '24C' THEN transaction_amt ELSE 0 END), 0) as soft_money_in_favor,
      COUNT(CASE WHEN transaction_tp = '24C' THEN 1 END) as soft_money_in_favor_count,
      COUNT(DISTINCT CASE WHEN transaction_tp = '24C' THEN cmte_id END) as soft_money_in_favor_committees,
      
      -- Spending against (Type 24N)
      COALESCE(SUM(CASE WHEN transaction_tp = '24N' THEN transaction_amt ELSE 0 END), 0) as spending_against,
      COUNT(CASE WHEN transaction_tp = '24N' THEN 1 END) as spending_against_count,
      COUNT(DISTINCT CASE WHEN transaction_tp = '24N' THEN cmte_id END) as spending_against_committees
    FROM committee_candidate_contributions
    WHERE cand_id = $1 AND file_year = $2 AND transaction_amt > 0
  `;
  
  const outsideSpendingResult = await executeQuery(fecCompletePool, outsideSpendingQuery, [candId, electionYear]);
  const outsideData = outsideSpendingResult.success && outsideSpendingResult.data && outsideSpendingResult.data.length > 0 
    ? outsideSpendingResult.data[0] 
    : {
        bundled_contributions: 0, bundled_contribution_count: 0, unique_bundlers: 0,
        independent_expenditures_in_favor: 0, independent_expenditures_in_favor_count: 0, independent_expenditures_in_favor_committees: 0,
        communication_costs_in_favor: 0, communication_costs_in_favor_count: 0, communication_costs_in_favor_committees: 0,
        soft_money_in_favor: 0, soft_money_in_favor_count: 0, soft_money_in_favor_committees: 0,
        spending_against: 0, spending_against_count: 0, spending_against_committees: 0
      };
  
  // Calculate total outside spending and percentage
  const totalOutsideSpending = parseFloat(outsideData.bundled_contributions || 0) + 
                              parseFloat(outsideData.independent_expenditures_in_favor || 0) + 
                              parseFloat(outsideData.communication_costs_in_favor || 0) + 
                              parseFloat(outsideData.soft_money_in_favor || 0);
  const outsideSpendingPercentage = totalReceipts > 0 ? (totalOutsideSpending / totalReceipts) * 100 : 0;
  
  return {
    success: true,
    data: {
      election_year: electionYear,
      total_receipts: parseFloat(financeData.ttl_receipts || 0),
      total_individual_contributions: parseFloat(financeData.ttl_indiv_contrib || 0),
      other_committee_contributions: parseFloat(financeData.other_pol_cmte_contrib || 0),
      party_committee_contributions: parseFloat(financeData.pol_pty_contrib || 0),
      transfers_from_auth: parseFloat(financeData.trans_from_auth || 0),
      total_disbursements: parseFloat(financeData.ttl_disb || 0),
      cash_on_hand: parseFloat(financeData.cash_on_hand || 0),
      contribution_count: parseInt(contributionCount),
      avg_contribution: contributionCount > 0 ? parseFloat(financeData.ttl_indiv_contrib || 0) / parseInt(contributionCount) : 0,
      self_financing: parseFloat(financeData.cand_contrib || 0),
      self_financing_percentage: selfFinancingPercentage,
      candidate_loans: parseFloat(financeData.cand_loans || 0),
      other_loans: parseFloat(financeData.other_loans || 0),
      debts_owed_by_candidate: parseFloat(financeData.debts_owed_by || 0),
      total_debt: parseFloat(financeData.cand_loans || 0) + parseFloat(financeData.other_loans || 0) + parseFloat(financeData.debts_owed_by || 0),
      debt_to_receipts_ratio: totalReceipts > 0 ? ((parseFloat(financeData.cand_loans || 0) + parseFloat(financeData.other_loans || 0) + parseFloat(financeData.debts_owed_by || 0)) / totalReceipts) * 100 : 0,
      candidate_loan_repayments: parseFloat(financeData.cand_loan_repay || 0),
      other_loan_repayments: parseFloat(financeData.other_loan_repay || 0),
      total_pac_contributions: parseFloat(pacData.total_pac_contributions || 0),
      pac_contribution_count: parseInt(pacData.pac_contribution_count || 0),
      unique_pacs: parseInt(pacData.unique_pacs || 0),
      pac_percentage: pacPercentage,
      total_contributions: parseFloat(financeData.total_contributions || 0),
      other_receipts: parseFloat(financeData.other_receipts || 0),
      // Outside spending breakdown
      bundled_contributions: parseFloat(outsideData.bundled_contributions || 0),
      unique_bundlers: parseInt(outsideData.unique_bundlers || 0),
      bundled_contribution_count: parseInt(outsideData.bundled_contribution_count || 0),
      independent_expenditures_in_favor: parseFloat(outsideData.independent_expenditures_in_favor || 0),
      independent_expenditures_in_favor_count: parseInt(outsideData.independent_expenditures_in_favor_count || 0),
      independent_expenditures_in_favor_committees: parseInt(outsideData.independent_expenditures_in_favor_committees || 0),
      communication_costs_in_favor: parseFloat(outsideData.communication_costs_in_favor || 0),
      communication_costs_in_favor_count: parseInt(outsideData.communication_costs_in_favor_count || 0),
      communication_costs_in_favor_committees: parseInt(outsideData.communication_costs_in_favor_committees || 0),
      soft_money_in_favor: parseFloat(outsideData.soft_money_in_favor || 0),
      soft_money_in_favor_count: parseInt(outsideData.soft_money_in_favor_count || 0),
      soft_money_in_favor_committees: parseInt(outsideData.soft_money_in_favor_committees || 0),
      spending_against: parseFloat(outsideData.spending_against || 0),
      spending_against_count: parseInt(outsideData.spending_against_count || 0),
      spending_against_committees: parseInt(outsideData.spending_against_committees || 0),
      total_outside_spending: totalOutsideSpending,
      outside_spending_percentage: outsideSpendingPercentage
    }
  };
}

// Get career totals for a candidate
export async function getCandidateCareerTotals(personId: string) {
  const query = `
    SELECT 
      SUM(cs.ttl_receipts) as career_total_receipts,
      SUM(cs.ttl_indiv_contrib) as career_total_individual_contributions,
      SUM(cs.other_pol_cmte_contrib) as career_other_committee_contributions,
      SUM(cs.pol_pty_contrib) as career_party_committee_contributions,
      SUM(cs.trans_from_auth) as career_transfers_from_auth,
      SUM(cs.ttl_disb) as career_total_disbursements,
      SUM(cs.cand_contrib) as career_self_financing,
      SUM(cs.cand_loans) as career_candidate_loans,
      SUM(cs.other_loans) as career_other_loans,
      SUM(cs.debts_owed_by) as career_debts_owed_by,
      COUNT(DISTINCT cs.file_year) as total_election_cycles
    FROM candidate_summary cs
    JOIN person_candidates pc ON cs.cand_id = pc.cand_id
    WHERE pc.person_id = $1
  `;
  
  return await executeQuery(fecCompletePool, query, [personId]);
}

// Get top contributors for a specific election cycle
export async function getCandidateTopContributors(personId: string, electionYear: number) {
  const candidateQuery = `
    SELECT cand_id 
    FROM person_candidates 
    WHERE person_id = $1 AND election_year = $2
  `;
  
  const candidateResult = await executeQuery(goodvotePool, candidateQuery, [personId, electionYear]);
  
  if (!candidateResult.success || !candidateResult.data || candidateResult.data.length === 0) {
    return { success: false, error: 'Candidate not found for this election year' };
  }
  
  const candId = candidateResult.data[0].cand_id;
  
  // Get individual contributors
  const individualQuery = `
    SELECT 
      ic.name,
      ic.city,
      ic.state,
      ic.employer,
      ic.occupation,
      SUM(ic.transaction_amt) as total_amount,
      COUNT(*) as contribution_count
    FROM individual_contributions ic
    JOIN (
      SELECT DISTINCT cmte_id, cand_id, cand_election_yr
      FROM candidate_committee_linkages
      WHERE cand_id = $1 AND cand_election_yr = $2
    ) ccl ON ic.cmte_id = ccl.cmte_id
    WHERE ic.file_year = $2 
    AND ic.transaction_amt > 0
    AND ic.transaction_tp IN ('15', '15E', '22Y')
    GROUP BY ic.name, ic.city, ic.state, ic.employer, ic.occupation
    ORDER BY total_amount DESC
    LIMIT 20
  `;
  
  const individualResult = await executeQuery(fecCompletePool, individualQuery, [candId, electionYear]);
  
  // Get committee contributors
  const committeeQuery = `
    SELECT 
      cm.cmte_nm as committee_name,
      cm.cmte_tp as committee_type,
      SUM(cc.transaction_amt) as total_amount,
      COUNT(*) as contribution_count
    FROM committee_candidate_contributions cc
    LEFT JOIN committee_master cm ON cc.cmte_id = cm.cmte_id
    WHERE cc.cand_id = $1 
    AND cc.file_year = $2
    AND cc.transaction_amt > 0
    GROUP BY cm.cmte_nm, cm.cmte_tp
    ORDER BY total_amount DESC
    LIMIT 20
  `;
  
  const committeeResult = await executeQuery(fecCompletePool, committeeQuery, [candId, electionYear]);
  
  // Combine and sort all contributors
  const allContributors = [
    ...(individualResult.success && individualResult.data ? individualResult.data.map((c: any) => ({
      name: c.name,
      location: `${c.city}, ${c.state}`,
      employer: c.employer,
      occupation: c.occupation,
      amount: parseFloat(c.total_amount || 0),
      count: parseInt(c.contribution_count || 0),
      type: 'Individual'
    })) : []),
    ...(committeeResult.success && committeeResult.data ? committeeResult.data.map((c: any) => ({
      name: c.committee_name,
      location: '',
      employer: '',
      occupation: '',
      amount: parseFloat(c.total_amount || 0),
      count: parseInt(c.contribution_count || 0),
      type: 'Committee'
    })) : [])
  ].sort((a, b) => b.amount - a.amount).slice(0, 20);
  
  return {
    success: true,
    data: allContributors
  };
}

// Get top industries for a candidate
export async function getCandidateTopIndustries(personId: string, electionYear: number) {
  const candidateQuery = `
    SELECT cand_id 
    FROM person_candidates 
    WHERE person_id = $1 AND election_year = $2
  `;
  
  const candidateResult = await executeQuery(goodvotePool, candidateQuery, [personId, electionYear]);
  
  if (!candidateResult.success || !candidateResult.data || candidateResult.data.length === 0) {
    return { success: false, error: 'Candidate not found for this election year' };
  }
  
  const candId = candidateResult.data[0].cand_id;
  
  // Get industries from individual contributions
  const industryQuery = `
    SELECT 
      ic.occupation,
      SUM(ic.transaction_amt) as total_amount,
      COUNT(*) as contribution_count
    FROM individual_contributions ic
    JOIN (
      SELECT DISTINCT cmte_id, cand_id, cand_election_yr
      FROM candidate_committee_linkages
      WHERE cand_id = $1 AND cand_election_yr = $2
    ) ccl ON ic.cmte_id = ccl.cmte_id
    WHERE ic.file_year = $2 
    AND ic.transaction_amt > 0
    AND ic.transaction_tp IN ('15', '15E', '22Y')
    AND ic.occupation IS NOT NULL
    AND ic.occupation != ''
    GROUP BY ic.occupation
    ORDER BY total_amount DESC
    LIMIT 20
  `;
  
  const industryResult = await executeQuery(fecCompletePool, industryQuery, [candId, electionYear]);
  
  if (!industryResult.success || !industryResult.data) {
    return { success: false, error: 'Failed to fetch industry data' };
  }
  
  const totalAmount = industryResult.data.reduce((sum: number, item: any) => sum + parseFloat(item.total_amount || 0), 0);
  
  const industries = industryResult.data.map((item: any) => ({
    industry: item.occupation,
    amount: parseFloat(item.total_amount || 0),
    count: parseInt(item.contribution_count || 0),
    percentage: totalAmount > 0 ? (parseFloat(item.total_amount || 0) / totalAmount) * 100 : 0
  }));
  
  return {
    success: true,
    data: industries
  };
}

// Get election history for a candidate
export async function getCandidateElectionHistory(personId: string) {
  const query = `
    SELECT 
      pc.election_year,
      pc.cand_id,
      p.current_office,
      p.current_party,
      CASE 
        WHEN cm.member_id IS NOT NULL THEN 'Won'
        WHEN pc.election_year = p.last_election_year THEN 'Won'
        ELSE 'Lost'
      END as result
    FROM person_candidates pc
    JOIN persons p ON pc.person_id = p.person_id
    LEFT JOIN congress_members_119th cm ON p.person_id = cm.person_id
    WHERE pc.person_id = $1
    ORDER BY pc.election_year DESC
  `;
  
  const result = await executeQuery(goodvotePool, query, [personId]);
  
  if (!result.success || !result.data) {
    return { success: false, error: 'Failed to fetch election history' };
  }
  
  // Get campaign finance data for each election
  const historyWithFinance = await Promise.all(
    result.data.map(async (election: any) => {
      const financeResult = await getCandidateCampaignFinance(personId, election.election_year);
      return {
        ...election,
        campaign_finance: financeResult.success ? financeResult.data : null
      };
    })
  );
  
  return {
    success: true,
    data: historyWithFinance
  };
}

// Search candidates
export async function searchCandidates(query: string) {
  const searchQuery = `
    SELECT DISTINCT
      p.person_id,
      p.display_name,
      p.state,
      p.current_office,
      p.current_district,
      p.current_party,
      pc.cand_id,
      pc.election_year,
      CASE 
        WHEN cm.member_id IS NOT NULL THEN true 
        ELSE false 
      END as is_current_office_holder
    FROM persons p
    JOIN person_candidates pc ON p.person_id = pc.person_id
    LEFT JOIN congress_members_119th cm ON pc.cand_id = cm.fec_candidate_id
    WHERE p.display_name ILIKE $1
    OR p.state ILIKE $1
    OR pc.cand_id ILIKE $1
    ORDER BY p.display_name, pc.election_year DESC
    LIMIT 50
  `;
  
  return await executeQuery(goodvotePool, searchQuery, [`%${query}%`]);
}

// Close database connections
export async function closeConnections() {
  await goodvotePool.end();
  await fecCompletePool.end();
} 