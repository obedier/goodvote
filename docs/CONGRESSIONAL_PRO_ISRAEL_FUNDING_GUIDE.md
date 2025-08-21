# 🏛️ Congressional Pro-Israel Funding Analysis Guide

## Overview
This guide focuses on using the `v_congress_proisrael_funding` view as the **primary method** for getting congressional pro-Israel funding summaries, along with SQL queries to drill down to record-level details.

## 🎯 Primary Method: Use the View

### The `v_congress_proisrael_funding` View
This view provides **aggregated funding totals** by congressional candidate, making it the fastest way to get summary-level data.

```sql
-- Get all congressional pro-Israel funding summaries
SELECT * FROM v_congress_proisrael_funding;

-- Get top recipients
SELECT * FROM v_congress_proisrael_funding 
ORDER BY total_pro_israel_support DESC;

-- Filter by election cycle
SELECT * FROM v_congress_proisrael_funding 
WHERE two_year_transaction_period = '2024';
```

**What This View Provides:**
- Candidate ID and name
- Total pro-Israel committee support
- Breakdown by funding type (contributions, independent expenditures, etc.)
- Election cycle information
- Committee count and transaction count

## 🔍 Getting Record-Level Details

When you need to see the **actual transactions** that make up the summary totals, use these focused queries from `get_support_totals_backing_records.sql`:

### 1. Committee Contributions (Direct Support)
```sql
-- Get all committee contributions to a specific candidate
SELECT 
    ccc.cand_id,
    ccc.transaction_amt,
    ccc.transaction_dt,
    cm.cmte_nm as committee_name,
    cic.category as committee_category,
    ccc.transaction_tp_desc,
    ccc.memo_text
FROM committee_candidate_contributions ccc
JOIN committee_master cm ON ccc.cmte_id = cm.cmte_id
JOIN cfg_israel_committee_ids cic ON ccc.cmte_id = cic.fec_committee_id
WHERE ccc.cand_id = 'YOUR_CANDIDATE_ID_HERE'
  AND cic.is_active = TRUE
ORDER BY ccc.transaction_dt DESC;
```

### 2. Independent Expenditures in Support
```sql
-- Get outside spending in favor of a candidate
SELECT 
    ie.candidate_id as cand_id,
    ie.expenditure_amount,
    ie.expenditure_date,
    cm.cmte_nm as committee_name,
    cic.category as committee_category,
    ie.expenditure_purpose,
    ie.payee_name,
    ie.payee_city,
    ie.payee_state
FROM independent_expenditures ie
JOIN committee_master cm ON ie.committee_id = cm.cmte_id
JOIN cfg_israel_committee_ids cic ON ie.committee_id = cic.fec_committee_id
WHERE ie.candidate_id = 'YOUR_CANDIDATE_ID_HERE'
  AND cic.is_active = TRUE
  AND ie.support_oppose_indicator = 'S'
ORDER BY ie.expenditure_date DESC;
```

### 3. Complete Support Breakdown for a Candidate
```sql
-- Get comprehensive support details for a specific candidate
WITH candidate_support AS (
    -- Committee contributions
    SELECT 
        ccc.cand_id,
        'Committee Contributions' as support_type,
        ccc.transaction_amt,
        ccc.transaction_dt,
        cm.cmte_nm as committee_name,
        cic.category as committee_category
    FROM committee_candidate_contributions ccc
    JOIN committee_master cm ON ccc.cmte_id = cm.cmte_id
    JOIN cfg_israel_committee_ids cic ON ccc.cmte_id = cic.fec_committee_id
    WHERE ccc.cand_id = 'YOUR_CANDIDATE_ID_HERE'
      AND cic.is_active = TRUE
    
    UNION ALL
    
    -- Independent expenditures in support
    SELECT 
        ie.candidate_id as cand_id,
        'Independent Expenditures' as support_type,
        ie.expenditure_amount as transaction_amt,
        ie.expenditure_date as transaction_dt,
        cm.cmte_nm as committee_name,
        cic.category as committee_category
    FROM independent_expenditures ie
    JOIN committee_master cm ON ie.committee_id = cm.cmte_id
    JOIN cfg_israel_committee_ids cic ON ie.committee_id = cic.fec_committee_id
    WHERE ie.candidate_id = 'YOUR_CANDIDATE_ID_HERE'
      AND cic.is_active = TRUE
      AND ie.support_oppose_indicator = 'S'
)

SELECT 
    support_type,
    committee_name,
    committee_category,
    transaction_amt,
    transaction_dt
FROM candidate_support
ORDER BY transaction_dt DESC;
```

## 📊 Workflow: Summary → Details

### Step 1: Get Summary from View
```sql
-- Find candidates with significant pro-Israel support
SELECT 
    cand_id,
    candidate_name,
    total_pro_israel_support,
    contribution_amount,
    independent_expenditure_amount
FROM v_congress_proisrael_funding 
WHERE total_pro_israel_support > 100000  -- Filter for significant amounts
ORDER BY total_pro_israel_support DESC;
```

### Step 2: Drill Down to Records
```sql
-- Use the candidate_id from Step 1 to get detailed records
-- Replace 'CANDIDATE_ID_FROM_STEP_1' with actual ID

-- Get all committee contributions
SELECT 
    ccc.transaction_amt,
    ccc.transaction_dt,
    cm.cmte_nm as committee_name,
    cic.category
FROM committee_candidate_contributions ccc
JOIN committee_master cm ON ccc.cmte_id = cm.cmte_id
JOIN cfg_israel_committee_ids cic ON ccc.cmte_id = cic.fec_committee_id
WHERE ccc.cand_id = 'CANDIDATE_ID_FROM_STEP_1'
  AND cic.is_active = TRUE
ORDER BY ccc.transaction_amt DESC;
```

## 🎯 Key Benefits of This Approach

### 1. **Fast Summary Data**
- `v_congress_proisrael_funding` gives you totals instantly
- No need to run complex aggregations
- Perfect for dashboards and overview reports

### 2. **Targeted Detail Queries**
- Only query detailed records when needed
- Focus on specific candidates or time periods
- Avoid overwhelming data dumps

### 3. **Efficient Resource Usage**
- View handles the heavy lifting of aggregations
- Detail queries are focused and fast
- Better database performance

## 🔧 Customization Examples

### Filter by Committee Category
```sql
-- Get support from major pro-Israel PACs only
SELECT 
    ccc.cand_id,
    ccc.transaction_amt,
    ccc.transaction_dt,
    cm.cmte_nm as committee_name
FROM committee_candidate_contributions ccc
JOIN committee_master cm ON ccc.cmte_id = cm.cmte_id
JOIN cfg_israel_committee_ids cic ON ccc.cmte_id = cic.fec_committee_id
WHERE cic.category = 'major'
  AND cic.is_active = TRUE
ORDER BY ccc.transaction_amt DESC;
```

### Filter by Date Range
```sql
-- Get support within specific date range
SELECT 
    ccc.cand_id,
    ccc.transaction_amt,
    ccc.transaction_dt,
    cm.cmte_nm as committee_name
FROM committee_candidate_contributions ccc
JOIN committee_master cm ON ccc.cmte_id = cm.cmte_id
JOIN cfg_israel_committee_ids cic ON ccc.cmte_id = cic.fec_committee_id
WHERE ccc.transaction_dt BETWEEN '2024-01-01' AND '2024-12-31'
  AND cic.is_active = TRUE
ORDER BY ccc.transaction_dt DESC;
```

## 📋 Quick Reference

### Primary Query (Summary)
```sql
SELECT * FROM v_congress_proisrael_funding ORDER BY total_pro_israel_support DESC;
```

### Detail Query Template
```sql
-- Replace 'CANDIDATE_ID' with actual ID from summary
SELECT 
    ccc.transaction_amt,
    ccc.transaction_dt,
    cm.cmte_nm as committee_name,
    cic.category
FROM committee_candidate_contributions ccc
JOIN committee_master cm ON ccc.cmte_id = cm.cmte_id
JOIN cfg_israel_committee_ids cic ON ccc.cmte_id = cic.fec_committee_id
WHERE ccc.cand_id = 'CANDIDATE_ID'
  AND cic.is_active = TRUE
ORDER BY ccc.transaction_dt DESC;
```

## 🚀 Advanced Analysis Techniques

### 1. **Trend Analysis Across Election Cycles**
```sql
-- Compare pro-Israel support across multiple cycles
SELECT 
    cand_id,
    candidate_name,
    two_year_transaction_period,
    total_pro_israel_support,
    LAG(total_pro_israel_support) OVER (
        PARTITION BY cand_id 
        ORDER BY two_year_transaction_period
    ) as previous_cycle_support,
    total_pro_israel_support - LAG(total_pro_israel_support) OVER (
        PARTITION BY cand_id 
        ORDER BY two_year_transaction_period
    ) as support_change
FROM v_congress_proisrael_funding
WHERE cand_id IN (
    SELECT DISTINCT cand_id 
    FROM v_congress_proisrael_funding 
    WHERE total_pro_israel_support > 50000
)
ORDER BY cand_id, two_year_transaction_period;
```

### 2. **Committee Influence Analysis**
```sql
-- See which committees are most active in supporting candidates
SELECT 
    cic.category,
    cm.cmte_nm as committee_name,
    COUNT(DISTINCT ccc.cand_id) as candidates_supported,
    SUM(ccc.transaction_amt) as total_amount,
    AVG(ccc.transaction_amt) as avg_contribution
FROM committee_candidate_contributions ccc
JOIN committee_master cm ON ccc.cmte_id = cm.cmte_id
JOIN cfg_israel_committee_ids cic ON ccc.cmte_id = cic.fec_committee_id
WHERE cic.is_active = TRUE
  AND ccc.transaction_dt >= '2024-01-01'
GROUP BY cic.category, cm.cmte_nm
HAVING COUNT(DISTINCT ccc.cand_id) > 5
ORDER BY total_amount DESC;
```

### 3. **Geographic Distribution Analysis**
```sql
-- Analyze pro-Israel support by state/district
SELECT 
    c.cand_state,
    c.cand_district,
    COUNT(DISTINCT v.cand_id) as candidates_with_support,
    SUM(v.total_pro_israel_support) as total_state_support,
    AVG(v.total_pro_israel_support) as avg_candidate_support
FROM v_congress_proisrael_funding v
JOIN candidate_master c ON v.cand_id = c.cand_id
WHERE v.total_pro_israel_support > 0
GROUP BY c.cand_state, c.cand_district
ORDER BY total_state_support DESC;
```

### 4. **Competitive Race Analysis**
```sql
-- Find races where multiple candidates have pro-Israel support
WITH race_support AS (
    SELECT 
        c.cand_state,
        c.cand_district,
        c.cand_party_affiliation,
        v.total_pro_israel_support,
        ROW_NUMBER() OVER (
            PARTITION BY c.cand_state, c.cand_district 
            ORDER BY v.total_pro_israel_support DESC
        ) as support_rank
    FROM v_congress_proisrael_funding v
    JOIN candidate_master c ON v.cand_id = c.cand_id
    WHERE v.total_pro_israel_support > 0
)
SELECT 
    cand_state,
    cand_district,
    cand_party_affiliation,
    total_pro_israel_support,
    support_rank
FROM race_support
WHERE support_rank <= 3
ORDER BY cand_state, cand_district, support_rank;
```

## 🔍 Troubleshooting Common Issues

### 1. **View Returns No Results**
```sql
-- Check if the view exists and has data
SELECT COUNT(*) FROM v_congress_proisrael_funding;

-- Verify the underlying tables have data
SELECT COUNT(*) FROM cfg_israel_committee_ids WHERE is_active = TRUE;
SELECT COUNT(*) FROM committee_candidate_contributions LIMIT 5;
```

### 2. **Missing Committee Names**
```sql
-- Check for committees without names
SELECT 
    ccc.cmte_id,
    ccc.transaction_amt,
    cm.cmte_nm
FROM committee_candidate_contributions ccc
LEFT JOIN committee_master cm ON ccc.cmte_id = cm.cmte_id
WHERE cm.cmte_nm IS NULL
LIMIT 10;
```

### 3. **Data Type Issues**
```sql
-- Check for invalid transaction amounts
SELECT 
    ccc.cand_id,
    ccc.transaction_amt,
    ccc.transaction_dt
FROM committee_candidate_contributions ccc
WHERE ccc.transaction_amt IS NULL 
   OR ccc.transaction_amt < 0
   OR ccc.transaction_amt > 10000000
LIMIT 10;
```

### 4. **Performance Issues**
```sql
-- Check query execution plan
EXPLAIN (ANALYZE, BUFFERS) 
SELECT * FROM v_congress_proisrael_funding 
WHERE total_pro_israel_support > 100000;

-- Add indexes if needed
CREATE INDEX IF NOT EXISTS idx_ccc_cand_id 
ON committee_candidate_contributions(cand_id);

CREATE INDEX IF NOT EXISTS idx_ccc_cmte_id 
ON committee_candidate_contributions(cmte_id);
```

## 📊 Data Quality Validation

### 1. **Check for Duplicate Records**
```sql
-- Look for potential duplicate contributions
SELECT 
    ccc.cand_id,
    ccc.cmte_id,
    ccc.transaction_amt,
    ccc.transaction_dt,
    COUNT(*) as duplicate_count
FROM committee_candidate_contributions ccc
GROUP BY ccc.cand_id, ccc.cmte_id, ccc.transaction_amt, ccc.transaction_dt
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC;
```

### 2. **Validate Committee Categories**
```sql
-- Check distribution of committee categories
SELECT 
    category,
    COUNT(*) as committee_count,
    COUNT(CASE WHEN is_active THEN 1 END) as active_count
FROM cfg_israel_committee_ids
GROUP BY category
ORDER BY committee_count DESC;
```

### 3. **Verify Transaction Amounts**
```sql
-- Check for unusual transaction amounts
SELECT 
    ccc.transaction_amt,
    COUNT(*) as frequency
FROM committee_candidate_contributions ccc
GROUP BY ccc.transaction_amt
HAVING COUNT(*) > 100
ORDER BY ccc.transaction_amt;
```

## 🎯 Summary

1. **Start with the view**: Use `v_congress_proisrael_funding` for summary data
2. **Drill down selectively**: Use focused queries for specific candidates
3. **Avoid overwhelming queries**: Don't query all records unless necessary
4. **Leverage the system**: The view handles aggregations, you focus on analysis
5. **Validate your data**: Always check for data quality issues
6. **Use advanced techniques**: Leverage window functions and CTEs for complex analysis

This approach gives you the best of both worlds: fast summary data when you need it, and detailed records when you want to investigate specific candidates or transactions.

---

*For complete SQL options, see `sql/get_support_totals_backing_records.sql`*

## 📚 Additional Resources

### Related Documentation
- [FEC Data Schema Guide](fec_schema_overview.md)
- [Committee Analysis Guide](committee_analysis_guide.md)
- [Database Performance Tips](database_performance.md)

### Useful Views and Tables
- `v_congress_proisrael_funding` - Primary summary view
- `cfg_israel_committee_ids` - Committee identification table
- `committee_candidate_contributions` - Direct contributions
- `independent_expenditures` - Outside spending
- `candidate_master` - Candidate information

### Contact Information
For questions about this guide or the underlying data, please refer to the project documentation or create an issue in the repository.
