# FEC Data Extraction Guide for Candidates

## Overview

This document outlines the complete process for extracting and analyzing Federal Election Commission (FEC) data for political candidates, based on our implementation for the GoodVote platform.

## Database Architecture

### Primary Database: `fec_gold`
- **Purpose**: Contains all FEC data with person-based mapping
- **Key Tables**: 
  - `person_candidates` - Person-to-candidate mapping (copied from goodvote)
  - `operating_expenditures` - Campaign spending data
  - `candidate_summary` - Campaign finance summaries
  - `individual_contributions` - Individual donor data
  - `committee_candidate_contributions` - Committee contributions
  - `candidate_committee_linkages` - Candidate-committee relationships

### Person-Based Mapping System
- **Person ID Format**: `P` + 8-character hash (e.g., `P259F2D0E`)
- **FEC ID Format**: State + District + Candidate Number (e.g., `H8MI13250`)
- **Mapping Table**: `person_candidates` links person_id to cand_id across election cycles

## Core Data Extraction Categories

### 1. Campaign Finance Summary (`candidate_summary`)

**Key Metrics:**
- `ttl_receipts` - Total receipts
- `ttl_indiv_contrib` - Individual contributions
- `other_pol_cmte_contrib` - Other committee contributions
- `pol_pty_contrib` - Party committee contributions
- `trans_from_auth` - Transfers from authorized committees
- `ttl_disb` - Total disbursements
- `cand_contrib` - Candidate self-financing
- `cand_loans` - Candidate loans
- `other_loans` - Other loans
- `debts_owed_by` - Debts owed by committee
- `cash_on_hand` - Calculated as `ttl_receipts - ttl_disb`

**Query Pattern:**
```sql
SELECT * FROM candidate_summary 
WHERE cand_id = $1 AND file_year = $2
```

### 2. Operating Expenditures (`operating_expenditures`)

**Purpose**: This is the primary source for "outside spending" - money spent by committees on behalf of candidates.

**Key Fields:**
- `cmte_id` - Committee ID
- `transaction_amt` - Amount spent
- `purpose` - Purpose of expenditure
- `category` - Category of expenditure
- `file_year` - Year of filing

**Categorization by Purpose:**
```sql
-- Media Advertising (TV/Radio)
CASE WHEN LOWER(purpose) LIKE '%tv%' OR LOWER(purpose) LIKE '%radio%' OR LOWER(purpose) LIKE '%advertising%' 
THEN transaction_amt ELSE 0 END

-- Digital Advertising
CASE WHEN LOWER(purpose) LIKE '%digital%' OR LOWER(purpose) LIKE '%online%' 
THEN transaction_amt ELSE 0 END

-- Polling & Research
CASE WHEN LOWER(purpose) LIKE '%polling%' OR LOWER(purpose) LIKE '%survey%' 
THEN transaction_amt ELSE 0 END

-- Printing & Production
CASE WHEN LOWER(purpose) LIKE '%printing%' OR LOWER(purpose) LIKE '%production%' 
THEN transaction_amt ELSE 0 END

-- Consulting Services
CASE WHEN LOWER(purpose) LIKE '%consulting%' OR LOWER(purpose) LIKE '%fundraising%' 
THEN transaction_amt ELSE 0 END

-- Staff Payroll
CASE WHEN LOWER(purpose) LIKE '%payroll%' OR LOWER(purpose) LIKE '%salary%' 
THEN transaction_amt ELSE 0 END
```

**Query Pattern:**
```sql
SELECT 
  COALESCE(SUM(oe.transaction_amt), 0) as total_operating_expenditures,
  COUNT(oe.transaction_amt) as operating_expenditure_count,
  COUNT(DISTINCT oe.cmte_id) as unique_committees,
  -- Categorized breakdowns...
FROM candidate_committee_linkages ccl
LEFT JOIN operating_expenditures oe ON ccl.cmte_id = oe.cmte_id AND oe.file_year = $2
WHERE ccl.cand_id = $1 AND ccl.cand_election_yr = $2
```

### 3. Individual Contributions (`individual_contributions`)

**Key Fields:**
- `name` - Contributor name
- `city`, `state`, `zip_code` - Location
- `employer`, `occupation` - Employment info
- `transaction_amt` - Contribution amount
- `transaction_dt` - Contribution date
- `transaction_tp` - Transaction type (15, 15E, 22Y for individual contributions)

**Query Pattern:**
```sql
SELECT 
  ic.name, ic.city, ic.state, ic.employer, ic.occupation,
  SUM(ic.transaction_amt) as total_amount,
  COUNT(*) as contribution_count
FROM individual_contributions ic
JOIN candidate_committee_linkages ccl ON ic.cmte_id = ccl.cmte_id
WHERE ccl.cand_id = $1 AND ic.file_year = $2 
  AND ic.transaction_amt > 0
  AND ic.transaction_tp IN ('15', '15E', '22Y')
GROUP BY ic.name, ic.city, ic.state, ic.employer, ic.occupation
ORDER BY total_amount DESC
```

### 4. Committee Contributions (`committee_candidate_contributions`)

**Key Fields:**
- `cmte_id` - Committee ID
- `transaction_amt` - Contribution amount
- `transaction_tp` - Transaction type
- `name` - Committee name

**Transaction Types:**
- `24K` - Bundled contributions
- `24A` - Independent expenditures in favor
- `24E` - Communication costs in favor
- `24C` - Soft money in favor
- `24N` - Spending against

**Query Pattern:**
```sql
SELECT 
  cm.cmte_nm as committee_name,
  cm.cmte_tp as committee_type,
  SUM(cc.transaction_amt) as total_amount,
  COUNT(*) as contribution_count
FROM committee_candidate_contributions cc
LEFT JOIN committee_master cm ON cc.cmte_id = cm.cmte_id
WHERE cc.cand_id = $1 AND cc.file_year = $2
  AND cc.transaction_amt > 0
GROUP BY cm.cmte_nm, cm.cmte_tp
ORDER BY total_amount DESC
```

## Data Extraction Process

### Step 1: Person-to-Candidate Mapping
```sql
-- Get candidate ID for specific election year
SELECT cand_id 
FROM person_candidates 
WHERE person_id = $1 AND election_year = $2
```

### Step 2: Campaign Finance Summary
```sql
-- Get basic campaign finance data
SELECT * FROM candidate_summary 
WHERE cand_id = $1 AND file_year = $2
```

### Step 3: Operating Expenditures (Outside Spending)
```sql
-- Get categorized operating expenditures
SELECT 
  COALESCE(SUM(oe.transaction_amt), 0) as total_operating_expenditures,
  -- Categorized breakdowns...
FROM candidate_committee_linkages ccl
LEFT JOIN operating_expenditures oe ON ccl.cmte_id = oe.cmte_id AND oe.file_year = $2
WHERE ccl.cand_id = $1 AND ccl.cand_election_yr = $2
```

### Step 4: Individual Contributions
```sql
-- Get top individual contributors
SELECT name, city, state, employer, occupation,
       SUM(transaction_amt) as total_amount,
       COUNT(*) as contribution_count
FROM individual_contributions ic
JOIN candidate_committee_linkages ccl ON ic.cmte_id = ccl.cmte_id
WHERE ccl.cand_id = $1 AND ic.file_year = $2
  AND ic.transaction_amt > 0
GROUP BY name, city, state, employer, occupation
ORDER BY total_amount DESC
```

### Step 5: Committee Contributions
```sql
-- Get committee contributions
SELECT committee_name, committee_type,
       SUM(transaction_amt) as total_amount,
       COUNT(*) as contribution_count
FROM committee_candidate_contributions cc
LEFT JOIN committee_master cm ON cc.cmte_id = cm.cmte_id
WHERE cc.cand_id = $1 AND cc.file_year = $2
GROUP BY committee_name, committee_type
ORDER BY total_amount DESC
```

## Key Insights and Findings

### 1. Outside Spending Calculation
- **Primary Source**: `operating_expenditures` table
- **Not**: `committee_candidate_contributions` (this is direct contributions, not outside spending)
- **Real Data**: For Rashida Tlaib (2024), we found $3.68M in operating expenditures vs. only $2K in committee contributions

### 2. Data Accuracy
- **Operating Expenditures**: Most accurate representation of outside spending
- **Categorization**: Use `purpose` field to categorize expenditures
- **Committee Linkages**: Essential for connecting candidates to their committees

### 3. Performance Optimization
- **Single Database**: All queries should use `fec_gold` database
- **Indexes**: Critical for performance on large datasets
- **Connection Pooling**: Use appropriate pool sizes and timeouts

### 4. Data Validation
- **Cross-Reference**: Compare with OpenSecrets.org for validation
- **Expected Ranges**: 
  - Operating expenditures: $100K - $10M+ for major candidates
  - Individual contributions: $1K - $100K+ for top donors
  - Committee contributions: $1K - $50K+ for PACs

## Example Implementation

### Rashida Tlaib (H8MI13250) - 2024 Cycle

**Campaign Finance Summary:**
- Total Receipts: $8,473,097.48
- Total Disbursements: $4,446,846.31
- Cash on Hand: $4,026,251.17

**Operating Expenditures (Outside Spending):**
- Total: $3,682,675.67
- Media Advertising: $619,550
- Digital Advertising: $946,571
- Polling Research: $52,000
- Printing Production: $267,078.32
- Consulting Services: $526,826.72
- Staff Payroll: $1,190,842.08

**Key Metrics:**
- Outside Spending %: 43.5% of total receipts
- Unique Committees: 1 (Rashida's own committee)
- Transaction Count: 2,462 operating expenditures

## Database Schema Requirements

### Essential Tables in `fec_gold`:
1. `person_candidates` - Person-to-candidate mapping
2. `operating_expenditures` - Outside spending data
3. `candidate_summary` - Campaign finance summaries
4. `individual_contributions` - Individual donor data
5. `committee_candidate_contributions` - Committee contributions
6. `candidate_committee_linkages` - Committee relationships
7. `committee_master` - Committee information

### Required Indexes:
```sql
CREATE INDEX idx_person_candidates_person_id ON person_candidates(person_id);
CREATE INDEX idx_person_candidates_cand_id ON person_candidates(cand_id);
CREATE INDEX idx_person_candidates_election_year ON person_candidates(election_year);
CREATE INDEX idx_operating_expenditures_cmte_id ON operating_expenditures(cmte_id);
CREATE INDEX idx_operating_expenditures_file_year ON operating_expenditures(file_year);
CREATE INDEX idx_candidate_summary_cand_id ON candidate_summary(cand_id);
CREATE INDEX idx_candidate_summary_file_year ON candidate_summary(file_year);
```

## API Response Structure

### Campaign Finance Data:
```typescript
interface CampaignFinance {
  election_year: number;
  total_receipts: number;
  total_disbursements: number;
  cash_on_hand: number;
  contribution_count: number;
  avg_contribution: number;
  
  // Outside spending breakdown
  total_operating_expenditures: number;
  media_advertising: number;
  digital_advertising: number;
  polling_research: number;
  printing_production: number;
  consulting_services: number;
  staff_payroll: number;
  
  // Committee contributions
  committee_contributions: number;
  committee_contribution_count: number;
  
  // Percentages
  outside_spending_percentage: number;
  unique_committees: number;
}
```

## Common Pitfalls and Solutions

### 1. Cross-Database Queries
- **Problem**: Slow performance with multiple database connections
- **Solution**: Copy person mapping to `fec_gold` database

### 2. Missing Data
- **Problem**: Some candidates missing from `candidate_summary`
- **Solution**: Use `person_candidates` to find all candidate IDs

### 3. Incorrect Outside Spending
- **Problem**: Using `committee_candidate_contributions` instead of `operating_expenditures`
- **Solution**: Use `operating_expenditures` for real outside spending data

### 4. Performance Issues
- **Problem**: Slow queries on large datasets
- **Solution**: Add proper indexes and use single database

## Validation Checklist

- [ ] Operating expenditures match OpenSecrets.org data
- [ ] Campaign finance totals are reasonable for election cycle
- [ ] Individual contributions include proper transaction types
- [ ] Committee contributions are categorized correctly
- [ ] Person-to-candidate mapping is complete
- [ ] Database indexes are in place
- [ ] Single database approach is implemented

## Future Enhancements

1. **Real-time Updates**: Implement FEC data refresh process
2. **Advanced Analytics**: Add trend analysis and comparisons
3. **Data Quality**: Implement validation rules and error handling
4. **Caching**: Add Redis caching for frequently accessed data
5. **API Optimization**: Implement query optimization and pagination

---

*This guide should be updated as new insights are discovered and the FEC data structure evolves.* 