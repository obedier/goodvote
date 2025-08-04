import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const candidateId = searchParams.get('candidate');
    const electionYear = searchParams.get('election_year') ? parseInt(searchParams.get('election_year')!) : 2024;
    
    if (!candidateId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Candidate ID is required' 
      });
    }

    // Get candidate's FEC ID for the specified election year
    const candidateQuery = `
      SELECT cand_id 
      FROM person_candidates 
      WHERE person_id = $1 AND election_year = $2
    `;
    
    const candidateResult = await executeQuery(candidateQuery, [candidateId, electionYear]);
    
    if (!candidateResult.success || !candidateResult.data || candidateResult.data.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'Candidate not found for this election year' 
      });
    }
    
    const candId = candidateResult.data[0].cand_id;
    
    // Get individual contributors
    const individualQuery = `
      SELECT 
        ic.name,
        CONCAT(ic.city, ', ', ic.state) as location,
        ic.employer,
        ic.occupation,
        SUM(CAST(ic.transaction_amt AS NUMERIC)) as total_amount,
        COUNT(*) as contribution_count,
        'Individual' as type
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
      LIMIT 50
    `;
    
    const individualResult = await executeQuery(individualQuery, [candId, electionYear]);
    
    // Get committee contributors (including PACs, parties, and other committees)
    const committeeQuery = `
      SELECT 
        COALESCE(cm.cmte_nm, cc.name) as name,
        CONCAT(cc.city, ', ', cc.state) as location,
        '' as employer,
        '' as occupation,
        SUM(CAST(cc.transaction_amt AS NUMERIC)) as total_amount,
        COUNT(*) as contribution_count,
        'Committee' as type,
        cm.cmte_nm as committee_name,
        cm.cmte_tp as committee_type,
        cm.cmte_id as committee_id
      FROM committee_candidate_contributions cc
      LEFT JOIN committee_master cm ON cc.cmte_id = cm.cmte_id AND cm.file_year = cc.file_year
      WHERE cc.cand_id = $1 
      AND cc.file_year = $2
      AND cc.transaction_amt > 0
      AND cc.transaction_tp IN ('24A', '24E', '24C', '24N', '24K', '24Z', '24F')
      GROUP BY cm.cmte_nm, cc.name, cc.city, cc.state, cm.cmte_tp, cm.cmte_id
      ORDER BY total_amount DESC
      LIMIT 50
    `;
    
    const committeeResult = await executeQuery(committeeQuery, [candId, electionYear]);
    
    // Combine and format results
    const individualContributors = individualResult.success ? individualResult.data.map((contributor: any) => ({
      name: contributor.name,
      location: contributor.location,
      employer: contributor.employer || '',
      occupation: contributor.occupation || '',
      amount: parseFloat(contributor.total_amount),
      count: parseInt(contributor.contribution_count),
      type: contributor.type
    })) : [];
    
    const committeeContributors = committeeResult.success ? committeeResult.data.map((contributor: any) => ({
      name: contributor.name,
      location: contributor.location,
      employer: contributor.employer || '',
      occupation: contributor.occupation || '',
      amount: parseFloat(contributor.total_amount),
      count: parseInt(contributor.contribution_count),
      type: contributor.type,
      committee_name: contributor.committee_name,
      committee_type: contributor.committee_type,
      committee_id: contributor.committee_id
    })) : [];
    
    // Combine all contributors and sort by amount
    const allContributors = [...individualContributors, ...committeeContributors]
      .sort((a, b) => b.amount - a.amount);
    
    return NextResponse.json({
      success: true,
      data: allContributors,
    });

  } catch (error) {
    console.error('Error in contributors API:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to fetch contributors' 
    });
  }
} 