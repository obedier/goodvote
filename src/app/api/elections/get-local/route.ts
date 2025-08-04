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
    const state = searchParams.get('state');
    const zip = searchParams.get('zip');
    const electionYear = searchParams.get('election_year') ? parseInt(searchParams.get('election_year')!) : 2024;
    const includeOfficials = searchParams.get('include_officials') === 'true';
    
    if (!state && !zip) {
      return NextResponse.json({ 
        success: false, 
        error: 'State or ZIP code is required' 
      });
    }
    
    // Get state-level contribution data
    let query = `
      SELECT 
        ic.state,
        ic.city,
        ic.zip_code,
        COUNT(DISTINCT ic.name) as unique_contributors,
        COUNT(*) as total_contributions,
        SUM(ic.transaction_amt) as total_amount,
        AVG(ic.transaction_amt) as avg_amount
      FROM individual_contributions ic
      WHERE ic.file_year = $1
    `;
    
    const params = [electionYear];
    
    if (state) {
      query += ` AND ic.state = $2`;
      params.push(state);
    }
    
    if (zip) {
      query += ` AND ic.zip_code = $2`;
      params.push(zip);
    }
    
    query += ` GROUP BY ic.state, ic.city, ic.zip_code ORDER BY total_amount DESC`;
    
    const contributionsResult = await executeQuery(query, params);
    
    // Get top contributors in the area
    let topContributorsQuery = `
      SELECT 
        ic.name,
        ic.city,
        ic.state,
        ic.employer,
        ic.occupation,
        COUNT(*) as contribution_count,
        SUM(ic.transaction_amt) as total_amount
      FROM individual_contributions ic
      WHERE ic.file_year = $1
    `;
    
    const topParams = [electionYear];
    
    if (state) {
      topContributorsQuery += ` AND ic.state = $2`;
      topParams.push(state);
    }
    
    if (zip) {
      topContributorsQuery += ` AND ic.zip_code = $2`;
      topParams.push(zip);
    }
    
    topContributorsQuery += ` GROUP BY ic.name, ic.city, ic.state, ic.employer, ic.occupation ORDER BY total_amount DESC LIMIT 20`;
    
    const topContributorsResult = await executeQuery(topContributorsQuery, topParams);
    
    // Get candidates from the area
    let candidatesQuery = `
      SELECT 
        cm.cand_id,
        cm.cand_name,
        cm.cand_office,
        cm.cand_office_st,
        cm.cand_office_district,
        cm.cand_pty_affiliation,
        cs.ttl_receipts,
        cs.ttl_disb,
        cs.coh_cop
      FROM candidate_master cm
      LEFT JOIN candidate_summary cs ON cm.cand_id = cs.cand_id AND cm.file_year = cs.file_year
      WHERE cm.file_year = $1
    `;
    
    const candidatesParams = [electionYear];
    
    if (state) {
      candidatesQuery += ` AND cm.cand_office_st = $2`;
      candidatesParams.push(state);
    }
    
    candidatesQuery += ` ORDER BY cs.ttl_receipts DESC LIMIT 10`;
    
    const candidatesResult = await executeQuery(candidatesQuery, candidatesParams);
    
    // Get state officials if requested
    let officialsResult = { success: false, data: [] };
    if (includeOfficials && state) {
      const officialsQuery = `
        SELECT 
          cm.cand_id,
          cm.cand_name,
          cm.cand_office,
          cm.cand_office_st,
          cm.cand_pty_affiliation,
          cs.ttl_receipts
        FROM candidate_master cm
        LEFT JOIN candidate_summary cs ON cm.cand_id = cs.cand_id AND cm.file_year = cs.file_year
        WHERE cm.file_year = $1 AND cm.cand_office_st = $2
        ORDER BY cs.ttl_receipts DESC
      `;
      
      officialsResult = await executeQuery(officialsQuery, [electionYear, state]);
    }
    
    return NextResponse.json({
      success: true,
      data: {
        location: {
          state: state || null,
          zip: zip || null
        },
        contributions: contributionsResult.success ? contributionsResult.data : [],
        top_contributors: topContributorsResult.success ? topContributorsResult.data : [],
        candidates: candidatesResult.success ? candidatesResult.data : [],
        officials: officialsResult.success ? officialsResult.data : [],
        filters: {
          election_year: electionYear,
          include_officials: includeOfficials
        }
      }
    });

  } catch (error) {
    console.error('Error in Get Local! API:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to fetch local data' 
    });
  }
} 