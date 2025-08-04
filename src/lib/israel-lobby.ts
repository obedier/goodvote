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
  'UDP'
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
  }>;
  
  superpac_expenditures: Array<{
    committee_id: string;
    committee_name: string;
    amount: number;
    support_oppose: 'SUPPORT' | 'OPPOSE';
    expenditure_date: string;
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
    // Get all election years where candidate received pro-Israel funding
    const historicalQuery = `
      SELECT DISTINCT cc.file_year, 
             SUM(CAST(cc.transaction_amt AS NUMERIC)) as total_amount
      FROM committee_candidate_contributions cc
      JOIN committee_master cm ON cc.cmte_id = cm.cmte_id
      JOIN person_candidates pc ON cc.cand_id = pc.cand_id
      WHERE pc.person_id = $1
      AND cc.transaction_amt > 0
      AND cc.transaction_tp IN ('24A', '24E', '24C', '24N', '24K')
      AND (
        cc.cmte_id = ANY($2) OR
        (cm.cmte_nm ILIKE '%AIPAC%' OR cm.cmte_nm ILIKE '%NORPAC%' OR cm.cmte_nm ILIKE '%Pro-Israel America%' OR cm.cmte_nm ILIKE '%Republican Jewish Coalition%' OR cm.cmte_nm ILIKE '%U.S. Israel PAC%' OR cm.cmte_nm ILIKE '%USI PAC%' OR cm.cmte_nm ILIKE '%JACPAC%' OR cm.cmte_nm ILIKE '%ZOA%' OR cm.cmte_nm ILIKE '%Zionist Organization of America%' OR cm.cmte_nm ILIKE '%Israel PAC%' OR cm.cmte_nm ILIKE '%Jewish PAC%' OR cm.cmte_nm ILIKE '%American Israel%' OR cm.cmte_nm ILIKE '%Israel America%' OR cm.cmte_nm ILIKE '%United Democracy Project%' OR cm.cmte_nm ILIKE '%UDP%')
      )
      GROUP BY cc.file_year
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
      SELECT cand_id, file_year, current_office, current_party
      FROM person_candidates 
      WHERE person_id = $1
      ORDER BY file_year DESC
    `;

    const electionHistoryResult = await executeQuery(
      electionHistoryQuery,
      [personId],
      false
    );

    const electionHistory = electionHistoryResult.success ? electionHistoryResult.data : [];
    const hasWonElection = electionHistory.some((election: any) => 
      election.current_office && election.current_office !== ''
    );
    const hasWonRecentElection = electionHistory.length > 0 && 
      electionHistory[0].current_office && electionHistory[0].current_office !== '';

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
      SELECT DISTINCT pc.person_id, pc.cand_id, pc.display_name, pc.state, pc.current_office, 
             pc.current_district, pc.current_party, pc.election_year
      FROM person_candidates pc
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
    
    // Get pro-Israel PAC contributions (both FOR and AGAINST)
    const pacContributionsQuery = `
      SELECT 
        cc.cmte_id as pac_id,
        cm.cmte_nm as pac_name,
        SUM(CAST(ABS(cc.transaction_amt) AS NUMERIC)) as total_amount,
        COUNT(*) as contribution_count,
        MIN(cc.transaction_dt) as first_contribution,
        MAX(cc.transaction_dt) as last_contribution,
        CASE 
          WHEN cc.transaction_tp = '24E' THEN 'SUPPORT'
          WHEN cc.transaction_tp = '24A' THEN 'OPPOSE'
          WHEN SUM(cc.transaction_amt) > 0 THEN 'SUPPORT'
          WHEN SUM(cc.transaction_amt) < 0 THEN 'OPPOSE'
          ELSE 'NEUTRAL'
        END as support_oppose
      FROM committee_candidate_contributions cc
      JOIN committee_master cm ON cc.cmte_id = cm.cmte_id
      WHERE cc.cand_id = $1
      AND cc.file_year = $2
      AND cc.transaction_amt != 0
      AND cc.transaction_tp IN ('24A', '24E', '24C', '24N', '24K')
      AND (
        cc.cmte_id = ANY($3) OR
        (cm.cmte_nm ILIKE '%AIPAC%' OR cm.cmte_nm ILIKE '%NORPAC%' OR cm.cmte_nm ILIKE '%Pro-Israel America%' OR cm.cmte_nm ILIKE '%Republican Jewish Coalition%' OR cm.cmte_nm ILIKE '%U.S. Israel PAC%' OR cm.cmte_nm ILIKE '%USI PAC%' OR cm.cmte_nm ILIKE '%JACPAC%' OR cm.cmte_nm ILIKE '%ZOA%' OR cm.cmte_nm ILIKE '%Zionist Organization of America%' OR cm.cmte_nm ILIKE '%Israel PAC%' OR cm.cmte_nm ILIKE '%Jewish PAC%' OR cm.cmte_nm ILIKE '%American Israel%' OR cm.cmte_nm ILIKE '%Israel America%' OR cm.cmte_nm ILIKE '%United Democracy Project%' OR cm.cmte_nm ILIKE '%UDP%')
      )
      GROUP BY cc.cmte_id, cm.cmte_nm, cc.transaction_tp
      ORDER BY total_amount DESC
    `;
    
    const pacResult = await executeQuery(
      pacContributionsQuery, 
      [candId, electionYear, PRO_ISRAEL_PACS],
      true
    );
    
    // Get pro-Israel SuperPAC independent expenditures (from committee_candidate_contributions)
    const superpacQuery = `
      SELECT 
        cc.cmte_id,
        cm.cmte_nm as committee_name,
        SUM(CAST(ABS(cc.transaction_amt) AS NUMERIC)) as total_amount,
        COUNT(*) as expenditure_count,
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
      WHERE cc.cand_id = $1
      AND cc.file_year = $2
      AND cc.transaction_amt != 0
      AND cc.transaction_tp IN ('24A', '24E', '24F', '24K', '24N', '24P', '24R', '24Z')
      AND (
        cc.cmte_id = ANY($3) OR
        (cm.cmte_nm ILIKE '%AIPAC%' OR cm.cmte_nm ILIKE '%NORPAC%' OR cm.cmte_nm ILIKE '%Pro-Israel America%' OR cm.cmte_nm ILIKE '%Republican Jewish Coalition%' OR cm.cmte_nm ILIKE '%U.S. Israel PAC%' OR cm.cmte_nm ILIKE '%USI PAC%' OR cm.cmte_nm ILIKE '%JACPAC%' OR cm.cmte_nm ILIKE '%ZOA%' OR cm.cmte_nm ILIKE '%Zionist Organization of America%' OR cm.cmte_nm ILIKE '%Israel PAC%' OR cm.cmte_nm ILIKE '%Jewish PAC%' OR cm.cmte_nm ILIKE '%American Israel%' OR cm.cmte_nm ILIKE '%Israel America%' OR cm.cmte_nm ILIKE '%United Democracy Project%' OR cm.cmte_nm ILIKE '%UDP%')
      )
      GROUP BY cc.cmte_id, cm.cmte_nm, cc.transaction_tp
      ORDER BY total_amount DESC
    `;
    
    const superpacResult = await executeQuery(
      superpacQuery,
      [candId, electionYear, PRO_ISRAEL_PACS],
      true
    );
    
    // Get pro-Israel operating expenditures
    const operatingExpendituresQuery = `
      SELECT 
        oe.cmte_id,
        cm.cmte_nm as committee_name,
        SUM(CAST(ABS(oe.transaction_amt) AS NUMERIC)) as total_amount,
        COUNT(*) as expenditure_count,
        oe.purpose,
        oe.category,
        oe.category_desc,
        MIN(oe.transaction_dt) as first_expenditure,
        MAX(oe.transaction_dt) as last_expenditure
      FROM operating_expenditures oe
      JOIN committee_master cm ON oe.cmte_id = cm.cmte_id
      WHERE oe.file_year = $1
      AND oe.transaction_amt != 0
      AND (
        oe.purpose ILIKE '%AIPAC%' OR 
        oe.purpose ILIKE '%ISRAEL%' OR 
        oe.purpose ILIKE '%JEWISH%' OR 
        oe.purpose ILIKE '%ZIONIST%' OR
        oe.category_desc ILIKE '%ISRAEL%' OR 
        oe.category_desc ILIKE '%JEWISH%' OR
        cm.cmte_nm ILIKE '%AIPAC%' OR 
        cm.cmte_nm ILIKE '%NORPAC%' OR 
        cm.cmte_nm ILIKE '%Pro-Israel America%' OR 
        cm.cmte_nm ILIKE '%Republican Jewish Coalition%' OR 
        cm.cmte_nm ILIKE '%U.S. Israel PAC%' OR 
        cm.cmte_nm ILIKE '%USI PAC%' OR 
        cm.cmte_nm ILIKE '%JACPAC%' OR 
        cm.cmte_nm ILIKE '%ZOA%' OR 
        cm.cmte_nm ILIKE '%Zionist Organization of America%' OR 
        cm.cmte_nm ILIKE '%Israel PAC%' OR 
        cm.cmte_nm ILIKE '%Jewish PAC%' OR 
        cm.cmte_nm ILIKE '%American Israel%' OR 
        cm.cmte_nm ILIKE '%Israel America%' OR 
        cm.cmte_nm ILIKE '%United Democracy Project%' OR 
        cm.cmte_nm ILIKE '%UDP%'
      )
      GROUP BY oe.cmte_id, cm.cmte_nm, oe.purpose, oe.category, oe.category_desc
      ORDER BY total_amount DESC
    `;
    
    const operatingResult = await executeQuery(
      operatingExpendituresQuery,
      [electionYear],
      true
    );
    
    // Get other pro-Israel transactions (additional transaction types)
    const otherTransactionsQuery = `
      SELECT 
        cc.cmte_id,
        cm.cmte_nm as committee_name,
        SUM(CAST(ABS(cc.transaction_amt) AS NUMERIC)) as total_amount,
        COUNT(*) as transaction_count,
        cc.transaction_tp,
        MIN(cc.transaction_dt) as first_transaction,
        MAX(cc.transaction_dt) as last_transaction
      FROM committee_candidate_contributions cc
      JOIN committee_master cm ON cc.cmte_id = cm.cmte_id
      WHERE cc.cand_id = $1
      AND cc.file_year = $2
      AND cc.transaction_amt != 0
      AND cc.transaction_tp IN ('24C', '24Z')  -- Additional transaction types
      AND (
        cc.cmte_id = ANY($3) OR
        (cm.cmte_nm ILIKE '%AIPAC%' OR cm.cmte_nm ILIKE '%NORPAC%' OR cm.cmte_nm ILIKE '%Pro-Israel America%' OR cm.cmte_nm ILIKE '%Republican Jewish Coalition%' OR cm.cmte_nm ILIKE '%U.S. Israel PAC%' OR cm.cmte_nm ILIKE '%USI PAC%' OR cm.cmte_nm ILIKE '%JACPAC%' OR cm.cmte_nm ILIKE '%ZOA%' OR cm.cmte_nm ILIKE '%Zionist Organization of America%' OR cm.cmte_nm ILIKE '%Israel PAC%' OR cm.cmte_nm ILIKE '%Jewish PAC%' OR cm.cmte_nm ILIKE '%American Israel%' OR cm.cmte_nm ILIKE '%Israel America%' OR cm.cmte_nm ILIKE '%United Democracy Project%' OR cm.cmte_nm ILIKE '%UDP%')
      )
      GROUP BY cc.cmte_id, cm.cmte_nm, cc.transaction_tp
      ORDER BY total_amount DESC
    `;
    
    const otherTransactionsResult = await executeQuery(
      otherTransactionsQuery,
      [candId, electionYear, PRO_ISRAEL_PACS],
      true
    );
    
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
    
    const totalPacAmount = pacSupportAmount + pacOpposeAmount;
    const totalSuperpacAmount = expSupportAmount + expOpposeAmount;
    
    // Calculate total amounts for new spending categories
    const totalOperatingAmount = operatingExpenditures
      .reduce((sum: number, exp: any) => sum + parseFloat(exp.total_amount || 0), 0);
    
    const totalOtherAmount = otherTransactions
      .reduce((sum: number, trans: any) => sum + parseFloat(trans.total_amount || 0), 0);
    
    const totalProIsraelAmount = totalPacAmount + totalSuperpacAmount;
    const proIsraelPacCount = pacContributions.length;
    
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
      const superpacScore = Math.min(40, (totalSuperpacAmount / 50000) * 40); // $50k = 40 points
      
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
    
    // Apply the new scoring logic based on historical patterns
    if (historicalData.hasEverReceivedFunding) {
      // Rule 1: If candidate has ever received funding from Israel, score is at most 4
      humanityScore = Math.min(humanityScore, 4);
      
      // Check if candidate has won any election with funding
      const hasWonWithFunding = historicalData.hasWonElection;
      
      if (hasWonWithFunding && historicalData.electionYearsWithFunding.length === 1) {
        // Rule 2: If candidate has received funding in 1 election cycle and won, score is at most 3
        humanityScore = Math.min(humanityScore, 3);
      }
      
      if (historicalData.electionYearsWithFunding.length > 1) {
        // Rule 3: If candidate has received funding in multiple election cycles, one most being recent, score is at most 2
        humanityScore = Math.min(humanityScore, 2);
        
        if (hasWonWithFunding) {
          // Rule 4: If candidate has received funding in multiple election cycles and won, score is at most 1
          humanityScore = Math.min(humanityScore, 1);
        }
      }
      
      // Rule 5: If candidate has received funding in the most recent election cycle they are a 0
      if (historicalData.mostRecentElectionYear > 0) {
        humanityScore = 0;
      }
    }
    
    // Fallback to original scoring if no historical patterns apply
    if (humanityScore === 5 && totalProIsraelAmount > 0) {
      if (lobbyScore >= 80) {
        humanityScore = 0; // Grade A = 0 (worst humanity score)
      } else if (lobbyScore >= 60) {
        humanityScore = 1; // Grade B = 1
      } else if (lobbyScore >= 40) {
        humanityScore = 2; // Grade C = 2
      } else if (lobbyScore > 0) {
        humanityScore = 3; // Grade D = 3
      }
    }
    
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
      pro_israel_contribution_amount: totalPacAmount,
      pro_israel_superpac_amount: totalSuperpacAmount,
      
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
      }))
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