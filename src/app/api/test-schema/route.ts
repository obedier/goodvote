import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    // Test query to see presidential candidates
    const query = `
      SELECT cand_id, cand_name, cand_pty_affiliation
      FROM candidate_master 
      WHERE file_year = 2024 AND cand_office = 'P'
      LIMIT 5
    `;
    
    const result = await executeQuery(query, [], true);
    
    return NextResponse.json({
      success: true,
      data: result.success ? result.data : [],
      error: result.success ? null : result.error
    });

  } catch (error) {
    console.error('Error in test schema API:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to test schema' 
    });
  }
} 