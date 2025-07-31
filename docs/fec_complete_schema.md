# FEC Complete Database Schema Documentation

## Overview
The `fec_complete` database contains Federal Election Commission (FEC) bulk data for campaign finance analysis. This database serves as the authoritative source for all FEC data and is treated as READ-ONLY for analysis purposes.

## Database Information
- **Database Name**: `fec_complete`
- **Purpose**: Store and organize FEC bulk data for campaign finance analysis
- **Access Level**: READ-ONLY (analysis only)
- **Data Cycles**: 2020, 2022, 2024 (and potentially other cycles)

## Tables

### 1. candidate_master
**Purpose**: Master list of all candidates who have filed with the FEC

**Key Columns**:
- `candidate_id` (VARCHAR) - Unique FEC candidate identifier
- `candidate_name` (VARCHAR) - Full name of the candidate
- `party` (VARCHAR) - Political party affiliation
- `state` (VARCHAR) - State abbreviation
- `district` (VARCHAR) - Congressional district number
- `office` (VARCHAR) - Office sought (H for House, S for Senate, P for President)
- `election_year` (INTEGER) - Year of the election
- `incumbent_challenge` (VARCHAR) - I=Incumbent, C=Challenger, O=Open Seat

**Data Source**: FEC `cn.txt` files
**Record Count**: Varies by cycle (typically 10,000+ candidates per cycle)

### 2. committee_master
**Purpose**: Master list of all committees (PACs, campaigns, parties) that have filed with the FEC

**Key Columns**:
- `committee_id` (VARCHAR) - Unique FEC committee identifier
- `committee_name` (VARCHAR) - Full name of the committee
- `committee_type` (VARCHAR) - Type of committee (PAC, Party, Campaign, etc.)
- `committee_designation` (VARCHAR) - Primary, Secondary, etc.
- `committee_party` (VARCHAR) - Political party affiliation
- `state` (VARCHAR) - State abbreviation
- `election_year` (INTEGER) - Year of the election

**Data Source**: FEC `cm.txt` files
**Record Count**: Varies by cycle (typically 50,000+ committees per cycle)

### 3. individual_contributions
**Purpose**: All individual contributions to candidates and committees

**Key Columns**:
- `committee_id` (VARCHAR) - Receiving committee
- `candidate_id` (VARCHAR) - Receiving candidate (if applicable)
- `contributor_name` (VARCHAR) - Name of individual contributor
- `contributor_city` (VARCHAR) - City of contributor
- `contributor_state` (VARCHAR) - State of contributor
- `contributor_zip` (VARCHAR) - ZIP code of contributor
- `contribution_amount` (NUMERIC) - Amount of contribution
- `contribution_date` (DATE) - Date of contribution
- `election_year` (INTEGER) - Year of the election

**Data Source**: FEC `itcont.txt` files
**Record Count**: Millions of records per cycle

### 4. operating_expenditures
**Purpose**: All operating expenditures by committees

**Key Columns**:
- `committee_id` (VARCHAR) - Spending committee
- `candidate_id` (VARCHAR) - Related candidate (if applicable)
- `payee_name` (VARCHAR) - Name of payee
- `payee_city` (VARCHAR) - City of payee
- `payee_state` (VARCHAR) - State of payee
- `expenditure_amount` (NUMERIC) - Amount of expenditure
- `expenditure_date` (DATE) - Date of expenditure
- `expenditure_purpose` (VARCHAR) - Purpose of expenditure
- `election_year` (INTEGER) - Year of the election

**Data Source**: FEC `itoth.txt` files
**Record Count**: Hundreds of thousands of records per cycle

### 5. committee_transactions
**Purpose**: All committee-to-committee transactions

**Key Columns**:
- `committee_id` (VARCHAR) - Receiving committee
- `other_committee_id` (VARCHAR) - Contributing committee
- `transaction_amount` (NUMERIC) - Amount of transaction
- `transaction_date` (DATE) - Date of transaction
- `transaction_type` (VARCHAR) - Type of transaction
- `election_year` (INTEGER) - Year of the election

**Data Source**: FEC `pas2.txt` files
**Record Count**: Hundreds of thousands of records per cycle

### 6. candidate_committee_linkages
**Purpose**: Links candidates to their authorized committees

**Key Columns**:
- `candidate_id` (VARCHAR) - FEC candidate identifier
- `committee_id` (VARCHAR) - FEC committee identifier
- `linkage_type` (VARCHAR) - Type of linkage
- `election_year` (INTEGER) - Year of the election

**Data Source**: FEC `ccl.txt` files
**Record Count**: Thousands of records per cycle

### 7. pac_summary
**Purpose**: Summary financial data for PACs

**Key Columns**:
- `committee_id` (VARCHAR) - FEC committee identifier
- `committee_name` (VARCHAR) - Name of PAC
- `total_receipts` (NUMERIC) - Total receipts
- `total_disbursements` (NUMERIC) - Total disbursements
- `cash_on_hand` (NUMERIC) - Cash on hand
- `election_year` (INTEGER) - Year of the election

**Data Source**: FEC summary files
**Record Count**: Thousands of records per cycle

### 8. house_senate_current_campaigns
**Purpose**: Current campaign committees for House and Senate candidates

**Key Columns**:
- `candidate_id` (VARCHAR) - FEC candidate identifier
- `committee_id` (VARCHAR) - Campaign committee identifier
- `candidate_name` (VARCHAR) - Name of candidate
- `party` (VARCHAR) - Political party
- `state` (VARCHAR) - State abbreviation
- `district` (VARCHAR) - Congressional district
- `election_year` (INTEGER) - Year of the election

**Data Source**: FEC current campaign files
**Record Count**: Hundreds of records per cycle

## Data Relationships

### Primary Relationships
1. **Candidates ↔ Committees**: Through `candidate_committee_linkages`
2. **Contributions → Committees**: Through `committee_id` in `individual_contributions`
3. **Expenditures → Committees**: Through `committee_id` in `operating_expenditures`
4. **Transactions → Committees**: Through `committee_id` in `committee_transactions`

### Key Foreign Keys
- `individual_contributions.committee_id` → `committee_master.committee_id`
- `operating_expenditures.committee_id` → `committee_master.committee_id`
- `committee_transactions.committee_id` → `committee_master.committee_id`
- `candidate_committee_linkages.candidate_id` → `candidate_master.candidate_id`
- `candidate_committee_linkages.committee_id` → `committee_master.committee_id`

## Data Quality Notes

### Known Issues
1. **Name Variations**: Candidate and committee names may have slight variations across cycles
2. **Missing Data**: Some records may have incomplete information
3. **Data Lag**: FEC data is typically 30-60 days behind real-time
4. **Filing Deadlines**: Data availability depends on filing deadlines

### Data Validation
- All monetary amounts are stored as NUMERIC to preserve precision
- Dates are stored in DATE format for consistency
- ZIP codes are stored as VARCHAR to preserve leading zeros
- State codes are standardized to 2-letter abbreviations

## Usage Guidelines

### For Analysis
1. **Always filter by election_year** when querying to ensure data consistency
2. **Use candidate_committee_linkages** to properly link candidates to their committees
3. **Join with committee_master** to get committee names and types
4. **Consider data lag** when analyzing recent elections

### For Israel Lobby Analysis
1. **Focus on committee_master** to identify pro-Israel committees
2. **Use individual_contributions** to track PAC contributions
3. **Use operating_expenditures** to track independent expenditures
4. **Cross-reference with goodvote database** for analysis results

### Performance Considerations
1. **Index on election_year** for efficient filtering
2. **Index on committee_id** for committee-based queries
3. **Index on candidate_id** for candidate-based queries
4. **Use LIMIT clauses** for large result sets

## Cross-Database Integration

### Views in goodvote database
The following views are created in the `goodvote` database to access `fec_complete` data:

```sql
-- Access FEC contributions
CREATE VIEW fec_contributions AS
SELECT * FROM fec_complete.individual_contributions;

-- Access FEC committees
CREATE VIEW fec_committees AS
SELECT * FROM fec_complete.committee_master;

-- Access FEC candidates
CREATE VIEW fec_candidates AS
SELECT * FROM fec_complete.candidate_master;

-- Access FEC expenditures
CREATE VIEW fec_expenditures AS
SELECT * FROM fec_complete.operating_expenditures;

-- Access FEC committee transactions
CREATE VIEW fec_committee_transactions AS
SELECT * FROM fec_complete.committee_transactions;

-- Access FEC PAC summaries
CREATE VIEW fec_pac_summaries AS
SELECT * FROM fec_complete.pac_summary;
```

### Usage in Application
```sql
-- Example: Get all contributions to a specific candidate
SELECT ic.*, cm.committee_name
FROM fec_contributions ic
JOIN fec_committees cm ON ic.committee_id = cm.committee_id
WHERE ic.candidate_id = 'H8CA12345'
AND ic.election_year = 2024;

-- Example: Get all PAC contributions
SELECT ic.*, cm.committee_name, cm.committee_type
FROM fec_contributions ic
JOIN fec_committees cm ON ic.committee_id = cm.committee_id
WHERE cm.committee_type LIKE '%PAC%'
AND ic.election_year = 2024;
```

## Person-Based Mapping System

### Overview
The person-based mapping system addresses the fundamental challenge of FEC data being cycle-specific. Each candidate can have multiple FEC candidate IDs across different election cycles, making it difficult to track individuals over time. This system creates a unified person identifier that groups all FEC candidate records for the same individual.

### Purpose
- **Unified Person Tracking**: Group multiple FEC candidate IDs for the same person
- **Historical Analysis**: Track candidates across multiple election cycles
- **Eliminate Duplicates**: Present unique persons in user interfaces
- **Support Israel Lobby Analysis**: Enable person-based influence tracking

### Database Schema (goodvote database)

#### 1. persons
**Purpose**: Master table of unique persons identified from FEC candidate data

**Key Columns**:
- `person_id` (VARCHAR(10)) - Unique person identifier (format: P + 8-char hash)
- `normalized_name` (VARCHAR(200)) - Normalized name for matching
- `display_name` (VARCHAR(200)) - Human-readable display name
- `state` (VARCHAR(2)) - Primary state of residence
- `first_election_year` (INTEGER) - First election year
- `last_election_year` (INTEGER) - Most recent election year
- `total_elections` (INTEGER) - Number of election cycles
- `current_office` (VARCHAR(1)) - Current office (H/S/P)
- `current_district` (VARCHAR(2)) - Current district
- `current_party` (VARCHAR(3)) - Current party affiliation
- `bioguide_id` (VARCHAR(10)) - Congress.gov bioguide ID (if applicable)

**Record Count**: 24,721 unique persons (as of 2024)

#### 2. person_candidates
**Purpose**: Links persons to their FEC candidate records across all election cycles

**Key Columns**:
- `id` (SERIAL) - Primary key
- `person_id` (VARCHAR(10)) - References persons.person_id
- `cand_id` (VARCHAR(9)) - FEC candidate ID
- `election_year` (INTEGER) - Election year
- `office` (VARCHAR(1)) - Office sought (H/S/P)
- `district` (VARCHAR(2)) - District number
- `party` (VARCHAR(3)) - Party affiliation
- `incumbent_challenge` (VARCHAR(1)) - I=Incumbent, C=Challenger, O=Open
- `status` (VARCHAR(1)) - A=Active, I=Inactive

**Record Count**: 31,390 candidate-election records (as of 2024)

### Views for Application Use

#### 1. current_candidates
**Purpose**: Shows the most recent election for each person

```sql
CREATE VIEW current_candidates AS
SELECT 
  p.person_id,
  p.display_name,
  p.state,
  p.current_office,
  p.current_district,
  p.current_party,
  pc.cand_id,
  pc.election_year,
  pc.incumbent_challenge,
  p.total_elections
FROM persons p
JOIN person_candidates pc ON p.person_id = pc.person_id
WHERE pc.election_year = p.last_election_year;
```

#### 2. all_candidates
**Purpose**: Shows all election cycles for each person

```sql
CREATE VIEW all_candidates AS
SELECT 
  p.person_id,
  p.display_name,
  p.normalized_name,
  p.state,
  pc.office,
  pc.district,
  pc.party,
  pc.cand_id,
  pc.election_year,
  pc.incumbent_challenge,
  pc.status,
  p.total_elections
FROM persons p
JOIN person_candidates pc ON p.person_id = pc.person_id
ORDER BY p.display_name, pc.election_year;
```

### Name Normalization Algorithm

The system uses a sophisticated name normalization algorithm to group candidates:

1. **Remove Extra Spaces**: Convert multiple spaces to single space
2. **Convert to Uppercase**: Standardize case
3. **Remove Suffixes**: JR, SR, II, III, IV, PHD, MD, ESQ, CPA
4. **Remove Titles**: REP, SEN, GOV, MAYOR, DR, MR, MS, MRS
5. **Hash Generation**: Create deterministic person_id from normalized name + state

### Example: Ilhan Omar

**Person ID**: P84700297
**Display Name**: OMAR, ILHAN
**State**: MN
**Total Elections**: 5 (2018-2026)

**FEC Candidate Records**:
- H8MN05239 (2018) - Challenger
- H8MN05239 (2020) - Incumbent  
- H8MN05239 (2022) - Incumbent
- H8MN05239 (2024) - Incumbent
- H8MN05239 (2026) - Incumbent

### Usage Examples

#### Get Current Candidates
```sql
-- Get all current candidates
SELECT * FROM current_candidates 
WHERE state = 'MN' 
ORDER BY display_name;
```

#### Get Person History
```sql
-- Get all elections for a specific person
SELECT * FROM all_candidates 
WHERE person_id = 'P84700297' 
ORDER BY election_year;
```

#### Get Candidates by Office
```sql
-- Get all current House candidates
SELECT * FROM current_candidates 
WHERE current_office = 'H' 
ORDER BY state, current_district;
```

#### Link to FEC Data
```sql
-- Get contributions for a person across all elections
SELECT ic.*, pc.election_year, p.display_name
FROM fec_contributions ic
JOIN person_candidates pc ON ic.candidate_id = pc.cand_id
JOIN persons p ON pc.person_id = p.person_id
WHERE p.person_id = 'P84700297'
ORDER BY pc.election_year DESC;
```

### Benefits for Israel Lobby Analysis

1. **Unified Tracking**: Track influence on specific persons across multiple elections
2. **Historical Patterns**: Analyze how Israel lobby support changes over time
3. **Committee Linking**: Link all committees associated with a person
4. **Contribution Aggregation**: Sum contributions across all election cycles
5. **Voting Record Integration**: Link to congressional voting records via bioguide_id

### Data Quality Notes

- **Deduplication**: Handles duplicate FEC records automatically
- **Name Variations**: Normalizes slight name variations
- **Multi-Office Candidates**: Supports candidates running for multiple offices
- **State-Based Grouping**: Groups by state to avoid false matches

### Performance Considerations

- **Indexes**: Created on person_id, cand_id, election_year
- **Views**: Optimized for common query patterns
- **Caching**: Person data can be cached for UI performance
- **Scalability**: Supports millions of FEC records efficiently

## Maintenance Notes

### Data Updates
- FEC data is updated monthly
- New cycles are added as they become available
- Historical data is preserved for analysis

### Backup Strategy
- Database is backed up regularly
- Point-in-time recovery available
- Data integrity checks performed monthly

### Monitoring
- Query performance monitored
- Disk space usage tracked
- Connection limits enforced

## Contact Information
For questions about this database schema or data access, refer to the project documentation or contact the development team. 