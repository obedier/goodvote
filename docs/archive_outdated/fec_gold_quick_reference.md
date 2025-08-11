# FEC Database Quick Reference

This is a quick reference guide for common queries and patterns when working with the FEC database schema.

When working with FEC data in future prompts, reference these key points:
- Use operating_expenditures for outside spending - not committee contributions
- Single database approach with fec_gold containing person mapping
- Categorize by purpose field in operating expenditures
- Validate against OpenSecrets.org for accuracy
- Use proper indexes for performance
- Person ID format: P + 8-character hash (e.g., P259F2D0E)
- FEC ID format: State + District + Candidate Number (e.g., H8MI13250)
- The documentation provides everything needed to successfully implement FEC data extraction for any candidate, with proven patterns and validation methods.

## Table Quick Reference

| Table | Purpose | Key Fields | Primary Key |
|-------|---------|------------|-------------|
| `candidate_master` | Candidate registration | `cand_id`, `cand_name`, `cand_office` | `(cand_id, file_year)` |
| `candidate_summary` | Candidate financial summaries | `cand_id`, `ttl_receipts`, `ttl_disb` | `(cand_id, file_year)` |
| `house_senate_current_campaigns` | Current House/Senate campaigns | `cand_id`, `ttl_receipts`, `gen_election_percent` | `(cand_id, file_year)` |
| `committee_master` | Committee registration | `cmte_id`, `cmte_nm`, `cmte_tp` | `(cmte_id, file_year)` |
| `pac_summary` | PAC financial summaries | `cmte_id`, `ttl_receipts`, `ind_exp` | `(cmte_id, file_year)` |
| `individual_contributions` | Individual contributions | `cmte_id`, `transaction_amt`, `name` | `(sub_id, file_year)` |
| `committee_candidate_contributions` | Committee → Candidate | `cmte_id`, `cand_id`, `transaction_amt` | `(sub_id, file_year)` |
| `committee_transactions` | Committee → Committee | `cmte_id`, `other_id`, `transaction_amt` | `(sub_id, file_year)` |
| `operating_expenditures` | Committee spending | `cmte_id`, `transaction_amt`, `purpose` | `(sub_id, file_year)` |
| `candidate_committee_linkages` | Candidate-committee relationships | `cand_id`, `cmte_id`, `cmte_dsgn` | `(linkage_id, file_year)` |
| `crp_fec_mapping` | CRP ↔ FEC mapping | `crp_id`, `fec_candidate_id` | `(crp_id, fec_candidate_id)` |

## Common Query Patterns

### 1. Basic Candidate Information
```sql
SELECT cand_name, cand_office, cand_office_st, cand_pty_affiliation
FROM candidate_master 
WHERE file_year = 2022 AND cand_office = 'H';
```

### 2. Candidate Financial Summary
```sql
SELECT 
    cm.cand_name,
    cm.cand_office,
    cs.ttl_receipts,
    cs.ttl_disb,
    cs.coh_cop
FROM candidate_master cm
JOIN candidate_summary cs ON cm.cand_id = cs.cand_id 
    AND cm.file_year = cs.file_year
WHERE cm.file_year = 2022;
```

### 3. Top Contributors by Employer
```sql
SELECT 
    employer,
    COUNT(*) as contributor_count,
    SUM(transaction_amt) as total_amount
FROM individual_contributions
WHERE file_year = 2022 AND employer IS NOT NULL
GROUP BY employer
ORDER BY total_amount DESC
LIMIT 20;
```

### 4. Committee Expenditures by Category
```sql
SELECT 
    cm.cmte_nm,
    oe.category_desc,
    SUM(oe.transaction_amt) as total_expenditures
FROM operating_expenditures oe
JOIN committee_master cm ON oe.cmte_id = cm.cmte_id 
    AND oe.file_year = cm.file_year
WHERE oe.file_year = 2022
GROUP BY cm.cmte_nm, oe.category_desc
ORDER BY total_expenditures DESC;
```

### 5. CRP Integration
```sql
SELECT 
    cfm.crp_name,
    cfm.party,
    cm.cand_name,
    cs.ttl_receipts
FROM crp_fec_mapping cfm
JOIN candidate_master cm ON cfm.fec_candidate_id = cm.cand_id
JOIN candidate_summary cs ON cm.cand_id = cs.cand_id 
    AND cm.file_year = cs.file_year
WHERE cm.file_year = 2022;
```

### 6. Current Campaign Data
```sql
SELECT 
    cand_name,
    cand_office,
    cand_office_st,
    ttl_receipts,
    gen_election_percent
FROM house_senate_current_campaigns
WHERE file_year = 2022 AND cand_office = 'H'
ORDER BY ttl_receipts DESC;
```

### 7. PAC Financial Analysis
```sql
SELECT 
    cm.cmte_nm,
    ps.ttl_receipts,
    ps.indv_contrib,
    ps.ind_exp
FROM pac_summary ps
JOIN committee_master cm ON ps.cmte_id = cm.cmte_id 
    AND ps.file_year = cm.file_year
WHERE ps.file_year = 2022
ORDER BY ps.ttl_receipts DESC
LIMIT 20;
```

### 8. Committee-to-Committee Transactions
```sql
SELECT 
    cm1.cmte_nm as from_committee,
    cm2.cmte_nm as to_committee,
    SUM(ct.transaction_amt) as total_amount
FROM committee_transactions ct
JOIN committee_master cm1 ON ct.cmte_id = cm1.cmte_id 
    AND ct.file_year = cm1.file_year
JOIN committee_master cm2 ON ct.other_id = cm2.cmte_id 
    AND ct.file_year = cm2.file_year
WHERE ct.file_year = 2022
GROUP BY cm1.cmte_nm, cm2.cmte_nm
ORDER BY total_amount DESC
LIMIT 20;
```

### 9. Candidate-Committee Linkages
```sql
SELECT 
    cm.cand_name,
    cmte.cmte_nm,
    ccl.cmte_dsgn,
    ccl.cmte_tp
FROM candidate_committee_linkages ccl
JOIN candidate_master cm ON ccl.cand_id = cm.cand_id 
    AND ccl.file_year = cm.file_year
JOIN committee_master cmte ON ccl.cmte_id = cmte.cmte_id 
    AND ccl.file_year = cmte.file_year
WHERE ccl.file_year = 2022 AND ccl.cmte_dsgn = 'P';
```

## Key Join Patterns

### Candidate + Financial Data
```sql
candidate_master cm
JOIN candidate_summary cs ON cm.cand_id = cs.cand_id 
    AND cm.file_year = cs.file_year
```

### Committee + Transaction Data
```sql
committee_master cm
JOIN individual_contributions ic ON cm.cmte_id = ic.cmte_id 
    AND cm.file_year = ic.file_year
```

### CRP + FEC Data
```sql
crp_fec_mapping cfm
JOIN candidate_master cm ON cfm.fec_candidate_id = cm.cand_id
```

### Current Campaigns + Candidate Data
```sql
house_senate_current_campaigns hsc
JOIN candidate_master cm ON hsc.cand_id = cm.cand_id 
    AND hsc.file_year = cm.file_year
```

### PAC + Committee Data
```sql
pac_summary ps
JOIN committee_master cm ON ps.cmte_id = cm.cmte_id 
    AND ps.file_year = cm.file_year
```

### Committee Transactions (Self-Join)
```sql
committee_transactions ct
JOIN committee_master cm1 ON ct.cmte_id = cm1.cmte_id 
    AND ct.file_year = cm1.file_year
JOIN committee_master cm2 ON ct.other_id = cm2.cmte_id 
    AND ct.file_year = cm2.file_year
```

### Candidate-Committee Linkages
```sql
candidate_committee_linkages ccl
JOIN candidate_master cm ON ccl.cand_id = cm.cand_id 
    AND ccl.file_year = cm.file_year
JOIN committee_master cmte ON ccl.cmte_id = cmte.cmte_id 
    AND ccl.file_year = cmte.file_year
```

## Important Codes

### Office Codes
- `H`: House of Representatives
- `S`: Senate  
- `P`: President

### Committee Types
- `H`: House campaign committee
- `S`: Senate campaign committee
- `P`: Presidential campaign committee
- `Q`: PAC - qualified (existed 6+ months, 50+ contributors, 5+ federal candidates)
- `N`: PAC - nonqualified (newer PACs with lower contribution limits)
- `O`: Independent expenditure-only (Super PACs)
- `I`: Independent expenditor (person or group)
- `E`: Electioneering communication
- `C`: Communication cost (corporations/unions)
- `D`: Delegate committee
- `V`: Hybrid PAC (with Non-Contribution Account) - Nonqualified
- `W`: Hybrid PAC (with Non-Contribution Account) - Qualified
- `X`: Party - nonqualified
- `Y`: Party - qualified
- `Z`: National party nonfederal account (pre-BCRA)
- `U`: Single-candidate independent expenditure

### Transaction Types
- `10`: Contribution to candidate
- `11`: Contribution from candidate's personal funds
- `15`: Contribution from political party
- `24A`: Independent expenditure opposing election of candidate
- `24C`: Coordinated party expenditure
- `24E`: Independent expenditure advocating election of candidate
- `24F`: Communication cost for candidate (Form 7 filer)
- `24N`: Communication cost against candidate (Form 7 filer)
- `29`: Electioneering Communication disbursement or obligation
- `19`: Electioneering communication donation received

## Performance Tips

1. **Always filter by `file_year`** - Tables can be very large
2. **Use appropriate indexes** - Join on indexed columns
3. **Limit result sets** - Use LIMIT for large queries
4. **Filter early** - Use WHERE clauses before JOINs when possible

## Common Analysis Patterns

### Campaign Finance Analysis
```sql
-- Total contributions by state
SELECT 
    cm.cand_office_st,
    SUM(cs.ttl_receipts) as total_receipts,
    COUNT(DISTINCT cm.cand_id) as candidate_count
FROM candidate_master cm
JOIN candidate_summary cs ON cm.cand_id = cs.cand_id 
    AND cm.file_year = cs.file_year
WHERE cm.file_year = 2022
GROUP BY cm.cand_office_st
ORDER BY total_receipts DESC;
```

### Network Analysis
```sql
-- Committees contributing to multiple candidates
SELECT 
    cmte_id,
    COUNT(DISTINCT cand_id) as candidate_count,
    SUM(transaction_amt) as total_contributed
FROM committee_candidate_contributions
WHERE file_year = 2022
GROUP BY cmte_id
HAVING COUNT(DISTINCT cand_id) > 1
ORDER BY total_contributed DESC;
```

### Cross-Platform Analysis
```sql
-- CRP candidates with highest individual contributions
SELECT 
    cfm.crp_name,
    cfm.party,
    SUM(ic.transaction_amt) as total_contributions
FROM crp_fec_mapping cfm
JOIN candidate_master cm ON cfm.fec_candidate_id = cm.cand_id
JOIN individual_contributions ic ON cm.cand_id = ic.cand_id 
    AND cm.file_year = ic.file_year
WHERE ic.file_year = 2022
GROUP BY cfm.crp_name, cfm.party
ORDER BY total_contributions DESC;
```

### Special Interest Spending Analysis
```sql
-- Independent expenditures by committee type
SELECT 
    cm.cmte_nm,
    cm.cmte_tp,
    SUM(CASE WHEN ccc.transaction_tp = '24A' THEN ccc.transaction_amt ELSE 0 END) as against_candidate,
    SUM(CASE WHEN ccc.transaction_tp = '24E' THEN ccc.transaction_amt ELSE 0 END) as for_candidate
FROM committee_candidate_contributions ccc
JOIN committee_master cm ON ccc.cmte_id = cm.cmte_id 
    AND ccc.file_year = cm.file_year
WHERE ccc.file_year = 2022 
    AND ccc.transaction_tp IN ('24A', '24E')
GROUP BY cm.cmte_nm, cm.cmte_tp
ORDER BY (against_candidate + for_candidate) DESC;
```

### Super PAC Analysis
```sql
-- Super PAC independent expenditures
SELECT 
    cm.cmte_nm,
    SUM(CASE WHEN ccc.transaction_tp = '24A' THEN ccc.transaction_amt ELSE 0 END) as against_spending,
    SUM(CASE WHEN ccc.transaction_tp = '24E' THEN ccc.transaction_amt ELSE 0 END) as for_spending
FROM committee_candidate_contributions ccc
JOIN committee_master cm ON ccc.cmte_id = cm.cmte_id 
    AND ccc.file_year = cm.file_year
WHERE ccc.file_year = 2022 
    AND cm.cmte_tp = 'O'
    AND ccc.transaction_tp IN ('24A', '24E')
GROUP BY cm.cmte_nm
ORDER BY (against_spending + for_spending) DESC;
```

### Comprehensive Spending Analysis
```sql
-- Total spending for/against candidates
SELECT 
    cand.cand_name,
    SUM(CASE WHEN ccc.transaction_tp = '24E' THEN ccc.transaction_amt ELSE 0 END) as independent_for,
    SUM(CASE WHEN ccc.transaction_tp = '24A' THEN ccc.transaction_amt ELSE 0 END) as independent_against,
    SUM(CASE WHEN ccc.transaction_tp = '24C' THEN ccc.transaction_amt ELSE 0 END) as coordinated_spending,
    SUM(CASE WHEN ccc.transaction_tp = '29' THEN ccc.transaction_amt ELSE 0 END) as electioneering_spending
FROM committee_candidate_contributions ccc
JOIN candidate_master cand ON ccc.cand_id = cand.cand_id 
    AND ccc.file_year = cand.file_year
WHERE ccc.file_year = 2022
GROUP BY cand.cand_name
ORDER BY (independent_for + independent_against + coordinated_spending + electioneering_spending) DESC;
```

### PAC Analysis
```sql
-- Top PACs by independent expenditures
SELECT 
    cm.cmte_nm,
    ps.ind_exp,
    ps.ttl_receipts,
    ps.indv_contrib
FROM pac_summary ps
JOIN committee_master cm ON ps.cmte_id = cm.cmte_id 
    AND ps.file_year = cm.file_year
WHERE ps.file_year = 2022 AND ps.ind_exp > 0
ORDER BY ps.ind_exp DESC
LIMIT 20;
```

### Committee Network Analysis
```sql
-- Committees with most inter-committee transactions
SELECT 
    cm.cmte_nm,
    COUNT(DISTINCT ct.other_id) as committee_count,
    SUM(ct.transaction_amt) as total_transactions
FROM committee_transactions ct
JOIN committee_master cm ON ct.cmte_id = cm.cmte_id 
    AND ct.file_year = cm.file_year
WHERE ct.file_year = 2022
GROUP BY cm.cmte_nm
ORDER BY total_transactions DESC
LIMIT 20;
```

### Current Campaign Performance
```sql
-- House candidates with highest receipts and election results
SELECT 
    cand_name,
    cand_office_st,
    cand_office_district,
    ttl_receipts,
    gen_election_percent
FROM house_senate_current_campaigns
WHERE file_year = 2022 
    AND cand_office = 'H'
    AND gen_election_percent IS NOT NULL
ORDER BY ttl_receipts DESC
LIMIT 20;
``` 