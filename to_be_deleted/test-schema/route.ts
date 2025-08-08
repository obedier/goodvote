import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const table = searchParams.get('table');
    const db = searchParams.get('db');
    const checkColumns = searchParams.get('check_columns');
    
    if (checkColumns) {
      // Check columns in a specific table
      const useFECDatabase = db === 'fec';
      const query = `
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = $1
        ORDER BY ordinal_position
      `;
      
      const result = await executeQuery(query, [checkColumns], useFECDatabase);
      
      return NextResponse.json({
        success: true,
        data: result.success ? result.data : [],
        error: result.success ? null : result.error
      });
    }
    
    if (table) {
      // Get sample data from a specific table
      const useFECDatabase = db === 'fec';
      const query = `SELECT * FROM ${table} LIMIT 5`;
      
      const result = await executeQuery(query, [], useFECDatabase);
      
      return NextResponse.json({
        success: true,
        data: result.success ? result.data : [],
        error: result.success ? null : result.error
      });
    }
    
    // Default test query
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