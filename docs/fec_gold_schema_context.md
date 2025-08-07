# FEC Database Schema Context

This document provides a comprehensive overview of the Federal Election Commission (FEC) database schema, including all tables, their relationships, field definitions, and usage patterns. This context is designed for AI projects and prompts that need to understand and query FEC campaign finance data.

## Overview

The FEC database contains comprehensive campaign finance data for federal elections in the United States. The schema includes candidate information, committee details, individual contributions, committee transactions, operating expenditures, and summary data. Additionally, there's a CRP (Center for Responsive Politics) mapping table that links FEC candidate IDs to OpenSecrets.org IDs.

## Core Tables and Relationships

### 1. Candidate Information Tables

#### `candidate_master`
**Purpose**: Master table containing candidate registration and basic information.
**Key Fields**:
- `cand_id` (varchar(9)): Unique FEC candidate identifier
- `cand_name` (varchar(200)): Candidate's full name
- `cand_pty_affiliation` (varchar(3)): Political party affiliation
- `cand_office` (varchar(1)): Office sought (H=House, S=Senate, P=President)
- `cand_office_st` (varchar(2)): State of the race
- `cand_office_district` (varchar(2)): Congressional district
- `cand_pcc` (varchar(9)): Principal campaign committee ID
- `cand_ici` (varchar(1)): Incumbent/Challenger status (I=Incumbent, C=Challenger, O=Open)
- `file_year` (integer): Election cycle year

**Primary Key**: `(cand_id, file_year)`

#### `candidate_summary`
**Purpose**: Financial summary data for candidates.
**Key Fields**:
- `cand_id` (varchar(9)): Links to candidate_master
- `ttl_receipts` (numeric): Total receipts
- `ttl_disb` (numeric): Total disbursements
- `ttl_indiv_contrib` (numeric): Total individual contributions
- `coh_cop` (numeric): Cash on hand at close of period
- `debts_owed_by` (numeric): Debts owed by candidate

**Primary Key**: `(cand_id, file_year)`

#### `house_senate_current_campaigns`
**Purpose**: Current campaign financial data for House and Senate candidates.
**Key Fields**:
- `cand_id` (varchar(9)): Links to candidate_master
- `cand_ici` (varchar(1)): Incumbent/Challenger status
- `ttl_receipts` (numeric): Total receipts
- `ttl_disb` (numeric): Total disbursements
- `gen_election_percent` (numeric): General election vote percentage

### 2. Committee Information Tables

#### `committee_master`
**Purpose**: Master table containing committee registration and basic information.
**Key Fields**:
- `cmte_id` (varchar(9)): Unique FEC committee identifier
- `cmte_nm` (varchar(200)): Committee name
- `cmte_tp` (varchar(1)): Committee type (H=House, S=Senate, P=President, Q=PAC, etc.)
- `cmte_dsgn` (varchar(1)): Committee designation (P=Principal campaign committee, A=Authorized, etc.)
- `cmte_pty_affiliation` (varchar(3)): Committee party affiliation
- `cand_id` (varchar(9)): Associated candidate ID (for candidate committees)
- `file_year` (integer): Election cycle year

**Primary Key**: `(cmte_id, file_year)`

#### `pac_summary`
**Purpose**: Financial summary data for PACs and party committees.
**Key Fields**:
- `cmte_id` (varchar(9)): Links to committee_master
- `cmte_nm` (varchar(200)): Committee name
- `ttl_receipts` (numeric): Total receipts
- `indv_contrib` (numeric): Individual contributions
- `other_pol_cmte_contrib` (numeric): Contributions from other committees
- `ind_exp` (numeric): Independent expenditures

**Primary Key**: `(cmte_id, file_year)`

### 3. Transaction Tables

#### `individual_contributions`
**Purpose**: Individual contributions to committees.
**Key Fields**:
- `cmte_id` (varchar(9)): Receiving committee
- `transaction_amt` (numeric): Contribution amount
- `name` (varchar(200)): Contributor name
- `city` (varchar(30)), `state` (varchar(2)), `zip_code` (varchar(9)): Contributor location
- `employer` (varchar(38)), `occupation` (varchar(200)): Contributor employment
- `transaction_dt` (varchar(100)): Transaction date
- `transaction_tp` (varchar(3)): Transaction type code
- `other_id` (varchar(9)): FEC ID of contributing committee (if applicable)
- `sub_id` (varchar(100)): Unique record identifier
- `file_year` (integer): Election cycle year

**Primary Key**: `(sub_id, file_year)`

#### `committee_candidate_contributions`
**Purpose**: Committee contributions to candidates.
**Key Fields**:
- `cmte_id` (varchar(9)): Contributing committee
- `cand_id` (varchar(9)): Receiving candidate
- `transaction_amt` (numeric): Contribution amount
- `name` (varchar(200)): Committee name
- `transaction_dt` (varchar(38)): Transaction date
- `transaction_tp` (varchar(3)): Transaction type code
- `sub_id` (varchar(100)): Unique record identifier
- `file_year` (integer): Election cycle year

**Primary Key**: `(sub_id, file_year)`

#### `committee_transactions`
**Purpose**: All transactions between committees.
**Key Fields**:
- `cmte_id` (varchar(9)): Filing committee
- `other_id` (varchar(9)): Other committee involved
- `transaction_amt` (numeric): Transaction amount
- `transaction_tp` (varchar(3)): Transaction type code
- `name` (varchar(200)): Other committee name
- `sub_id` (varchar(100)): Unique record identifier
- `file_year` (integer): Election cycle year

**Primary Key**: `(sub_id, file_year)`

#### `operating_expenditures`
**Purpose**: Committee operating expenditures and disbursements.
**Key Fields**:
- `cmte_id` (varchar(9)): Spending committee
- `transaction_amt` (numeric): Expenditure amount
- `name` (varchar(200)): Recipient name
- `purpose` (varchar(100)): Purpose of expenditure
- `category` (varchar(3)): Disbursement category code
- `category_desc` (varchar(40)): Category description
- `transaction_dt` (varchar(12)): Transaction date
- `sub_id` (numeric): Unique record identifier
- `file_year` (integer): Election cycle year

**Primary Key**: `(sub_id, file_year)`

### 4. Relationship Tables

#### `candidate_committee_linkages`
**Purpose**: Links candidates to their authorized committees.
**Key Fields**:
- `cand_id` (varchar(9)): Candidate ID
- `cmte_id` (varchar(9)): Committee ID
- `cmte_tp` (varchar(1)): Committee type
- `cmte_dsgn` (varchar(1)): Committee designation
- `linkage_id` (numeric): Unique linkage identifier
- `file_year` (integer): Election cycle year

### 5. CRP Mapping Table

#### `crp_fec_mapping`
**Purpose**: Links FEC candidate IDs to Center for Responsive Politics (OpenSecrets.org) IDs.
**Key Fields**:
- `crp_id` (varchar(20)): CRP ID from OpenSecrets.org
- `crp_name` (varchar(200)): Candidate name as provided by CRP
- `party` (varchar(10)): Political party affiliation
- `district_id` (varchar(10)): District identifier (e.g., CO07, VTS2)
- `fec_candidate_id` (varchar(20)): FEC Candidate ID
- `file_year` (integer): Not included in this table (static mapping)

**Primary Key**: `(crp_id, fec_candidate_id)`

## Key Relationships

### 1. Candidate Relationships
```
candidate_master.cand_id ↔ candidate_summary.cand_id
candidate_master.cand_id ↔ house_senate_current_campaigns.cand_id
candidate_master.cand_id ↔ crp_fec_mapping.fec_candidate_id
candidate_master.cand_pcc ↔ committee_master.cmte_id
```

### 2. Committee Relationships
```
committee_master.cmte_id ↔ individual_contributions.cmte_id
committee_master.cmte_id ↔ committee_candidate_contributions.cmte_id
committee_master.cmte_id ↔ committee_transactions.cmte_id
committee_master.cmte_id ↔ operating_expenditures.cmte_id
committee_master.cmte_id ↔ pac_summary.cmte_id
```

### 3. Transaction Relationships
```
individual_contributions.other_id ↔ committee_master.cmte_id
committee_candidate_contributions.cand_id ↔ candidate_master.cand_id
committee_transactions.other_id ↔ committee_master.cmte_id
```

## Common Query Patterns

### 1. Candidate Analysis
```sql
-- Find candidates with their financial summaries
SELECT 
    cm.cand_name,
    cm.cand_office,
    cm.cand_office_st,
    cs.ttl_receipts,
    cs.ttl_disb,
    cs.ttl_indiv_contrib
FROM candidate_master cm
JOIN candidate_summary cs ON cm.cand_id = cs.cand_id 
    AND cm.file_year = cs.file_year
WHERE cm.file_year = 2022;
```

### 2. Contribution Analysis
```sql
-- Top individual contributors
SELECT 
    name,
    employer,
    SUM(transaction_amt) as total_contributed
FROM individual_contributions
WHERE file_year = 2022
GROUP BY name, employer
ORDER BY total_contributed DESC
LIMIT 20;
```

### 3. Committee Expenditure Analysis
```sql
-- Committee operating expenditures by category
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

### 4. CRP Integration Queries
```sql
-- Candidates with both FEC and CRP data
SELECT 
    cfm.crp_name,
    cfm.party as crp_party,
    cm.cand_name,
    cm.cand_pty_affiliation as fec_party,
    cs.ttl_receipts
FROM crp_fec_mapping cfm
JOIN candidate_master cm ON cfm.fec_candidate_id = cm.cand_id
JOIN candidate_summary cs ON cm.cand_id = cs.cand_id 
    AND cm.file_year = cs.file_year
WHERE cm.file_year = 2022;
```

### 5. Cross-Platform Analysis
```sql
-- Individual contributions to candidates with CRP IDs
SELECT 
    cfm.crp_name,
    cfm.party,
    SUM(ic.transaction_amt) as total_contributions,
    COUNT(*) as contribution_count
FROM crp_fec_mapping cfm
JOIN candidate_master cm ON cfm.fec_candidate_id = cm.cand_id
JOIN individual_contributions ic ON cm.cand_id = ic.cand_id 
    AND cm.file_year = ic.file_year
WHERE ic.file_year = 2022
GROUP BY cfm.crp_name, cfm.party
ORDER BY total_contributions DESC;
```

## Important Field Codes

### Office Codes (`cand_office`)
- `H`: House of Representatives
- `S`: Senate
- `P`: President

### Committee Types (`cmte_tp`)
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

### Committee Designations (`cmte_dsgn`)
- `A`: Authorized by a candidate
- `J`: Joint fundraising committee
- `P`: Principal campaign committee
- `U`: Unauthorized

### Transaction Types (`transaction_tp`)
Common codes include:
- `10`: Contribution to candidate
- `11`: Contribution to candidate from candidate's personal funds
- `15`: Contribution to candidate from political party
- `20`: Loan to candidate
- `24A`: Independent expenditure opposing election of candidate
- `24C`: Coordinated party expenditure
- `24E`: Independent expenditure advocating election of candidate
- `24F`: Communication cost for candidate (Form 7 filer)
- `24N`: Communication cost against candidate (Form 7 filer)
- `29`: Electioneering Communication disbursement or obligation
- `19`: Electioneering communication donation received

### Party Codes
- `DEM`: Democratic Party
- `REP`: Republican Party
- `IND`: Independent
- `LIB`: Libertarian Party
- `GRE`: Green Party
- `NON`: Non-partisan

## Data Quality Considerations

### 1. File Year
All tables include a `file_year` field that represents the election cycle. This allows:
- Loading multiple election cycles in the same database
- Filtering queries by specific years
- Cross-cycle analysis

### 2. Missing Data
- Some fields may be NULL for various reasons
- Transaction amounts are numeric and may be 0
- Dates are stored as strings in various formats

### 3. CRP Mapping Coverage
- Not all FEC candidates have CRP IDs
- Party codes may differ between FEC and CRP data
- CRP mapping is static and updated periodically

## Performance Considerations

### 1. Indexes
The schema includes indexes on:
- `candidate_master(cand_id, file_year)`
- `committee_master(cmte_id, file_year)`
- `individual_contributions(sub_id, file_year)`
- `crp_fec_mapping(fec_candidate_id)`
- `crp_fec_mapping(crp_id)`

### 2. Large Tables
- `individual_contributions` can be very large (millions of records)
- Consider filtering by `file_year` and `cmte_id` for performance
- Use appropriate WHERE clauses to limit result sets

### 3. Joins
- Always join on both the ID and `file_year` for temporal consistency
- Use appropriate indexes for join performance
- Consider materialized views for complex aggregations

## Usage Examples for AI Projects

### 1. Campaign Finance Analysis
```sql
-- Analyze contribution patterns by employer
SELECT 
    employer,
    COUNT(*) as contributor_count,
    SUM(transaction_amt) as total_amount
FROM individual_contributions
WHERE file_year = 2022 
    AND employer IS NOT NULL
GROUP BY employer
ORDER BY total_amount DESC
LIMIT 50;
```

### 2. Candidate Comparison
```sql
-- Compare candidates in same district
SELECT 
    cand_name,
    cand_pty_affiliation,
    ttl_receipts,
    ttl_indiv_contrib,
    coh_cop
FROM candidate_summary cs
JOIN candidate_master cm ON cs.cand_id = cm.cand_id 
    AND cs.file_year = cm.file_year
WHERE cm.cand_office_st = 'CA' 
    AND cm.cand_office_district = '12'
    AND cm.file_year = 2022;
```

### 3. Committee Network Analysis
```sql
-- Find committees that contribute to multiple candidates
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

## Special Interest Money and Spending Analysis

### 1. Independent Expenditures (Outside Spending)
Independent expenditures are communications that expressly advocate for or against a candidate but are not coordinated with any candidate or party.

**Key Transaction Types:**
- `24A`: Independent expenditure opposing election of candidate
- `24E`: Independent expenditure advocating election of candidate

**Analysis Query:**
```sql
-- Independent expenditures by committee type
SELECT 
    cm.cmte_nm,
    cm.cmte_tp,
    SUM(CASE WHEN ccc.transaction_tp = '24A' THEN ccc.transaction_amt ELSE 0 END) as against_candidate,
    SUM(CASE WHEN ccc.transaction_tp = '24E' THEN ccc.transaction_amt ELSE 0 END) as for_candidate,
    ccc.cand_id
FROM committee_candidate_contributions ccc
JOIN committee_master cm ON ccc.cmte_id = cm.cmte_id 
    AND ccc.file_year = cm.file_year
WHERE ccc.file_year = 2022 
    AND ccc.transaction_tp IN ('24A', '24E')
GROUP BY cm.cmte_nm, cm.cmte_tp, ccc.cand_id
ORDER BY (against_candidate + for_candidate) DESC;
```

### 2. Coordinated Party Expenditures
Coordinated expenditures are made by political parties in coordination with candidates.

**Key Transaction Type:**
- `24C`: Coordinated party expenditure

**Analysis Query:**
```sql
-- Coordinated party expenditures
SELECT 
    cm.cmte_nm,
    cm.cmte_pty_affiliation,
    SUM(ccc.transaction_amt) as coordinated_spending,
    ccc.cand_id
FROM committee_candidate_contributions ccc
JOIN committee_master cm ON ccc.cmte_id = cm.cmte_id 
    AND ccc.file_year = cm.file_year
WHERE ccc.file_year = 2022 
    AND ccc.transaction_tp = '24C'
GROUP BY cm.cmte_nm, cm.cmte_pty_affiliation, ccc.cand_id
ORDER BY coordinated_spending DESC;
```

### 3. Electioneering Communications
Electioneering communications are broadcast communications that refer to a clearly identified candidate within 30 days of a primary or 60 days of a general election.

**Key Transaction Types:**
- `29`: Electioneering Communication disbursement or obligation
- `19`: Electioneering communication donation received

**Analysis Query:**
```sql
-- Electioneering communications by committee
SELECT 
    cm.cmte_nm,
    cm.cmte_tp,
    SUM(ccc.transaction_amt) as electioneering_spending
FROM committee_candidate_contributions ccc
JOIN committee_master cm ON ccc.cmte_id = cm.cmte_id 
    AND ccc.file_year = cm.file_year
WHERE ccc.file_year = 2022 
    AND ccc.transaction_tp = '29'
GROUP BY cm.cmte_nm, cm.cmte_tp
ORDER BY electioneering_spending DESC;
```

### 4. Super PAC Analysis
Super PACs (committee type 'O') can raise unlimited funds but cannot coordinate with candidates.

**Analysis Query:**
```sql
-- Super PAC independent expenditures
SELECT 
    cm.cmte_nm,
    SUM(CASE WHEN ccc.transaction_tp = '24A' THEN ccc.transaction_amt ELSE 0 END) as against_spending,
    SUM(CASE WHEN ccc.transaction_tp = '24E' THEN ccc.transaction_amt ELSE 0 END) as for_spending,
    COUNT(DISTINCT ccc.cand_id) as candidates_targeted
FROM committee_candidate_contributions ccc
JOIN committee_master cm ON ccc.cmte_id = cm.cmte_id 
    AND ccc.file_year = cm.file_year
WHERE ccc.file_year = 2022 
    AND cm.cmte_tp = 'O'
    AND ccc.transaction_tp IN ('24A', '24E')
GROUP BY cm.cmte_nm
ORDER BY (against_spending + for_spending) DESC;
```

### 5. Corporate and Union Spending
Corporations and unions can make communication costs (committee type 'C') and electioneering communications.

**Analysis Query:**
```sql
-- Corporate/union spending patterns
SELECT 
    cm.cmte_nm,
    cm.org_tp,
    SUM(CASE WHEN ccc.transaction_tp = '24F' THEN ccc.transaction_amt ELSE 0 END) as communication_costs,
    SUM(CASE WHEN ccc.transaction_tp = '29' THEN ccc.transaction_amt ELSE 0 END) as electioneering_spending
FROM committee_candidate_contributions ccc
JOIN committee_master cm ON ccc.cmte_id = cm.cmte_id 
    AND ccc.file_year = cm.file_year
WHERE ccc.file_year = 2022 
    AND cm.cmte_tp = 'C'
    AND ccc.transaction_tp IN ('24F', '29')
GROUP BY cm.cmte_nm, cm.org_tp
ORDER BY (communication_costs + electioneering_spending) DESC;
```

### 6. Comprehensive Spending Analysis
To get a complete picture of all spending for/against a candidate:

**Analysis Query:**
```sql
-- Total spending for/against candidates
SELECT 
    cand.cand_name,
    cand.cand_office,
    cand.cand_office_st,
    -- Direct contributions
    SUM(CASE WHEN ccc.transaction_tp NOT IN ('24A', '24E', '24C', '29') THEN ccc.transaction_amt ELSE 0 END) as direct_contributions,
    -- Independent expenditures for
    SUM(CASE WHEN ccc.transaction_tp = '24E' THEN ccc.transaction_amt ELSE 0 END) as independent_for,
    -- Independent expenditures against
    SUM(CASE WHEN ccc.transaction_tp = '24A' THEN ccc.transaction_amt ELSE 0 END) as independent_against,
    -- Coordinated party spending
    SUM(CASE WHEN ccc.transaction_tp = '24C' THEN ccc.transaction_amt ELSE 0 END) as coordinated_spending,
    -- Electioneering communications
    SUM(CASE WHEN ccc.transaction_tp = '29' THEN ccc.transaction_amt ELSE 0 END) as electioneering_spending
FROM committee_candidate_contributions ccc
JOIN candidate_master cand ON ccc.cand_id = cand.cand_id 
    AND ccc.file_year = cand.file_year
WHERE ccc.file_year = 2022
GROUP BY cand.cand_name, cand.cand_office, cand.cand_office_st
ORDER BY (independent_for + independent_against + coordinated_spending + electioneering_spending) DESC;
```

### 7. CRP Integration for Special Interest Analysis
Combine FEC data with CRP data to identify special interest groups:

**Analysis Query:**
```sql
-- Special interest spending with CRP data
SELECT 
    cfm.crp_name,
    cfm.party,
    cand.cand_name,
    SUM(CASE WHEN ccc.transaction_tp = '24A' THEN ccc.transaction_amt ELSE 0 END) as independent_against,
    SUM(CASE WHEN ccc.transaction_tp = '24E' THEN ccc.transaction_amt ELSE 0 END) as independent_for,
    cm.cmte_nm as spending_committee,
    cm.cmte_tp as committee_type
FROM crp_fec_mapping cfm
JOIN candidate_master cand ON cfm.fec_candidate_id = cand.cand_id
JOIN committee_candidate_contributions ccc ON cand.cand_id = ccc.cand_id 
    AND cand.file_year = ccc.file_year
JOIN committee_master cm ON ccc.cmte_id = cm.cmte_id 
    AND ccc.file_year = cm.file_year
WHERE ccc.file_year = 2022 
    AND ccc.transaction_tp IN ('24A', '24E')
GROUP BY cfm.crp_name, cfm.party, cand.cand_name, cm.cmte_nm, cm.cmte_tp
ORDER BY (independent_against + independent_for) DESC;
```

This schema provides a comprehensive foundation for analyzing federal campaign finance data, with the CRP mapping enabling cross-platform analysis with OpenSecrets.org data. The spending analysis patterns above enable researchers to identify and track special interest money and outside spending in federal elections. 