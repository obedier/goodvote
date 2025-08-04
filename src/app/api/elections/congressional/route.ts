import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const year = searchParams.get('year') ? parseInt(searchParams.get('year')!) : 2024;
    const chamber = searchParams.get('chamber');
    const state = searchParams.get('state');
    const district = searchParams.get('district');
    
    // Get congressional candidates
    let query = `
      SELECT 
        cand_id,
        cand_name,
        cand_office,
        cand_office_st,
        cand_office_district,
        cand_pty_affiliation
      FROM candidate_master 
      WHERE file_year = $1 AND cand_office IN ('H', 'S')
    `;
    
    const params = [year];
    
    if (chamber) {
      if (chamber === 'house') {
        query += ` AND cand_office = 'H'`;
      } else if (chamber === 'senate') {
        query += ` AND cand_office = 'S'`;
      }
    }
    
    if (state) {
      query += ` AND cand_office_st = $${params.length + 1}`;
      params.push(state);
    }
    
    if (district) {
      query += ` AND cand_office_district = $${params.length + 1}`;
      params.push(district);
    }
    
    query += ` ORDER BY cand_name ASC`;
    
    const candidatesResult = await executeQuery(query, params, true);
    
    if (!candidatesResult.success) {
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to fetch congressional candidates' 
      });
    }
    
    // Get congressional race summary
    const summaryQuery = `
      SELECT 
        cand_office,
        COUNT(DISTINCT cand_id) as total_candidates,
        0 as total_receipts,
        0 as total_disbursements,
        0 as avg_receipts,
        0 as max_receipts
      FROM candidate_master 
      WHERE file_year = $1 AND cand_office IN ('H', 'S')
      GROUP BY cand_office
    `;
    
    const summaryResult = await executeQuery(summaryQuery, [year], true);
    
    // Get races by state
    const stateRacesQuery = `
      SELECT 
        cand_office_st,
        cand_office,
        COUNT(DISTINCT cand_id) as candidate_count,
        0 as total_receipts
      FROM candidate_master 
      WHERE file_year = $1 AND cand_office IN ('H', 'S')
      GROUP BY cand_office_st, cand_office
      ORDER BY candidate_count DESC
    `;
    
    const stateRacesResult = await executeQuery(stateRacesQuery, [year], true);
    
    return NextResponse.json({
      success: true,
      data: {
        candidates: candidatesResult.data,
        summary: summaryResult.success ? summaryResult.data : [],
        state_races: stateRacesResult.success ? stateRacesResult.data : [],
        filters: {
          year,
          chamber: chamber || null,
          state: state || null,
          district: district || null
        }
      }
    });

  } catch (error) {
    console.error('Error in congressional elections API:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to fetch congressional elections data' 
    });
  }
} 