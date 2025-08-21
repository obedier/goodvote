import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;
    const sortBy = searchParams.get('sortBy') || 'last_name';
    const sortOrder = searchParams.get('sortOrder') || 'ASC';

    let countWhereClause = '';
    let dataWhereClause = '';
    const params: any[] = [];
    let paramCount = 0;

    // Add category filter
    if (category) {
      const base = `pro_israel_category`;
      if (category === 'pro-israel') {
        countWhereClause += ` WHERE ${base} IN ('Strong Pro-Israel', 'Moderate Pro-Israel')`;
        dataWhereClause += ` WHERE c.${base} IN ('Strong Pro-Israel', 'Moderate Pro-Israel')`;
      } else if (category === 'neutral') {
        countWhereClause += ` WHERE ${base} = 'Neutral'`;
        dataWhereClause += ` WHERE c.${base} = 'Neutral'`;
      } else if (category === 'opposition') {
        countWhereClause += ` WHERE ${base} IN ('Limited Pro-Israel', 'Anti-Israel')`;
        dataWhereClause += ` WHERE c.${base} IN ('Limited Pro-Israel', 'Anti-Israel')`;
      }
    }

    // Add search filter
    if (search) {
      const countSearch = ` ${countWhereClause ? 'AND' : 'WHERE'} (
        representative_name ILIKE $${paramCount + 1} OR 
        first_name ILIKE $${paramCount + 1} OR 
        last_name ILIKE $${paramCount + 1} OR
        state ILIKE $${paramCount + 1}
      )`;
      const dataSearch = ` ${dataWhereClause ? 'AND' : 'WHERE'} (
        c.representative_name ILIKE $${paramCount + 1} OR 
        c.first_name ILIKE $${paramCount + 1} OR 
        c.last_name ILIKE $${paramCount + 1} OR
        c.state ILIKE $${paramCount + 1}
      )`;
      countWhereClause += countSearch;
      dataWhereClause += dataSearch;
      params.push(`%${search}%`);
      paramCount++;
    }

    // Get total count
    const countResult = await executeQuery(
      `SELECT COUNT(*) as count FROM congress_member_pro_israel_report${countWhereClause}`,
      params,
      true
    );

    const totalCount = countResult.success ? parseInt(countResult.data?.[0]?.count || '0') : 0;

    // Get congress members with pagination - using curved_pro_israel_score as final score for now
    // Whitelist sort columns and prefix with alias to avoid ambiguity
    const allowedSortColumns = new Set([
      'last_name',
      'first_name',
      'representative_name',
      'state',
      'party',
      'pro_israel_contributions',
      'pro_israel_opposition_amount',
      'curved_pro_israel_score',
      'pro_israel_category',
    ]);
    const safeSortBy = allowedSortColumns.has(sortBy) ? sortBy : 'last_name';

    const result = await executeQuery(
      `SELECT 
        c.representative_name,
        c.first_name,
        c.last_name,
        c.state,
        c.district,
        c.chamber,
        c.party,
        c.fec_id,
        c.pro_israel_contributions,
        c.pro_israel_opposition_amount,
        c.raw_pro_israel_score,
        c.curved_pro_israel_score,
        c.pro_israel_category,
        c.position,
        c.party_full,
        c.district_formatted,
        c.curved_pro_israel_score as final_score,
        pc.person_id
      FROM congress_member_pro_israel_report c
      LEFT JOIN person_candidates pc ON c.fec_id = pc.cand_id AND pc.election_year = 2024
      ${dataWhereClause}
      ORDER BY c.${safeSortBy} ${sortOrder}, c.last_name ASC
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`,
      [...params, limit, offset],
      true
    );

    if (!result.success) {
      return NextResponse.json(
        { error: 'Failed to fetch congress members', details: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      congressMembers: result.data || [],
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit)
      }
    });

  } catch (error) {
    console.error('Error fetching congress members:', error);
    return NextResponse.json(
      { error: 'Failed to fetch congress members' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { fec_id, override_score } = body;

    if (!fec_id) {
      return NextResponse.json(
        { error: 'FEC ID is required' },
        { status: 400 }
      );
    }

    // For now, just return success since we can't modify the table
    // In a real implementation, you would need to create a separate override table
    // or have write permissions to the congress_member_pro_israel_report table
    return NextResponse.json({ 
      success: true,
      message: 'Override functionality requires database write permissions. Using curved score for now.'
    });

  } catch (error) {
    console.error('Error updating override score:', error);
    return NextResponse.json(
      { error: 'Failed to update override score' },
      { status: 500 }
    );
  }
}
