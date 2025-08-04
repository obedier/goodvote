import { NextRequest, NextResponse } from 'next/server';
import { getAllCandidates, searchCandidates } from '@/lib/candidates';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    
    let result;
    
    if (query) {
      // Search candidates
      result = await searchCandidates(query);
    } else {
      // Get all candidates
      result = await getAllCandidates();
    }
    
    if (!result.success) {
      return NextResponse.json({ 
        success: false, 
        error: result.error || 'Failed to fetch candidates' 
      });
    }
    
    return NextResponse.json({
      success: true,
      data: result.data,
    });

  } catch (error) {
    console.error('Error in candidates API:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to fetch candidates' 
    });
  }
} 