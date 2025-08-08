import { NextRequest, NextResponse } from 'next/server';
import { getCurrentCongressMembers } from '@/lib/database';
import { getIsraelLobbySummary } from '@/lib/israel-lobby';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const party = searchParams.get('party');
    const chamber = searchParams.get('chamber');
    const state = searchParams.get('state');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '100');

    const filters = {
      party: party || undefined,
      chamber: chamber || undefined,
      state: state || undefined,
      search: search || undefined,
    };

    const result = await getCurrentCongressMembers(filters);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Failed to fetch Congress members' },
        { status: 500 }
      );
    }

    // Calculate pagination
    const offset = (page - 1) * limit;
    const paginatedData = result.data?.slice(offset, offset + limit) || [];
    const total = result.data?.length || 0;

    // Fetch Israel scores for each member
    const membersWithIsraelScores = await Promise.all(
      paginatedData.map(async (member: any) => {
        try {
          const personId = member.person_id;
          if (personId) {
            const israelResult = await getIsraelLobbySummary(personId);
            if (israelResult.success && israelResult.data) {
              return {
                ...member,
                israel_score: israelResult.data.humanity_score,
                israel_grade: israelResult.data.lobby_grade,
                israel_total: israelResult.data.total_pro_israel_contributions
              };
            }
          }
          return {
            ...member,
            israel_score: null,
            israel_grade: null,
            israel_total: null
          };
        } catch (error) {
          console.error('Error fetching Israel score for', personId, ':', error);
          return {
            ...member,
            israel_score: null,
            israel_grade: null,
            israel_total: null
          };
        }
      })
    );

    return NextResponse.json({
      success: true,
      data: membersWithIsraelScores,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 