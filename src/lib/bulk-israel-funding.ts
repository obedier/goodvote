import { executeQuery } from './database';
import { SQL_QUERIES, addCycleFilter, substituteParams } from '@/config/sql-queries';

/**
 * Bulk fetch Israel lobby funding for multiple person IDs in a single query
 * This replaces hundreds of individual getSharedIsraelFunding calls for performance
 */
export async function getBulkIsraelFunding(
  personIds: string[],
  cycleParam: string = '2024'
): Promise<{ success: boolean; data?: Map<string, number>; error?: string }> {
  try {
    if (personIds.length === 0) {
      return { success: true, data: new Map() };
    }

    // Use centralized SQL query with proper cycle filtering
    let bulkQuery = SQL_QUERIES.ISRAEL_LOBBY_BULK_FUNDING;
    
    // Add cycle filtering
    if (cycleParam === 'last3') {
      bulkQuery = bulkQuery.replace(
        'WHERE pc.person_id = ANY($1::text[])',
        'WHERE pc.person_id = ANY($1::text[]) AND cc.file_year IN (2020, 2022, 2024)'
      );
    } else if (cycleParam === 'all') {
      // No additional filter needed
    } else {
      const year = parseInt(cycleParam);
      bulkQuery = bulkQuery.replace(
        'WHERE pc.person_id = ANY($1::text[])',
        `WHERE pc.person_id = ANY($1::text[]) AND cc.file_year = ${year}`
      );
    }
    
    // Generate debug SQL for logging
    const debugSql = substituteParams(bulkQuery, [personIds]);

    const result = await executeQuery(bulkQuery, [personIds], true);
    
    if (!result.success) {
      console.error('🚨 Bulk Israel funding query failed:', result.error);
      console.error('📝 Debug SQL:', debugSql);
      return { success: false, error: result.error };
    }

    // Log query info for debugging
    console.log(`✅ Bulk Israel funding query completed for ${personIds.length} people (cycle: ${cycleParam})`);
    console.log(`📊 Found funding data for ${result.data?.length || 0} candidates`);

    // Convert to Map for fast lookups
    const fundingMap = new Map<string, number>();
    
    // Initialize all person IDs with 0
    personIds.forEach(personId => {
      fundingMap.set(personId, 0);
    });
    
    // Update with actual values
    result.data.forEach((row: any) => {
      const amount = parseFloat(row.total_amount) || 0;
      fundingMap.set(row.person_id, amount);
      if (amount > 0) {
        console.log(`💰 ${row.person_id}: $${amount.toLocaleString()}`);
      }
    });

    return { success: true, data: fundingMap };
    
  } catch (error) {
    console.error('Error in bulk Israel funding query:', error);
    return { success: false, error: 'Failed to fetch bulk Israel funding data' };
  }
}

/**
 * Bulk fetch basic candidate information for multiple person IDs
 */
export async function getBulkCandidateInfo(
  personIds: string[],
  cycle: string = '2024'
): Promise<{ success: boolean; data?: Map<string, any>; error?: string }> {
  try {
    if (personIds.length === 0) {
      return { success: true, data: new Map() };
    }

    const query = `
      SELECT 
        pc.person_id,
        pc.display_name,
        pc.current_party,
        pc.election_year,
        pc.state,
        pc.current_district,
        MIN(first_pc.election_year) as first_elected_year,
        COALESCE(cs.coh_cop, 0) as cash_on_hand,
        COALESCE(cmr.humanity_score, 0) as israel_score
      FROM person_candidates pc
      LEFT JOIN person_candidates first_pc ON first_pc.person_id = pc.person_id 
        AND first_pc.current_office = 'H'
      LEFT JOIN candidate_summary cs ON cs.cand_id = pc.cand_id 
        AND cs.file_year = pc.election_year
      LEFT JOIN congress_member_pro_israel_report cmr ON cmr.person_id = pc.person_id
      WHERE pc.person_id = ANY($1)
        AND pc.current_office = 'H'
        AND pc.election_year = $2
      GROUP BY pc.person_id, pc.display_name, pc.current_party, pc.election_year, 
               pc.state, pc.current_district, cs.coh_cop, cmr.humanity_score
    `;

    const result = await executeQuery(query, [personIds, parseInt(cycle)], true);
    
    if (!result.success) {
      return { success: false, error: result.error };
    }

    const infoMap = new Map();
    result.data.forEach((row: any) => {
      infoMap.set(row.person_id, {
        display_name: row.display_name,
        current_party: row.current_party,
        election_year: row.election_year,
        state: row.state,
        current_district: row.current_district,
        first_elected_year: row.first_elected_year,
        cash_on_hand: parseFloat(row.cash_on_hand) || 0,
        israel_score: row.israel_score
      });
    });

    return { success: true, data: infoMap };

  } catch (error) {
    console.error('Error in bulk candidate info query:', error);
    return { success: false, error: 'Failed to fetch bulk candidate info' };
  }
}
