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
    const year = searchParams.get('year') ? parseInt(searchParams.get('year')!) : 2024;
    const type = searchParams.get('type') || 'all';
    const state = searchParams.get('state');
    
    // Get election overview data
    let query = `
      SELECT 
        COUNT(DISTINCT ic.name) as total_contributors,
        COUNT(DISTINCT ic.cmte_id) as total_committees,
        SUM(ic.transaction_amt) as total_contributions,
        COUNT(*) as total_transactions
      FROM individual_contributions ic
      WHERE ic.file_year = $1
    `;
    
    const params = [year];
    
    if (state) {
      query += ` AND ic.state = $2`;
      params.push(state);
    }
    
    const overviewResult = await executeQuery(query, params);
    
    if (!overviewResult.success) {
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to fetch election overview data' 
      });
    }
    
    // Get candidate summary by office type
    let candidateQuery = `
      SELECT 
        cand_office,
        COUNT(DISTINCT cand_id) as candidate_count,
        SUM(ttl_receipts) as total_receipts,
        SUM(ttl_disb) as total_disbursements
      FROM candidate_master cm
      LEFT JOIN candidate_summary cs ON cm.cand_id = cs.cand_id AND cm.file_year = cs.file_year
      WHERE cm.file_year = $1
    `;
    
    if (type !== 'all') {
      if (type === 'presidential') {
        candidateQuery += ` AND cm.cand_office = 'P'`;
      } else if (type === 'congressional') {
        candidateQuery += ` AND cm.cand_office IN ('H', 'S')`;
      }
    }
    
    candidateQuery += ` GROUP BY cand_office`;
    
    const candidateResult = await executeQuery(candidateQuery, [year]);
    
    // Get top races
    const topRacesQuery = `
      SELECT 
        cm.cand_name,
        cm.cand_office,
        cm.cand_office_st,
        cm.cand_pty_affiliation,
        cs.ttl_receipts,
        cs.ttl_disb,
        cs.coh_cop
      FROM candidate_master cm
      LEFT JOIN candidate_summary cs ON cm.cand_id = cs.cand_id AND cm.file_year = cs.file_year
      WHERE cm.file_year = $1
      ORDER BY cs.ttl_receipts DESC
      LIMIT 10
    `;
    
    const topRacesResult = await executeQuery(topRacesQuery, [year]);
    
    return NextResponse.json({
      success: true,
      data: {
        overview: overviewResult.data[0] || {},
        candidates_by_office: candidateResult.success ? candidateResult.data : [],
        top_races: topRacesResult.success ? topRacesResult.data : [],
        filters: {
          year,
          type,
          state: state || null
        }
      }
    });

  } catch (error) {
    console.error('Error in elections overview API:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to fetch elections overview' 
    });
  }
} 