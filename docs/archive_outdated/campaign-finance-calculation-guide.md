# Campaign Finance Calculation Guide

## Overview
This document outlines the correct methodology for calculating and presenting campaign finance data for political candidates, based on FEC (Federal Election Commission) standards and OpenSecrets.org practices.

## Key Campaign Finance Metrics

### 1. Total Receipts
**Definition**: All money received by a campaign committee during an election cycle.
**FEC Sources**:
- Individual contributions (`individual_contributions` table)
- PAC contributions (`committee_transactions` table)
- Party committee transfers
- Candidate loans
- Other receipts

**Calculation Method**:
```sql
SELECT 
  SUM(transaction_amt) as total_receipts
FROM individual_contributions ic
JOIN candidate_committee_linkages ccl ON ic.cmte_id = ccl.cmte_id
WHERE ccl.cand_id = '[CANDIDATE_ID]' 
  AND ic.file_year = [ELECTION_YEAR]
  AND ic.transaction_amt > 0
```

### 2. Total Disbursements
**Definition**: All money spent by a campaign committee during an election cycle.
**FEC Sources**:
- Operating expenditures (`operating_expenditures` table)
- Transfers to other committees
- Refunds to contributors
- Other disbursements

**Calculation Method**:
```sql
SELECT 
  SUM(transaction_amt) as total_disbursements
FROM operating_expenditures oe
JOIN candidate_committee_linkages ccl ON oe.cmte_id = ccl.cmte_id
WHERE ccl.cand_id = '[CANDIDATE_ID]' 
  AND oe.file_year = [ELECTION_YEAR]
  AND oe.transaction_amt > 0
```

### 3. Cash on Hand
**Definition**: Money remaining in campaign accounts at the end of reporting period.
**Calculation**: `Total Receipts - Total Disbursements`

### 4. Contribution Count
**Definition**: Number of unique contributions received.
**Calculation Method**:
```sql
SELECT 
  COUNT(DISTINCT ic.name || ic.city || ic.state) as contribution_count
FROM individual_contributions ic
JOIN candidate_committee_linkages ccl ON ic.cmte_id = ccl.cmte_id
WHERE ccl.cand_id = '[CANDIDATE_ID]' 
  AND ic.file_year = [ELECTION_YEAR]
  AND ic.transaction_amt > 0
```

### 5. Average Contribution
**Definition**: Average amount per contribution.
**Calculation**: `Total Receipts / Contribution Count`

## Top Contributors Calculation

### Methodology
1. **Aggregate by Contributor**: Group contributions by contributor name and location
2. **Sum Amounts**: Total all contributions from each unique contributor
3. **Sort by Amount**: Order by total contribution amount (descending)
4. **Limit Results**: Show top 10-20 contributors

### SQL Query
```sql
SELECT 
  ic.name as contributor_name,
  ic.city as contributor_city,
  ic.state as contributor_state,
  SUM(ic.transaction_amt) as total_amount,
  COUNT(*) as contribution_count
FROM individual_contributions ic
JOIN candidate_committee_linkages ccl ON ic.cmte_id = ccl.cmte_id
WHERE ccl.cand_id = '[CANDIDATE_ID]' 
  AND ic.file_year = [ELECTION_YEAR]
  AND ic.transaction_amt > 0
GROUP BY ic.name, ic.city, ic.state
ORDER BY total_amount DESC
LIMIT 20
```

## Industry Analysis

### Methodology
1. **Map Contributors to Industries**: Use contributor employer/occupation data
2. **Aggregate by Industry**: Group contributions by industry sector
3. **Calculate Percentages**: Show industry breakdown as percentages

### Data Sources
- `individual_contributions.employer` - Company/employer information
- `individual_contributions.occupation` - Job title/occupation
- Industry classification database (external)

## Election Cycle Considerations

### Primary vs General Elections
- **Primary**: Contributions during primary election period
- **General**: Contributions during general election period
- **Combined**: Total for entire election cycle

### Reporting Periods
- FEC data is reported monthly/quarterly
- Use `file_year` to filter by election cycle
- Consider `transaction_dt` for specific time periods

## Validation Framework

### Test Cases
1. **Rashida Tlaib (H8MI13250)** - 2024 House race
2. **Adam Schiff (H0CA27085)** - 2024 Senate race
3. **High-profile candidate** - For comparison with OpenSecrets

### Validation Metrics
- Compare our calculations with OpenSecrets.org data
- Verify contribution totals match FEC filings
- Check that top contributors are accurate
- Ensure industry breakdowns are reasonable

### Expected Results
- **Rashida Tlaib**: ~$2-5M total receipts (2024 cycle)
- **Adam Schiff**: ~$10-20M total receipts (2024 Senate race)
- Top contributors should match known major donors
- Industry breakdown should reflect candidate's support base

## Implementation Notes

### Database Considerations
- Use `fec_gold` database for FEC data
- Use `goodvote` database for person mapping
- Cross-database queries require careful handling

### Performance Optimization
- Index on `cand_id`, `file_year`, `transaction_amt`
- Use LIMIT clauses for large result sets
- Cache frequently accessed data
- Implement timeout handling for slow queries

### Data Quality Issues
- Handle duplicate entries in FEC data
- Normalize contributor names (spelling variations)
- Filter out invalid/negative amounts
- Account for refunds and corrections

## OpenSecrets Comparison

### Key Differences
- **OpenSecrets**: Uses processed/cleaned data
- **Our System**: Uses raw FEC data
- **OpenSecrets**: Has industry classification database
- **Our System**: Needs to implement industry mapping

### Alignment Goals
- Match OpenSecrets totals within 5%
- Verify top contributors are identical
- Ensure industry breakdowns are similar
- Maintain same data presentation format

## Next Steps

1. **Implement Correct Calculations**: Update API to use proper SQL queries
2. **Add Industry Classification**: Map contributors to industries
3. **Create Validation Tests**: Compare with OpenSecrets data
4. **Optimize Performance**: Handle large datasets efficiently
5. **Add Data Quality Checks**: Handle duplicates and errors
6. **Implement Caching**: Cache expensive calculations
7. **Add Export Features**: Allow data download in various formats 