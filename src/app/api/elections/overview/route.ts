import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const year = searchParams.get('year') ? parseInt(searchParams.get('year')!) : 2024;
    const type = searchParams.get('type') || 'all';
    const state = searchParams.get('state');
    
    // Get basic candidate statistics instead of individual contributions
    let candidateQuery = `
      SELECT 
        cm.cand_office,
        COUNT(DISTINCT cm.cand_id) as candidate_count,
        SUM(CAST(cs.ttl_receipts AS NUMERIC)) as total_receipts,
        SUM(CAST(cs.ttl_disb AS NUMERIC)) as total_disbursements
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
    
    candidateQuery += ` GROUP BY cm.cand_office`;
    
    const candidateResult = await executeQuery(candidateQuery, [year], true);
    
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
      ORDER BY CAST(cs.ttl_receipts AS NUMERIC) DESC NULLS LAST
      LIMIT 10
    `;
    
    const topRacesResult = await executeQuery(topRacesQuery, [year], true);
    
    // Create overview from candidate data
    const overview = {
      total_candidates: 0,
      total_receipts: 0,
      total_disbursements: 0,
      candidates_by_office: candidateResult.success ? candidateResult.data : []
    };
    
    if (candidateResult.success && candidateResult.data) {
      overview.total_candidates = candidateResult.data.reduce((sum: number, row: any) => sum + parseInt(row.candidate_count || 0), 0);
      overview.total_receipts = candidateResult.data.reduce((sum: number, row: any) => sum + parseFloat(row.total_receipts || 0), 0);
      overview.total_disbursements = candidateResult.data.reduce((sum: number, row: any) => sum + parseFloat(row.total_disbursements || 0), 0);
    }
    

    
    return NextResponse.json({
      success: true,
      data: {
        overview,
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