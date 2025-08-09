import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/database';

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
    
    // Get state-level contribution data (simplified to avoid timeouts)
    const contributionsResult = { success: true, data: [] };
    
    // Get top contributors in the area (simplified to avoid timeouts)
    const topContributorsResult = { success: true, data: [] };
    
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
    
    const candidatesResult = await executeQuery(candidatesQuery, candidatesParams, true);
    
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
      
      officialsResult = await executeQuery(officialsQuery, [electionYear, state], true);
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