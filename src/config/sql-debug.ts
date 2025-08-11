/**
 * SQL Query Debugging Utilities
 * 
 * Tools for comparing different SQL queries to identify discrepancies
 * in funding calculations between different views.
 */

import { SQL_QUERIES, substituteParams } from './sql-queries';

export interface QueryComparison {
  queryName: string;
  sql: string;
  keyDifferences: string[];
  potentialIssues: string[];
}

/**
 * Compare the detail view query vs bulk funding query
 * to identify why numbers differ
 */
export function compareDetailVsBulkQueries(): QueryComparison[] {
  const detailQuery = SQL_QUERIES.ISRAEL_LOBBY_CONTRIBUTIONS_BY_PERSON;
  const bulkQuery = SQL_QUERIES.ISRAEL_LOBBY_BULK_FUNDING;
  
  const comparisons: QueryComparison[] = [
    {
      queryName: "Detail View Query (israel-lobby/[personId])",
      sql: detailQuery,
      keyDifferences: [
        "✅ Uses ROW_NUMBER() OVER (PARTITION BY cc.sub_id) for deduplication",
        "✅ Filters WHERE rn = 1 to ensure unique sub_id records",
        "✅ Includes all transaction details (image_num, transaction_dt, etc.)",
        "✅ Returns individual contribution records"
      ],
      potentialIssues: [
        "⚠️  Returns ALL transaction details - might be slower",
        "⚠️  Complex ROW_NUMBER() logic for deduplication"
      ]
    },
    {
      queryName: "Bulk Query (house-districts, map views)",
      sql: bulkQuery,
      keyDifferences: [
        "❌ Uses SUM(DISTINCT cc.transaction_amt) - This is WRONG!",
        "❌ No sub_id deduplication - allows duplicate amounts",
        "❌ Groups by person_id only - missing transaction-level uniqueness",
        "❌ May double-count transactions with same amount"
      ],
      potentialIssues: [
        "🚨 MAJOR: SUM(DISTINCT amount) can miss duplicate transactions with different sub_id but same amount",
        "🚨 MAJOR: No ROW_NUMBER() deduplication like detail view",
        "🚨 MAJOR: This likely explains the lower totals and missing candidates"
      ]
    }
  ];
  
  return comparisons;
}

/**
 * Generate corrected bulk query that matches detail view logic
 */
export function getCorrectedBulkQuery(): string {
  return `
WITH config_committees AS (
  SELECT fec_committee_id 
  FROM cfg_israel_committee_ids 
  WHERE is_active = true
),
config_keywords AS (
  SELECT keyword 
  FROM cfg_israel_keywords 
  WHERE is_active = true
),
name_patterns AS (
  SELECT DISTINCT cm.cmte_id
  FROM committee_master cm
  CROSS JOIN config_keywords ck
  WHERE cm.cmte_nm ILIKE '%' || ck.keyword || '%'
),
filtered AS (
  SELECT
    cc.sub_id,
    pc.person_id,
    cc.transaction_amt,
    ROW_NUMBER() OVER (
      PARTITION BY cc.sub_id
      ORDER BY cc.transaction_dt DESC, cc.transaction_amt DESC
    ) AS rn
  FROM committee_candidate_contributions cc
  JOIN person_candidates pc ON cc.cand_id = pc.cand_id
  JOIN committee_master cm ON cc.cmte_id = cm.cmte_id
  WHERE pc.person_id = ANY($1::text[])
    AND cc.transaction_amt > 0
    AND cc.transaction_tp IN ('24A','24K','24N','24F','24E','24C')
    AND (
      cc.cmte_id IN (SELECT fec_committee_id FROM config_committees)
      OR
      cc.cmte_id IN (SELECT cmte_id FROM name_patterns)
    )
)
SELECT
  person_id,
  SUM(transaction_amt) AS total_amount
FROM filtered
WHERE rn = 1
GROUP BY person_id`;
}

/**
 * Log detailed comparison for debugging
 */
export function logQueryComparison(personId: string = 'EXAMPLE') {
  console.log('\n' + '='.repeat(80));
  console.log('🔍 SQL QUERY COMPARISON - ISRAEL LOBBY FUNDING');
  console.log('='.repeat(80));
  
  const comparisons = compareDetailVsBulkQueries();
  
  comparisons.forEach((comp, index) => {
    console.log(`\n${index + 1}. ${comp.queryName}`);
    console.log('-'.repeat(50));
    
    console.log('\n📋 Key Characteristics:');
    comp.keyDifferences.forEach(diff => console.log(`   ${diff}`));
    
    console.log('\n⚠️  Potential Issues:');
    comp.potentialIssues.forEach(issue => console.log(`   ${issue}`));
  });
  
  console.log('\n' + '='.repeat(80));
  console.log('🔧 RECOMMENDED FIX:');
  console.log('='.repeat(80));
  console.log('Replace the bulk query SUM(DISTINCT) logic with:');
  console.log('1. ✅ ROW_NUMBER() OVER (PARTITION BY cc.sub_id) for deduplication');
  console.log('2. ✅ WHERE rn = 1 to ensure unique records');
  console.log('3. ✅ SUM(transaction_amt) instead of SUM(DISTINCT transaction_amt)');
  console.log('\n📝 Corrected Query Available: getCorrectedBulkQuery()');
  console.log('='.repeat(80) + '\n');
}

/**
 * Generate debug query for testing a specific person
 */
export function generateDebugQuery(personId: string, cycle: string = '2024'): string {
  const baseQuery = getCorrectedBulkQuery();
  
  let yearCondition = '';
  if (cycle === 'last3') {
    yearCondition = 'AND cc.file_year IN (2020, 2022, 2024)';
  } else if (cycle === 'all') {
    yearCondition = '';
  } else {
    const year = parseInt(cycle);
    yearCondition = `AND cc.file_year = ${year}`;
  }
  
  return baseQuery.replace(
    'WHERE pc.person_id = ANY($1::text[])',
    `WHERE pc.person_id = '${personId}' ${yearCondition}`
  );
}
