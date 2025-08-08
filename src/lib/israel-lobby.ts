import { executeQuery } from './database';

// Pro-Israel PAC identifiers - ONLY actual pro-Israel organizations
export const PRO_ISRAEL_PACS = [
  'C00797670', // AIPAC PAC
  'C00247403', // NORPAC
  'C00741792', // Pro-Israel America PAC
  'C00142299', // Republican Jewish Coalition PAC
  'C00127811', // U.S. Israel PAC (USI PAC)
  'C00799031', // United Democracy Project (UDP) - pro-Israel SuperPAC
  // Add more as identified
];

// Pro-Israel committee names/keywords for identification - ONLY actual pro-Israel organizations
export const PRO_ISRAEL_KEYWORDS = [
  'AIPAC',
  'NORPAC',
  'Pro-Israel America',
  'Republican Jewish Coalition',
  'U.S. Israel PAC',
  'USI PAC',
  'JACPAC',
  'ZOA',
  'Zionist Organization of America',
  'Israel PAC',
  'Jewish PAC',
  'American Israel',
  'Israel America',
  'United Democracy Project',
  'UDP',
  'Democratic Majority for Israel',
  'Joint Action Cmte for Political Affairs',
  'JStreetPAC',
  'National Action Cmte'
];

export interface IsraelLobbyScore {
  candidate_id: string;
  person_id: string;
  candidate_name: string;
  state: string;
  district?: string;
  office: string;
  party: string;
  election_year: number;
  
  // Scoring components
  total_pro_israel_contributions: number;
  pro_israel_pac_count: number;
  pro_israel_contribution_amount: number;
  pro_israel_superpac_amount: number;
  
  // Score calculation
  lobby_score: number; // 0-100
  lobby_grade: 'A' | 'B' | 'C' | 'D' | 'F'; // A = most pro-Israel, F = least
  lobby_category: 'High Support' | 'Moderate Support' | 'Low Support' | 'No Support' | 'Unknown';
  
  // New humanity score (0-5 scale, 0=worst, 5=best)
  humanity_score: number; // 0-5
  
  // Detailed breakdown
  pac_contributions: Array<{
    pac_id: string;
    pac_name: string;
    amount: number;
    contribution_date: string;
    file_year?: number;
  }>;
  
  superpac_expenditures: Array<{
    committee_id: string;
    committee_name: string;
    amount: number;
    support_oppose: 'SUPPORT' | 'OPPOSE';
    expenditure_date: string;
    file_year?: number;
  }>;
  
  // New: Cycle breakdown data
  cycle_breakdown: Array<{
    election_year: number;
    total_support: number;
    total_oppose: number;
    net_amount: number;
    pac_count: number;
    superpac_count: number;
    pac_contributions: Array<{
      pac_id: string;
      pac_name: string;
      amount: number;
      support_oppose: 'SUPPORT' | 'OPPOSE';
    }>;
    superpac_expenditures: Array<{
      committee_id: string;
      committee_name: string;
      amount: number;
      support_oppose: 'SUPPORT' | 'OPPOSE';
    }>;
  }>;
  
  operating_expenditures: Array<{
    committee_id: string;
    committee_name: string;
    amount: number;
    purpose: string;
    category: string;
    category_desc: string;
    expenditure_date: string;
  }>;
  
  other_transactions: Array<{
    committee_id: string;
    committee_name: string;
    amount: number;
    transaction_type: string;
    transaction_date: string;
  }>;
}

// Helper function to get historical Israel lobby data for a candidate
async function getHistoricalIsraelLobbyData(personId: string): Promise<{
  hasEverReceivedFunding: boolean;
  electionYearsWithFunding: number[];
  hasWonElection: boolean;
  hasWonRecentElection: boolean;
  mostRecentElectionYear: number;
}> {
  try {
    // Get all election years where candidate received pro-Israel funding (SUPPORT positive, OPPOSE negative)
    const historicalQuery = `
      SELECT DISTINCT cc.file_year, 
             SUM(CASE 
               WHEN cc.transaction_tp = '24E' THEN CAST(ABS(cc.transaction_amt) AS NUMERIC)  -- SUPPORT = positive
               WHEN cc.transaction_tp = '24A' THEN -CAST(ABS(cc.transaction_amt) AS NUMERIC)  -- OPPOSE = negative
               WHEN cc.transaction_amt > 0 THEN CAST(ABS(cc.transaction_amt) AS NUMERIC)      -- SUPPORT = positive
               WHEN cc.transaction_amt < 0 THEN -CAST(ABS(cc.transaction_amt) AS NUMERIC)     -- OPPOSE = negative
               ELSE 0
             END) as total_amount
      FROM committee_candidate_contributions cc
      JOIN committee_master cm ON cc.cmte_id = cm.cmte_id
      JOIN person_candidates pc ON cc.cand_id = pc.cand_id
      WHERE pc.person_id = $1
      AND cc.transaction_amt != 0
      AND cc.transaction_tp IN ('24A', '24E', '24C', '24N', '24K')
      AND (
        cc.cmte_id = ANY($2) OR
        (cm.cmte_nm ILIKE '%AIPAC%' OR cm.cmte_nm ILIKE '%NORPAC%' OR cm.cmte_nm ILIKE '%Pro-Israel America%' OR cm.cmte_nm ILIKE '%Republican Jewish Coalition%' OR cm.cmte_nm ILIKE '%U.S. Israel PAC%' OR cm.cmte_nm ILIKE '%USI PAC%' OR cm.cmte_nm ILIKE '%JACPAC%' OR cm.cmte_nm ILIKE '%ZOA%' OR cm.cmte_nm ILIKE '%Zionist Organization of America%' OR cm.cmte_nm ILIKE '%Israel PAC%' OR cm.cmte_nm ILIKE '%Jewish PAC%' OR cm.cmte_nm ILIKE '%American Israel%' OR cm.cmte_nm ILIKE '%Israel America%' OR cm.cmte_nm ILIKE '%United Democracy Project%' OR cm.cmte_nm ILIKE '%UDP%')
      )
      GROUP BY cc.file_year
      HAVING SUM(CASE 
        WHEN cc.transaction_tp = '24E' THEN CAST(ABS(cc.transaction_amt) AS NUMERIC)
        WHEN cc.transaction_tp = '24A' THEN -CAST(ABS(cc.transaction_amt) AS NUMERIC)
        WHEN cc.transaction_amt > 0 THEN CAST(ABS(cc.transaction_amt) AS NUMERIC)
        WHEN cc.transaction_amt < 0 THEN -CAST(ABS(cc.transaction_amt) AS NUMERIC)
        ELSE 0
      END) > 0  -- Only include years with net positive support
      ORDER BY cc.file_year DESC
    `;

    const historicalResult = await executeQuery(
      historicalQuery,
      [personId, PRO_ISRAEL_PACS],
      true
    );

    const electionYearsWithFunding = historicalResult.success 
      ? historicalResult.data.map((row: any) => row.file_year)
      : [];

    const hasEverReceivedFunding = electionYearsWithFunding.length > 0;
    const mostRecentElectionYear = electionYearsWithFunding.length > 0 
      ? Math.max(...electionYearsWithFunding)
      : 0;

    // Get candidate's election history to determine wins
    const electionHistoryQuery = `
      SELECT cand_id, election_year, office, party, incumbent_challenge
      FROM person_candidates 
      WHERE person_id = $1
      ORDER BY election_year DESC
    `;

    const electionHistoryResult = await executeQuery(
      electionHistoryQuery,
      [personId],
      false
    );

    const electionHistory = electionHistoryResult.success ? electionHistoryResult.data : [];
    const hasWonElection = electionHistory.some((election: any) => 
      election.incumbent_challenge === 'I' || election.incumbent_challenge === 'C'
    );
    const hasWonRecentElection = electionHistory.length > 0 && 
      (electionHistory[0].incumbent_challenge === 'I' || electionHistory[0].incumbent_challenge === 'C');

    return {
      hasEverReceivedFunding,
      electionYearsWithFunding,
      hasWonElection,
      hasWonRecentElection,
      mostRecentElectionYear
    };
  } catch (error) {
    console.error('Error getting historical Israel lobby data:', error);
    return {
      hasEverReceivedFunding: false,
      electionYearsWithFunding: [],
      hasWonElection: false,
      hasWonRecentElection: false,
      mostRecentElectionYear: 0
    };
  }
}

export async function getIsraelLobbyScore(
  personId: string, 
  electionYear: number = 2024
): Promise<{ success: boolean; data?: IsraelLobbyScore; error?: string }> {
  try {
    // Get candidate information
    const candidateQuery = `
      SELECT DISTINCT pc.person_id, pc.cand_id, pc.office as current_office, 
             pc.district as current_district, pc.party as current_party, pc.election_year,
             cm.cand_name as display_name, cm.cand_office_st as state
      FROM person_candidates pc
      JOIN candidate_master cm ON pc.cand_id = cm.cand_id AND pc.election_year = cm.cand_election_yr
      WHERE pc.person_id = $1
      AND pc.election_year >= $2 - 4
      ORDER BY pc.election_year DESC
      LIMIT 1
    `;
    
    const candidateResult = await executeQuery(candidateQuery, [personId, electionYear], true);
    
    if (!candidateResult.success || candidateResult.data.length === 0) {
      return { success: false, error: 'Candidate not found' };
    }
    
    const candidate = candidateResult.data[0];
    const candId = candidate.cand_id;
    
    // Get pro-Israel PAC contributions (both FOR and AGAINST) - aggregate across all FEC IDs for person
    const pacContributionsQuery = `
      SELECT 
        cc.cmte_id as pac_id,
        cm.cmte_nm as pac_name,
        SUM(CAST(ABS(cc.transaction_amt) AS NUMERIC)) as total_amount,
        COUNT(*) as contribution_count,
        MIN(cc.transaction_dt) as first_contribution,
        MAX(cc.transaction_dt) as last_contribution,
        MAX(cc.file_year) as most_recent_year,
        CASE 
          WHEN cc.transaction_tp = '24E' THEN 'SUPPORT'
          WHEN cc.transaction_tp = '24A' THEN 'OPPOSE'
          WHEN SUM(cc.transaction_amt) > 0 THEN 'SUPPORT'
          WHEN SUM(cc.transaction_amt) < 0 THEN 'OPPOSE'
          ELSE 'NEUTRAL'
        END as support_oppose
      FROM committee_candidate_contributions cc
      JOIN committee_master cm ON cc.cmte_id = cm.cmte_id
      JOIN person_candidates pc ON cc.cand_id = pc.cand_id
      WHERE pc.person_id = $1
      AND cc.transaction_amt != 0
      AND cc.transaction_tp IN ('24A', '24E', '24C', '24N', '24K')
      AND (
        cc.cmte_id = ANY($2) OR
        (cm.cmte_nm ILIKE '%AIPAC%' OR cm.cmte_nm ILIKE '%NORPAC%' OR cm.cmte_nm ILIKE '%Pro-Israel America%' OR cm.cmte_nm ILIKE '%Republican Jewish Coalition%' OR cm.cmte_nm ILIKE '%U.S. Israel PAC%' OR cm.cmte_nm ILIKE '%USI PAC%' OR cm.cmte_nm ILIKE '%JACPAC%' OR cm.cmte_nm ILIKE '%ZOA%' OR cm.cmte_nm ILIKE '%Zionist Organization of America%' OR cm.cmte_nm ILIKE '%Israel PAC%' OR cm.cmte_nm ILIKE '%Jewish PAC%' OR cm.cmte_nm ILIKE '%American Israel%' OR cm.cmte_nm ILIKE '%Israel America%' OR cm.cmte_nm ILIKE '%United Democracy Project%' OR cm.cmte_nm ILIKE '%UDP%')
      )
      GROUP BY cc.cmte_id, cm.cmte_nm, cc.transaction_tp
      ORDER BY total_amount DESC
    `;
    
    const pacResult = await executeQuery(
      pacContributionsQuery, 
      [personId, PRO_ISRAEL_PACS],
      true
    );
    
    // Get pro-Israel SuperPAC independent expenditures - only independent expenditures to avoid double-counting
    const superpacQuery = `
      SELECT 
        cc.cmte_id,
        cm.cmte_nm as committee_name,
        SUM(CAST(ABS(cc.transaction_amt) AS NUMERIC)) as total_amount,
        COUNT(*) as expenditure_count,
        MAX(cc.file_year) as most_recent_year,
        CASE 
          WHEN cc.transaction_tp = '24E' THEN 'SUPPORT'
          WHEN cc.transaction_tp = '24A' THEN 'OPPOSE'
          WHEN SUM(cc.transaction_amt) > 0 THEN 'SUPPORT'
          WHEN SUM(cc.transaction_amt) < 0 THEN 'OPPOSE'
          ELSE 'NEUTRAL'
        END as support_oppose,
        MIN(cc.transaction_dt) as first_expenditure,
        MAX(cc.transaction_dt) as last_expenditure
      FROM committee_candidate_contributions cc
      JOIN committee_master cm ON cc.cmte_id = cm.cmte_id
      JOIN person_candidates pc ON cc.cand_id = pc.cand_id
      WHERE pc.person_id = $1
      AND cc.transaction_amt != 0
      AND cc.transaction_tp IN ('24A', '24E')  -- Only independent expenditures, not PAC contributions
      AND (
        cc.cmte_id = ANY($2) OR
        (cm.cmte_nm ILIKE '%AIPAC%' OR cm.cmte_nm ILIKE '%NORPAC%' OR cm.cmte_nm ILIKE '%Pro-Israel America%' OR cm.cmte_nm ILIKE '%Republican Jewish Coalition%' OR cm.cmte_nm ILIKE '%U.S. Israel PAC%' OR cm.cmte_nm ILIKE '%USI PAC%' OR cm.cmte_nm ILIKE '%JACPAC%' OR cm.cmte_nm ILIKE '%ZOA%' OR cm.cmte_nm ILIKE '%Zionist Organization of America%' OR cm.cmte_nm ILIKE '%Israel PAC%' OR cm.cmte_nm ILIKE '%Jewish PAC%' OR cm.cmte_nm ILIKE '%American Israel%' OR cm.cmte_nm ILIKE '%Israel America%' OR cm.cmte_nm ILIKE '%United Democracy Project%' OR cm.cmte_nm ILIKE '%UDP%')
      )
      GROUP BY cc.cmte_id, cm.cmte_nm, cc.transaction_tp
      ORDER BY total_amount DESC
    `;
    
    const superpacResult = await executeQuery(
      superpacQuery,
      [personId, PRO_ISRAEL_PACS],
      true
    );
    
    // Simplified: Skip operating expenditures and other transactions for now to avoid timeouts
    // These are less critical for the core scoring logic
    const operatingResult = { success: true, data: [] };
    const otherTransactionsResult = { success: true, data: [] };
    
    // Calculate totals
    const pacContributions = pacResult.success ? pacResult.data : [];
    const superpacExpenditures = superpacResult.success ? superpacResult.data : [];
    const operatingExpenditures = operatingResult.success ? operatingResult.data : [];
    const otherTransactions = otherTransactionsResult.success ? otherTransactionsResult.data : [];
    
    // Separate support and oppose amounts from PAC contributions
    const pacSupportAmount = pacContributions
      .filter((pac: any) => pac.support_oppose === 'SUPPORT')
      .reduce((sum: number, pac: any) => sum + parseFloat(pac.total_amount || 0), 0);
    
    const pacOpposeAmount = pacContributions
      .filter((pac: any) => pac.support_oppose === 'OPPOSE')
      .reduce((sum: number, pac: any) => sum + parseFloat(pac.total_amount || 0), 0);
    
    // Separate support and oppose amounts from independent expenditures
    const expSupportAmount = superpacExpenditures
      .filter((exp: any) => exp.support_oppose === 'SUPPORT')
      .reduce((sum: number, exp: any) => sum + parseFloat(exp.total_amount || 0), 0);
    
    const expOpposeAmount = superpacExpenditures
      .filter((exp: any) => exp.support_oppose === 'OPPOSE')
      .reduce((sum: number, exp: any) => sum + parseFloat(exp.total_amount || 0), 0);
    
    // Debug logging removed for production
    
    // Calculate net amounts (support - oppose) with recency priority
    const totalSupportAmount = pacSupportAmount + expSupportAmount;
    const totalOpposeAmount = pacOpposeAmount + expOpposeAmount;
    const totalProIsraelAmount = totalSupportAmount - totalOpposeAmount;
    
    // Get most recent transaction year for recency logic
    const allTransactions = [...pacContributions, ...superpacExpenditures];
    const mostRecentYear = allTransactions.length > 0 
      ? Math.max(...allTransactions.map((t: any) => parseInt(t.most_recent_year || 0)))
      : 0;
    
    const proIsraelPacCount = pacContributions.filter((pac: any) => pac.support_oppose === 'SUPPORT').length;
    
    // Calculate cycle breakdown
    const cycleBreakdown = await getCycleBreakdown(personId);
    
    // Helper function to get cycle breakdown
    async function getCycleBreakdown(personId: string) {
      try {
        // Get all election years with pro-Israel activity for this person
        const yearsQuery = `
          SELECT DISTINCT cc.file_year
          FROM committee_candidate_contributions cc
          JOIN committee_master cm ON cc.cmte_id = cm.cmte_id
          JOIN person_candidates pc ON cc.cand_id = pc.cand_id
          WHERE pc.person_id = $1
          AND cc.transaction_amt != 0
          AND cc.transaction_tp IN ('24A', '24E', '24C', '24N', '24K')
          AND (
            cc.cmte_id = ANY($2) OR
            (cm.cmte_nm ILIKE '%AIPAC%' OR cm.cmte_nm ILIKE '%NORPAC%' OR cm.cmte_nm ILIKE '%Pro-Israel America%' OR cm.cmte_nm ILIKE '%Republican Jewish Coalition%' OR cm.cmte_nm ILIKE '%U.S. Israel PAC%' OR cm.cmte_nm ILIKE '%USI PAC%' OR cm.cmte_nm ILIKE '%JACPAC%' OR cm.cmte_nm ILIKE '%ZOA%' OR cm.cmte_nm ILIKE '%Zionist Organization of America%' OR cm.cmte_nm ILIKE '%Israel PAC%' OR cm.cmte_nm ILIKE '%Jewish PAC%' OR cm.cmte_nm ILIKE '%American Israel%' OR cm.cmte_nm ILIKE '%Israel America%' OR cm.cmte_nm ILIKE '%United Democracy Project%' OR cm.cmte_nm ILIKE '%UDP%')
          )
          ORDER BY cc.file_year DESC
        `;
        
        const yearsResult = await executeQuery(yearsQuery, [personId, PRO_ISRAEL_PACS], true);
        const years = yearsResult.success ? yearsResult.data.map((row: any) => row.file_year) : [];
        
        const breakdown = [];
        
        for (const year of years) {
          // Get PAC contributions for this year
          const pacQuery = `
            SELECT 
              cc.cmte_id,
              cm.cmte_nm as committee_name,
              SUM(CAST(ABS(cc.transaction_amt) AS NUMERIC)) as total_amount,
              CASE 
                WHEN cc.transaction_tp = '24E' THEN 'SUPPORT'
                WHEN cc.transaction_tp = '24A' THEN 'OPPOSE'
                WHEN SUM(cc.transaction_amt) > 0 THEN 'SUPPORT'
                WHEN SUM(cc.transaction_amt) < 0 THEN 'OPPOSE'
                ELSE 'NEUTRAL'
              END as support_oppose
            FROM committee_candidate_contributions cc
            JOIN committee_master cm ON cc.cmte_id = cm.cmte_id
            JOIN person_candidates pc ON cc.cand_id = pc.cand_id
            WHERE pc.person_id = $1
            AND cc.file_year = $2
            AND cc.transaction_amt != 0
            AND cc.transaction_tp IN ('24A', '24E', '24C', '24N', '24K')
            AND (
              cc.cmte_id = ANY($3) OR
              (cm.cmte_nm ILIKE '%AIPAC%' OR cm.cmte_nm ILIKE '%NORPAC%' OR cm.cmte_nm ILIKE '%Pro-Israel America%' OR cm.cmte_nm ILIKE '%Republican Jewish Coalition%' OR cm.cmte_nm ILIKE '%U.S. Israel PAC%' OR cm.cmte_nm ILIKE '%USI PAC%' OR cm.cmte_nm ILIKE '%JACPAC%' OR cm.cmte_nm ILIKE '%ZOA%' OR cm.cmte_nm ILIKE '%Zionist Organization of America%' OR cm.cmte_nm ILIKE '%Israel PAC%' OR cm.cmte_nm ILIKE '%Jewish PAC%' OR cm.cmte_nm ILIKE '%American Israel%' OR cm.cmte_nm ILIKE '%Israel America%' OR cm.cmte_nm ILIKE '%United Democracy Project%' OR cm.cmte_nm ILIKE '%UDP%')
            )
            GROUP BY cc.cmte_id, cm.cmte_nm, cc.transaction_tp
          `;
          
          const pacResult = await executeQuery(pacQuery, [personId, year, PRO_ISRAEL_PACS], true);
          const pacContributions = pacResult.success ? pacResult.data : [];
          
          // Get SuperPAC expenditures for this year
          const superpacQuery = `
            SELECT 
              cc.cmte_id,
              cm.cmte_nm as committee_name,
              SUM(CAST(ABS(cc.transaction_amt) AS NUMERIC)) as total_amount,
              CASE 
                WHEN cc.transaction_tp = '24E' THEN 'SUPPORT'
                WHEN cc.transaction_tp = '24A' THEN 'OPPOSE'
                WHEN SUM(cc.transaction_amt) > 0 THEN 'SUPPORT'
                WHEN SUM(cc.transaction_amt) < 0 THEN 'OPPOSE'
                ELSE 'NEUTRAL'
              END as support_oppose
            FROM committee_candidate_contributions cc
            JOIN committee_master cm ON cc.cmte_id = cm.cmte_id
            JOIN person_candidates pc ON cc.cand_id = pc.cand_id
            WHERE pc.person_id = $1
            AND cc.file_year = $2
            AND cc.transaction_amt != 0
            AND cc.transaction_tp IN ('24A', '24E')
            AND (
              cc.cmte_id = ANY($3) OR
              (cm.cmte_nm ILIKE '%AIPAC%' OR cm.cmte_nm ILIKE '%NORPAC%' OR cm.cmte_nm ILIKE '%Pro-Israel America%' OR cm.cmte_nm ILIKE '%Republican Jewish Coalition%' OR cm.cmte_nm ILIKE '%U.S. Israel PAC%' OR cm.cmte_nm ILIKE '%USI PAC%' OR cm.cmte_nm ILIKE '%JACPAC%' OR cm.cmte_nm ILIKE '%ZOA%' OR cm.cmte_nm ILIKE '%Zionist Organization of America%' OR cm.cmte_nm ILIKE '%Israel PAC%' OR cm.cmte_nm ILIKE '%Jewish PAC%' OR cm.cmte_nm ILIKE '%American Israel%' OR cm.cmte_nm ILIKE '%Israel America%' OR cm.cmte_nm ILIKE '%United Democracy Project%' OR cm.cmte_nm ILIKE '%UDP%')
            )
            GROUP BY cc.cmte_id, cm.cmte_nm, cc.transaction_tp
          `;
          
          const superpacResult = await executeQuery(superpacQuery, [personId, year, PRO_ISRAEL_PACS], true);
          const superpacExpenditures = superpacResult.success ? superpacResult.data : [];
          
          // Calculate totals for this year
          const totalSupport = pacContributions
            .filter((pac: any) => pac.support_oppose === 'SUPPORT')
            .reduce((sum: number, pac: any) => sum + parseFloat(pac.total_amount || 0), 0) +
            superpacExpenditures
            .filter((exp: any) => exp.support_oppose === 'SUPPORT')
            .reduce((sum: number, exp: any) => sum + parseFloat(exp.total_amount || 0), 0);
          
          const totalOppose = pacContributions
            .filter((pac: any) => pac.support_oppose === 'OPPOSE')
            .reduce((sum: number, pac: any) => sum + parseFloat(pac.total_amount || 0), 0) +
            superpacExpenditures
            .filter((exp: any) => exp.support_oppose === 'OPPOSE')
            .reduce((sum: number, exp: any) => sum + parseFloat(exp.total_amount || 0), 0);
          
          const netAmount = totalSupport - totalOppose;
          
          breakdown.push({
            election_year: year,
            total_support: totalSupport,
            total_oppose: totalOppose,
            net_amount: netAmount,
            pac_count: pacContributions.length,
            superpac_count: superpacExpenditures.length,
            pac_contributions: pacContributions.map((pac: any) => ({
              pac_id: pac.cmte_id,
              pac_name: pac.committee_name,
              amount: parseFloat(pac.total_amount || 0),
              support_oppose: pac.support_oppose
            })),
            superpac_expenditures: superpacExpenditures.map((exp: any) => ({
              committee_id: exp.cmte_id,
              committee_name: exp.committee_name,
              amount: parseFloat(exp.total_amount || 0),
              support_oppose: exp.support_oppose
            }))
          });
        }
        
        return breakdown;
      } catch (error) {
        console.error('Error getting cycle breakdown:', error);
        return [];
      }
    }
    
    // Debug logging removed for production
    
    // Calculate lobby score (0-100)
    // Higher score = more pro-Israel support
    let lobbyScore = 0;
    
    // Debug logging removed for production
    
    if (totalProIsraelAmount > 0) {
      // Base score from PAC contributions (0-60 points)
      // Use binary signal: take the higher amount (support vs oppose) as indicator
      const maxPacAmount = Math.max(pacSupportAmount, pacOpposeAmount);
      const isPacSupport = pacSupportAmount > pacOpposeAmount;
      
      let pacScore = 0;
      if (maxPacAmount > 0) {
        if (isPacSupport) {
          // Support: $10k = 30 points, $20k = 60 points
          pacScore = Math.min(60, (maxPacAmount / 10000) * 30);
        } else {
          // Oppose: $10k = 30 points, $20k = 60 points (but this indicates anti-Israel)
          pacScore = Math.min(60, (maxPacAmount / 10000) * 30);
          // For oppose, we want to show this as a strong anti-Israel signal
          // So we'll set score to 0 (Grade F) for significant oppose amounts
          if (maxPacAmount > 50000) { // $50k+ oppose = clear anti-Israel signal
            pacScore = 0;
          }
        }
      }
      
      // SuperPAC score (0-40 points)
      const superpacScore = Math.min(40, (expSupportAmount / 50000) * 40); // $50k = 40 points
      
      lobbyScore = Math.min(100, Math.max(0, pacScore + superpacScore));
      
      // Debug logging removed for production
    }
    
    // Determine grade and category
    let lobbyGrade: 'A' | 'B' | 'C' | 'D' | 'F';
    let lobbyCategory: 'High Support' | 'Moderate Support' | 'Low Support' | 'No Support' | 'Unknown';
    
    if (lobbyScore >= 80) {
      lobbyGrade = 'A';
      lobbyCategory = 'High Support';
    } else if (lobbyScore >= 60) {
      lobbyGrade = 'B';
      lobbyCategory = 'Moderate Support';
    } else if (lobbyScore >= 40) {
      lobbyGrade = 'C';
      lobbyCategory = 'Low Support';
    } else if (lobbyScore > 0) {
      lobbyGrade = 'D';
      lobbyCategory = 'Low Support';
    } else {
      lobbyGrade = 'F';
      lobbyCategory = 'No Support';
    }
    
    // Get historical Israel lobby data for enhanced scoring
    const historicalData = await getHistoricalIsraelLobbyData(personId);
    
    // Calculate enhanced humanity score based on historical patterns
    // 0 = most pro-Israel (worst humanity score)
    // 5 = least pro-Israel (best humanity score)
    let humanityScore = 5; // Default to best score
    
    console.log('DEBUG: Historical data for', personId, ':', historicalData);
    console.log('DEBUG: totalProIsraelAmount:', totalProIsraelAmount);
    console.log('DEBUG: pacSupportAmount:', pacSupportAmount, 'pacOpposeAmount:', pacOpposeAmount);
    console.log('DEBUG: expSupportAmount:', expSupportAmount, 'expOpposeAmount:', expOpposeAmount);
    
    // NEW: Handle AIPAC opposition FIRST as a positive sign
    // If AIPAC is actively opposing the candidate, this is a GOOD sign for humanity
    const aipacOpposition = pacContributions.filter((pac: any) => 
      pac.pac_id === 'C00797670' && pac.support_oppose === 'OPPOSE'
    );
    
    let aipacOppositionOverride = false;
    
    if (aipacOpposition.length > 0) {
      const totalAipacOpposition = aipacOpposition.reduce((sum: number, pac: any) => sum + parseFloat(pac.total_amount || 0), 0);
      console.log('DEBUG: AIPAC opposition detected:', totalAipacOpposition);
      
      if (totalAipacOpposition > 100000) { // Significant AIPAC opposition
        console.log('DEBUG: Significant AIPAC opposition - setting humanityScore to 5');
        humanityScore = 5; // Best humanity score for standing up to AIPAC
        aipacOppositionOverride = true; // Override all historical rules
      } else if (totalAipacOpposition > 50000) { // Moderate AIPAC opposition
        console.log('DEBUG: Moderate AIPAC opposition - setting humanityScore to 4');
        humanityScore = Math.max(humanityScore, 4); // Good humanity score
      } else if (totalAipacOpposition > 0) { // Any AIPAC opposition
        console.log('DEBUG: Minor AIPAC opposition - setting humanityScore to 3');
        humanityScore = Math.max(humanityScore, 3); // Decent humanity score
      }
    }
    
    // Apply the new scoring logic based on historical patterns
    console.log('DEBUG: aipacOppositionOverride:', aipacOppositionOverride);
    console.log('DEBUG: historicalData.hasEverReceivedFunding:', historicalData.hasEverReceivedFunding);
    if (!aipacOppositionOverride && historicalData.hasEverReceivedFunding) {
      console.log('DEBUG: Candidate has ever received funding');
      // Rule 1: If candidate has ever received funding from Israel, score is at most 4
      humanityScore = Math.min(humanityScore, 4);
      
      // Check if candidate has won any election with funding
      const hasWonWithFunding = historicalData.hasWonElection;
      
      if (hasWonWithFunding && historicalData.electionYearsWithFunding.length === 1) {
        console.log('DEBUG: Rule 2 applied - won 1 election with funding');
        // Rule 2: If candidate has received funding in 1 election cycle and won, score is at most 3
        humanityScore = Math.min(humanityScore, 3);
      }
      
      if (historicalData.electionYearsWithFunding.length > 1) {
        console.log('DEBUG: Rule 3 applied - multiple election cycles with funding');
        // Rule 3: If candidate has received funding in multiple election cycles, one most being recent, score is at most 2
        humanityScore = Math.min(humanityScore, 2);
        
        if (hasWonWithFunding) {
          console.log('DEBUG: Rule 4 applied - won multiple elections with funding');
          // Rule 4: If candidate has received funding in multiple election cycles and won, score is at most 1
          humanityScore = Math.min(humanityScore, 1);
        }
      }
      
      // Rule 5: If candidate has received funding in the most recent election cycle they are a 0
      if (historicalData.mostRecentElectionYear > 0) {
        console.log('DEBUG: Rule 5 applied - funding in most recent election');
        humanityScore = 0;
      }
    } else if (aipacOppositionOverride) {
      console.log('DEBUG: AIPAC opposition override - skipping historical rules');
    } else {
      console.log('DEBUG: Candidate has never received funding');
    }
    
    // Fallback to original scoring if no historical patterns apply
    // Only apply fallback if there's any lobby activity (support OR oppose)
    const hasAnyLobbyActivity = totalProIsraelAmount > 0 || pacOpposeAmount > 0 || expOpposeAmount > 0;
    
    console.log('DEBUG: hasAnyLobbyActivity:', hasAnyLobbyActivity);
    console.log('DEBUG: humanityScore before fallback:', humanityScore);
    console.log('DEBUG: lobbyScore:', lobbyScore);
    
    if (humanityScore === 5 && hasAnyLobbyActivity) {
      console.log('DEBUG: Applying fallback logic');
      if (lobbyScore >= 80) {
        humanityScore = 0; // Grade A = 0 (worst humanity score)
        console.log('DEBUG: Set humanityScore to 0 (Grade A)');
      } else if (lobbyScore >= 60) {
        humanityScore = 1; // Grade B = 1
        console.log('DEBUG: Set humanityScore to 1 (Grade B)');
      } else if (lobbyScore >= 40) {
        humanityScore = 2; // Grade C = 2
        console.log('DEBUG: Set humanityScore to 2 (Grade C)');
      } else if (lobbyScore > 0) {
        humanityScore = 3; // Grade D = 3
        console.log('DEBUG: Set humanityScore to 3 (Grade D)');
      }
    }
    
    // If no lobby activity at all, ensure humanity score is 5 (best)
    if (!hasAnyLobbyActivity) {
      console.log('DEBUG: No lobby activity, setting humanityScore to 5');
      humanityScore = 5;
    }
    
    // Enhanced scoring logic for nuanced cases
    if (totalProIsraelAmount === 0) {
      console.log('DEBUG: No support money received, setting humanityScore to 5');
      humanityScore = 5;
    } else {
      // Check for the specific case: past support but no recent support
      const hasPastSupport = historicalData.hasEverReceivedFunding && historicalData.electionYearsWithFunding.length > 0;
      const mostRecentYear = historicalData.electionYearsWithFunding.length > 0 ? Math.max(...historicalData.electionYearsWithFunding) : 0;
      const isRecentSupport = mostRecentYear >= 2020; // Consider 2020+ as "recent"
      
      if (hasPastSupport && !isRecentSupport) {
        console.log('DEBUG: Past support, no recent support - setting humanityScore to 4');
        humanityScore = 4; // Past support but independent now
      }
    }
    

    
    console.log('DEBUG: Final humanityScore:', humanityScore);
    
    // Format detailed breakdown
    const formattedPacContributions = pacContributions.map((pac: any) => ({
      pac_id: pac.pac_id,
      pac_name: pac.pac_name,
      amount: parseFloat(pac.total_amount),
      contribution_date: pac.last_contribution,
      support_oppose: pac.support_oppose
    }));
    
    const formattedSuperpacExpenditures = superpacExpenditures.map((exp: any) => ({
      committee_id: exp.cmte_id,
      committee_name: exp.committee_name,
      amount: parseFloat(exp.total_amount),
      support_oppose: exp.support_oppose,
      expenditure_date: exp.last_expenditure
    }));
    
    const israelLobbyScore: IsraelLobbyScore = {
      candidate_id: candId,
      person_id: candidate.person_id,
      candidate_name: candidate.display_name,
      state: candidate.state,
      district: candidate.current_district,
      office: candidate.current_office,
      party: candidate.current_party,
      election_year: candidate.election_year,
      
      total_pro_israel_contributions: totalProIsraelAmount,
      pro_israel_pac_count: proIsraelPacCount,
      pro_israel_contribution_amount: pacSupportAmount,
      pro_israel_superpac_amount: expSupportAmount,
      
      lobby_score: Math.round(lobbyScore),
      lobby_grade: lobbyGrade,
      lobby_category: lobbyCategory,
      humanity_score: humanityScore,
      
      pac_contributions: formattedPacContributions,
      superpac_expenditures: formattedSuperpacExpenditures,
      operating_expenditures: operatingExpenditures.map((exp: any) => ({
        committee_id: exp.cmte_id,
        committee_name: exp.committee_name,
        amount: parseFloat(exp.total_amount || 0),
        purpose: exp.purpose || '',
        category: exp.category || '',
        category_desc: exp.category_desc || '',
        expenditure_date: exp.last_expenditure
      })),
      other_transactions: otherTransactions.map((trans: any) => ({
        committee_id: trans.cmte_id,
        committee_name: trans.committee_name,
        amount: parseFloat(trans.total_amount || 0),
        transaction_type: trans.transaction_tp,
        transaction_date: trans.last_transaction
      })),
      cycle_breakdown: cycleBreakdown
    };
    
    return { success: true, data: israelLobbyScore };
    
  } catch (error) {
    console.error('Error calculating Israel lobby score:', error);
    return { success: false, error: 'Failed to calculate Israel lobby score' };
  }
}

export async function getIsraelLobbyOverview(electionYear: number = 2024) {
  try {
    // Get overall statistics
    const statsQuery = `
      SELECT 
        COUNT(DISTINCT cc.cand_id) as candidates_with_pro_israel_support,
        SUM(CAST(cc.transaction_amt AS NUMERIC)) as total_pro_israel_contributions,
        COUNT(DISTINCT cc.cmte_id) as unique_pro_israel_pacs
      FROM committee_candidate_contributions cc
      JOIN committee_master cm ON cc.cmte_id = cm.cmte_id
      WHERE cc.file_year = $1
      AND cc.transaction_amt > 0
      AND cc.transaction_tp IN ('24A', '24E', '24C', '24N', '24K')
      AND (
        cc.cmte_id = ANY($2) OR
        (cm.cmte_nm ILIKE '%AIPAC%' OR cm.cmte_nm ILIKE '%NORPAC%' OR cm.cmte_nm ILIKE '%Pro-Israel America%' OR cm.cmte_nm ILIKE '%Republican Jewish Coalition%' OR cm.cmte_nm ILIKE '%U.S. Israel PAC%' OR cm.cmte_nm ILIKE '%USI PAC%' OR cm.cmte_nm ILIKE '%JACPAC%' OR cm.cmte_nm ILIKE '%ZOA%' OR cm.cmte_nm ILIKE '%Zionist Organization of America%' OR cm.cmte_nm ILIKE '%Israel PAC%' OR cm.cmte_nm ILIKE '%Jewish PAC%' OR cm.cmte_nm ILIKE '%American Israel%' OR cm.cmte_nm ILIKE '%Israel America%' OR cm.cmte_nm ILIKE '%United Democracy Project%' OR cm.cmte_nm ILIKE '%UDP%')
      )
    `;
    
    const statsResult = await executeQuery(
      statsQuery,
      [electionYear, PRO_ISRAEL_PACS],
      true
    );
    
    // Get top pro-Israel PACs
    const topPacsQuery = `
      SELECT 
        cc.cmte_id,
        cm.cmte_nm as pac_name,
        SUM(CAST(cc.transaction_amt AS NUMERIC)) as total_contributions,
        COUNT(DISTINCT cc.cand_id) as candidate_count
      FROM committee_candidate_contributions cc
      JOIN committee_master cm ON cc.cmte_id = cm.cmte_id
      WHERE cc.file_year = $1
      AND cc.transaction_amt > 0
      AND cc.transaction_tp IN ('24A', '24E', '24C', '24N', '24K')
      AND (
        cc.cmte_id = ANY($2) OR
        (cm.cmte_nm ILIKE '%AIPAC%' OR cm.cmte_nm ILIKE '%NORPAC%' OR cm.cmte_nm ILIKE '%Pro-Israel America%' OR cm.cmte_nm ILIKE '%Republican Jewish Coalition%' OR cm.cmte_nm ILIKE '%U.S. Israel PAC%' OR cm.cmte_nm ILIKE '%USI PAC%' OR cm.cmte_nm ILIKE '%JACPAC%' OR cm.cmte_nm ILIKE '%ZOA%' OR cm.cmte_nm ILIKE '%Zionist Organization of America%' OR cm.cmte_nm ILIKE '%Israel PAC%' OR cm.cmte_nm ILIKE '%Jewish PAC%' OR cm.cmte_nm ILIKE '%American Israel%' OR cm.cmte_nm ILIKE '%Israel America%' OR cm.cmte_nm ILIKE '%United Democracy Project%' OR cm.cmte_nm ILIKE '%UDP%')
      )
      GROUP BY cc.cmte_id, cm.cmte_nm
      ORDER BY total_contributions DESC
      LIMIT 10
    `;
    
    const topPacsResult = await executeQuery(
      topPacsQuery,
      [electionYear, PRO_ISRAEL_PACS],
      true
    );
    
    return {
      success: true,
      data: {
        stats: statsResult.success ? statsResult.data[0] : null,
        top_pacs: topPacsResult.success ? topPacsResult.data : []
      }
    };
    
  } catch (error) {
    console.error('Error getting Israel lobby overview:', error);
    return { success: false, error: 'Failed to get Israel lobby overview' };
  }
} 

// Optimized function for candidates page - lightweight summary
export async function getIsraelLobbySummary(personId: string): Promise<{
  success: boolean;
  data?: {
    humanity_score: number;
    total_pro_israel_contributions: number;
    lobby_grade: 'A' | 'B' | 'C' | 'D' | 'F';
    lobby_category: 'High Support' | 'Moderate Support' | 'Low Support' | 'No Support' | 'Unknown';
  };
  error?: string;
}> {
  try {
    // Use real-time calculation (summary table not implemented yet)
    const historicalData = await getHistoricalIsraelLobbyData(personId);
    
    // Get PAC contributions (separate support and oppose) - aggregate across all FEC IDs for person
    const pacQuery = `
      SELECT 
        cc.cmte_id,
        cm.cmte_nm as committee_name,
        SUM(CAST(ABS(cc.transaction_amt) AS NUMERIC)) as total_amount,
        COUNT(*) as contribution_count,
        MAX(cc.file_year) as most_recent_year,
        CASE 
          WHEN cc.transaction_tp = '24E' THEN 'SUPPORT'
          WHEN cc.transaction_tp = '24A' THEN 'OPPOSE'
          WHEN SUM(cc.transaction_amt) > 0 THEN 'SUPPORT'
          WHEN SUM(cc.transaction_amt) < 0 THEN 'OPPOSE'
          ELSE 'NEUTRAL'
        END as support_oppose
      FROM committee_candidate_contributions cc
      JOIN committee_master cm ON cc.cmte_id = cm.cmte_id
      JOIN person_candidates pc ON cc.cand_id = pc.cand_id
      WHERE pc.person_id = $1
      AND cc.transaction_amt != 0
      AND cc.transaction_tp IN ('24A', '24E', '24C', '24N', '24K')
      AND (
        cc.cmte_id = ANY($2) OR
        (cm.cmte_nm ILIKE '%AIPAC%' OR cm.cmte_nm ILIKE '%NORPAC%' OR cm.cmte_nm ILIKE '%Pro-Israel America%' OR cm.cmte_nm ILIKE '%Republican Jewish Coalition%' OR cm.cmte_nm ILIKE '%U.S. Israel PAC%' OR cm.cmte_nm ILIKE '%USI PAC%' OR cm.cmte_nm ILIKE '%JACPAC%' OR cm.cmte_nm ILIKE '%ZOA%' OR cm.cmte_nm ILIKE '%Zionist Organization of America%' OR cm.cmte_nm ILIKE '%Israel PAC%' OR cm.cmte_nm ILIKE '%Jewish PAC%' OR cm.cmte_nm ILIKE '%American Israel%' OR cm.cmte_nm ILIKE '%Israel America%' OR cm.cmte_nm ILIKE '%United Democracy Project%' OR cm.cmte_nm ILIKE '%UDP%')
      )
      GROUP BY cc.cmte_id, cm.cmte_nm, cc.transaction_tp
    `;
    
    const pacResult = await executeQuery(
      pacQuery,
      [personId, PRO_ISRAEL_PACS],
      true
    );
    
    // Get SuperPAC expenditures (separate support and oppose) - only independent expenditures to avoid double-counting
    const superpacQuery = `
      SELECT 
        cc.cmte_id,
        cm.cmte_nm as committee_name,
        SUM(CAST(ABS(cc.transaction_amt) AS NUMERIC)) as total_amount,
        COUNT(*) as expenditure_count,
        MAX(cc.file_year) as most_recent_year,
        CASE 
          WHEN cc.transaction_tp = '24E' THEN 'SUPPORT'
          WHEN cc.transaction_tp = '24A' THEN 'OPPOSE'
          WHEN SUM(cc.transaction_amt) > 0 THEN 'SUPPORT'
          WHEN SUM(cc.transaction_amt) < 0 THEN 'OPPOSE'
          ELSE 'NEUTRAL'
        END as support_oppose
      FROM committee_candidate_contributions cc
      JOIN committee_master cm ON cc.cmte_id = cm.cmte_id
      JOIN person_candidates pc ON cc.cand_id = pc.cand_id
      WHERE pc.person_id = $1
      AND cc.transaction_amt != 0
      AND cc.transaction_tp IN ('24A', '24E')  -- Only independent expenditures, not PAC contributions
      AND (
        cc.cmte_id = ANY($2) OR
        (cm.cmte_nm ILIKE '%AIPAC%' OR cm.cmte_nm ILIKE '%NORPAC%' OR cm.cmte_nm ILIKE '%Pro-Israel America%' OR cm.cmte_nm ILIKE '%Republican Jewish Coalition%' OR cm.cmte_nm ILIKE '%U.S. Israel PAC%' OR cm.cmte_nm ILIKE '%USI PAC%' OR cm.cmte_nm ILIKE '%JACPAC%' OR cm.cmte_nm ILIKE '%ZOA%' OR cm.cmte_nm ILIKE '%Zionist Organization of America%' OR cm.cmte_nm ILIKE '%Israel PAC%' OR cm.cmte_nm ILIKE '%Jewish PAC%' OR cm.cmte_nm ILIKE '%American Israel%' OR cm.cmte_nm ILIKE '%Israel America%' OR cm.cmte_nm ILIKE '%United Democracy Project%' OR cm.cmte_nm ILIKE '%UDP%')
      )
      GROUP BY cc.cmte_id, cm.cmte_nm, cc.transaction_tp
    `;
    
    const superpacResult = await executeQuery(
      superpacQuery,
      [personId, PRO_ISRAEL_PACS],
      true
    );
    
    // Calculate totals with recency logic and net amounts
    const pacContributions = pacResult.success ? pacResult.data : [];
    const superpacExpenditures = superpacResult.success ? superpacResult.data : [];
    
    // Separate support and oppose amounts from PAC contributions
    const pacSupportAmount = pacContributions
      .filter((pac: any) => pac.support_oppose === 'SUPPORT')
      .reduce((sum: number, pac: any) => sum + parseFloat(pac.total_amount || 0), 0);
    
    const pacOpposeAmount = pacContributions
      .filter((pac: any) => pac.support_oppose === 'OPPOSE')
      .reduce((sum: number, pac: any) => sum + parseFloat(pac.total_amount || 0), 0);
    
    const expSupportAmount = superpacExpenditures
      .filter((exp: any) => exp.support_oppose === 'SUPPORT')
      .reduce((sum: number, exp: any) => sum + parseFloat(exp.total_amount || 0), 0);
    
    const expOpposeAmount = superpacExpenditures
      .filter((exp: any) => exp.support_oppose === 'OPPOSE')
      .reduce((sum: number, exp: any) => sum + parseFloat(exp.total_amount || 0), 0);
    
    // Calculate net amounts (support - oppose) with recency priority
    const totalSupportAmount = pacSupportAmount + expSupportAmount;
    const totalOpposeAmount = pacOpposeAmount + expOpposeAmount;
    const totalProIsraelAmount = totalSupportAmount - totalOpposeAmount;
    
    // Get most recent transaction year for recency logic
    const allTransactions = [...pacContributions, ...superpacExpenditures];
    const mostRecentYear = allTransactions.length > 0 
      ? Math.max(...allTransactions.map((t: any) => parseInt(t.most_recent_year || 0)))
      : 0;
    
    console.log('DEBUG SUMMARY: pacSupportAmount:', pacSupportAmount, 'expSupportAmount:', expSupportAmount);
    console.log('DEBUG SUMMARY: pacContributions:', pacContributions.length, 'superpacExpenditures:', superpacExpenditures.length);
    console.log('DEBUG SUMMARY: pacContributions data:', JSON.stringify(pacContributions, null, 2));
    console.log('DEBUG SUMMARY: superpacExpenditures data:', JSON.stringify(superpacExpenditures, null, 2));
    
    // Calculate humanity score based on historical patterns
    let humanityScore = 5; // Default to best score
    
    console.log('DEBUG SUMMARY: Historical data for', personId, ':', historicalData);
    console.log('DEBUG SUMMARY: totalProIsraelAmount:', totalProIsraelAmount);
    
    // Apply the scoring logic based on historical patterns
    if (historicalData.hasEverReceivedFunding) {
      console.log('DEBUG SUMMARY: Candidate has ever received funding');
      // Rule 1: If candidate has ever received funding from Israel, score is at most 4
      humanityScore = Math.min(humanityScore, 4);
      
      // Check if candidate has won any election with funding
      const hasWonWithFunding = historicalData.hasWonElection;
      
      if (hasWonWithFunding && historicalData.electionYearsWithFunding.length === 1) {
        console.log('DEBUG SUMMARY: Rule 2 applied - won 1 election with funding');
        // Rule 2: If candidate has received funding in 1 election cycle and won, score is at most 3
        humanityScore = Math.min(humanityScore, 3);
      }
      
      if (historicalData.electionYearsWithFunding.length > 1) {
        console.log('DEBUG SUMMARY: Rule 3 applied - multiple election cycles with funding');
        // Rule 3: If candidate has received funding in multiple election cycles, one most being recent, score is at most 2
        humanityScore = Math.min(humanityScore, 2);
        
        if (hasWonWithFunding) {
          console.log('DEBUG SUMMARY: Rule 4 applied - won multiple elections with funding');
          // Rule 4: If candidate has received funding in multiple election cycles and won, score is at most 1
          humanityScore = Math.min(humanityScore, 1);
        }
      }
      
      // Rule 5: If candidate has received funding in the most recent election cycle they are a 0
      if (historicalData.mostRecentElectionYear > 0) {
        console.log('DEBUG SUMMARY: Rule 5 applied - funding in most recent election');
        humanityScore = 0;
      }
    } else {
      console.log('DEBUG SUMMARY: Candidate has never received funding');
    }
    
    // Enhanced scoring logic with recency priority
    if (totalProIsraelAmount === 0) {
      console.log('DEBUG SUMMARY: No net support money received, setting humanityScore to 5');
      humanityScore = 5;
    } else {
      // Check for recency: prioritize recent transactions over older ones
      const isRecentTransaction = mostRecentYear >= 2022; // Consider 2022+ as "recent"
      const hasPastSupport = historicalData.hasEverReceivedFunding && historicalData.electionYearsWithFunding.length > 0;
      const hasRecentOpposition = totalOpposeAmount > 0 && mostRecentYear >= 2022;
      
      if (hasRecentOpposition && totalProIsraelAmount < 0) {
        console.log('DEBUG SUMMARY: Recent opposition outweighs past support - setting humanityScore to 5');
        humanityScore = 5; // Recent opposition means they're independent now
      } else if (hasPastSupport && !isRecentTransaction) {
        console.log('DEBUG SUMMARY: Past support, no recent activity - setting humanityScore to 4');
        humanityScore = 4; // Past support but no recent activity
      } else if (totalProIsraelAmount > 0 && isRecentTransaction) {
        console.log('DEBUG SUMMARY: Recent net support - applying standard rules');
        // Apply standard rules for recent support
      }
    }
    
    // NEW: Handle AIPAC opposition as a positive sign in summary function
    const aipacOpposition = pacContributions.filter((pac: any) => 
      pac.pac_id === 'C00797670' && pac.support_oppose === 'OPPOSE'
    );
    
    if (aipacOpposition.length > 0) {
      const totalAipacOpposition = aipacOpposition.reduce((sum: number, pac: any) => sum + pac.amount, 0);
      console.log('DEBUG SUMMARY: AIPAC opposition detected:', totalAipacOpposition);
      
      if (totalAipacOpposition > 100000) { // Significant AIPAC opposition
        console.log('DEBUG SUMMARY: Significant AIPAC opposition - setting humanityScore to 5');
        humanityScore = 5; // Best humanity score for standing up to AIPAC
      } else if (totalAipacOpposition > 50000) { // Moderate AIPAC opposition
        console.log('DEBUG SUMMARY: Moderate AIPAC opposition - setting humanityScore to 4');
        humanityScore = Math.max(humanityScore, 4); // Good humanity score
      } else if (totalAipacOpposition > 0) { // Any AIPAC opposition
        console.log('DEBUG SUMMARY: Minor AIPAC opposition - setting humanityScore to 3');
        humanityScore = Math.max(humanityScore, 3); // Decent humanity score
      }
    }
    
    // Calculate lobby grade and category based on total amount
    let lobbyGrade: 'A' | 'B' | 'C' | 'D' | 'F';
    let lobbyCategory: 'High Support' | 'Moderate Support' | 'Low Support' | 'No Support' | 'Unknown';
    
    if (totalProIsraelAmount >= 10000000) { // $10M+
      lobbyGrade = 'A';
      lobbyCategory = 'High Support';
    } else if (totalProIsraelAmount >= 1000000) { // $1M+
      lobbyGrade = 'B';
      lobbyCategory = 'Moderate Support';
    } else if (totalProIsraelAmount >= 100000) { // $100K+
      lobbyGrade = 'C';
      lobbyCategory = 'Low Support';
    } else if (totalProIsraelAmount > 0) {
      lobbyGrade = 'D';
      lobbyCategory = 'Low Support';
    } else {
      lobbyGrade = 'F';
      lobbyCategory = 'No Support';
    }
    
    return {
      success: true,
      data: {
        humanity_score: humanityScore,
        total_pro_israel_contributions: totalProIsraelAmount,
        lobby_grade: lobbyGrade,
        lobby_category: lobbyCategory
      }
    };
    
  } catch (error) {
    console.error('Error getting Israel lobby summary:', error);
    return { success: false, error: 'Failed to get Israel lobby summary' };
  }
} 