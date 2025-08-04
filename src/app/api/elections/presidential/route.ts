import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const year = searchParams.get('year') ? parseInt(searchParams.get('year')!) : 2024;
    const candidate = searchParams.get('candidate');
    const party = searchParams.get('party');
    
    // Get presidential candidates
    let query = `
      SELECT 
        cand_id,
        cand_name,
        cand_pty_affiliation
      FROM candidate_master 
      WHERE file_year = $1 AND cand_office = 'P'
      AND cand_name IS NOT NULL
    `;
    
    const params = [year];
    
    if (candidate) {
      query += ` AND LOWER(cand_name) LIKE LOWER($2)`;
      params.push(`%${candidate}%`);
    }
    
    if (party) {
      query += ` AND cand_pty_affiliation = $${params.length + 1}`;
      params.push(party);
    }
    
    query += ` ORDER BY cand_name ASC`;
    
    const candidatesResult = await executeQuery(query, params, true);
    
    if (!candidatesResult.success) {
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to fetch presidential candidates' 
      });
    }
    
    // If no candidates found, return empty result
    if (!candidatesResult.data || candidatesResult.data.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          candidates: [],
          summary: {
            total_candidates: 0,
            total_receipts: 0,
            total_disbursements: 0,
            avg_receipts: 0,
            max_receipts: 0
          },
          filters: {
            year,
            candidate: candidate || null,
            party: party || null
          }
        }
      });
    }
    
    // Get presidential race summary
    const summaryQuery = `
      SELECT 
        COUNT(DISTINCT cand_id) as total_candidates,
        0 as total_receipts,
        0 as total_disbursements,
        0 as avg_receipts,
        0 as max_receipts
      FROM candidate_master 
      WHERE file_year = $1 AND cand_office = 'P'
    `;
    
    const summaryResult = await executeQuery(summaryQuery, [year], true);
    
    return NextResponse.json({
      success: true,
      data: {
        candidates: candidatesResult.data,
        summary: summaryResult.success ? summaryResult.data[0] : {},
        filters: {
          year,
          candidate: candidate || null,
          party: party || null
        }
      }
    });

  } catch (error) {
    console.error('Error in presidential elections API:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to fetch presidential elections data' 
    });
  }
} 