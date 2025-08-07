# CRP to FEC Candidate ID Mapping

This document describes the `crp_fec_mapping` table that links Center for Responsive Politics (CRP) IDs to Federal Election Commission (FEC) Candidate IDs across multiple election cycles.

## Overview

The `crp_fec_mapping` table provides a bridge between OpenSecrets.org data (which uses CRP IDs) and FEC data (which uses FEC Candidate IDs). This table includes data from multiple election cycles (2000-2024) with one record per unique CRP ID, avoiding duplication while preserving cycle-specific information.

This allows researchers to:

- Link OpenSecrets.org candidate information with FEC contribution and expenditure data
- Compare candidate information between the two data sources
- Perform cross-platform analysis of campaign finance data
- Track candidates across multiple election cycles
- Analyze long-term campaign finance patterns

## Table Structure

```sql
CREATE TABLE crp_fec_mapping (
    crp_id varchar(20) NOT NULL,           -- CRP ID from opensecrets.org
    crp_name varchar(200),                 -- Candidate name as provided by CRP
    party varchar(10),                     -- Political party affiliation
    district_id varchar(10),               -- District identifier (e.g., CO07, VTS2)
    most_recent_fec_id varchar(20),       -- Most recent FEC Candidate ID
    cycles_appeared varchar(100),          -- Comma-separated list of cycles (e.g., "2018,2020,2022,2024")
    fec_ids_by_cycle text,                -- JSON object mapping cycles to FEC IDs
    total_cycles integer,                  -- Number of cycles this candidate appeared in
    PRIMARY KEY (crp_id)
);
```

## Data Source

The mapping data comes from `CRP_IDs.xls`, a file provided by the Center for Responsive Politics (OpenSecrets.org). This consolidated table includes data from multiple election cycles:

- **9,602 unique candidate mappings** across all cycles (2000-2024)
- **4,507 candidates** who appeared in multiple cycles
- **4,095 candidates** who appeared in only one cycle
- Coverage across all states and federal offices
- Both current and historical candidates
- Complete cycle tracking from 2000 to 2024

## Installation

### Prerequisites

1. PostgreSQL database with FEC data loaded
2. Python 3 with pandas and openpyxl installed

### Setup Steps

1. **Create the table:**
   ```bash
   psql -f sql/crp_fec_mapping.sql
   ```

2. **Load the data:**
   ```bash
   psql -c "\COPY crp_fec_mapping FROM 'crp_fec_mapping.csv' WITH (FORMAT csv, HEADER true, NULL '');"
   ```

## Usage Examples

### Basic Joins

Join with candidate master data using most recent FEC ID:
```sql
SELECT cfm.crp_name, cfm.party, cm.cand_name, cm.cand_office
FROM crp_fec_mapping cfm
JOIN candidate_master cm ON cfm.most_recent_fec_id = cm.cand_id
WHERE cm.file_year = 2022;
```

### Multi-Cycle Analysis

Find candidates who appeared in multiple cycles:
```sql
SELECT crp_name, party, cycles_appeared, total_cycles
FROM crp_fec_mapping 
WHERE total_cycles > 1 
ORDER BY total_cycles DESC;
```

### Contribution Analysis

Find candidates with CRP IDs who received contributions:
```sql
SELECT cfm.crp_name, SUM(ic.transaction_amt) as total_contributions
FROM crp_fec_mapping cfm
JOIN candidate_master cm ON cfm.most_recent_fec_id = cm.cand_id
JOIN individual_contributions ic ON cm.cand_id = ic.cand_id 
WHERE ic.file_year = 2022
GROUP BY cfm.crp_name
ORDER BY total_contributions DESC;
```

### Cycle-Specific Analysis

Find candidates who ran in specific cycles:
```sql
SELECT crp_name, party, cycles_appeared
FROM crp_fec_mapping 
WHERE cycles_appeared LIKE '%2020%' AND cycles_appeared LIKE '%2022%'
ORDER BY crp_name;
```

### Data Quality Checks

Compare party affiliations between CRP and FEC data:
```sql
SELECT cfm.crp_name, cfm.party as crp_party, cm.cand_pty_affiliation as fec_party
FROM crp_fec_mapping cfm
JOIN candidate_master cm ON cfm.most_recent_fec_id = cm.cand_id
WHERE cfm.party != cm.cand_pty_affiliation;
```

## Sample Queries

See `sql/sample_crp_fec_queries.sql` for comprehensive examples including:

1. Basic candidate information joins
2. Party affiliation comparisons
3. Contribution analysis
4. Expenditure analysis
5. Coverage statistics by state/office
6. Data quality validation

## Data Quality Notes

- **Party Codes**: CRP uses different party codes than FEC. CRP uses 'D', 'R', '3' (third party), while FEC uses more detailed codes.
- **Coverage**: Not all FEC candidates have CRP IDs, and not all CRP candidates have FEC IDs.
- **Updates**: The mapping file is updated periodically by OpenSecrets.org.

## Indexes

The table includes indexes for efficient querying:
- `idx_crp_fec_mapping_fec_id` on `most_recent_fec_id`
- `idx_crp_fec_mapping_crp_id` on `crp_id`
- `idx_crp_fec_mapping_cycles` on `cycles_appeared` (GIN index for array operations)

## Files Created

- `sql/crp_fec_mapping.sql` - Table definition with multi-cycle support
- `crp_fec_mapping.csv` - Mapping data (9,602 records across all cycles)
- `sql/sample_crp_fec_queries.sql` - Example queries
- `fec_gold_crp_mapping_readme.md` - This documentation

## Troubleshooting

### Common Issues

1. **PostgreSQL not running**: Ensure PostgreSQL is started before running the load script
2. **Permission errors**: Make sure the load script is executable: `chmod +x load_crp_mapping.sh`
3. **Data not loading**: Check that the CSV file exists and has proper formatting

### Data Validation

Run these queries to validate the data:

```sql
-- Check total count
SELECT COUNT(*) FROM crp_fec_mapping;

-- Check for multi-cycle candidates
SELECT total_cycles, COUNT(*) as candidate_count
FROM crp_fec_mapping 
GROUP BY total_cycles 
ORDER BY total_cycles;

-- Check coverage with existing FEC data
SELECT COUNT(DISTINCT cfm.most_recent_fec_id) as mapped_candidates,
       COUNT(DISTINCT cm.cand_id) as total_fec_candidates
FROM crp_fec_mapping cfm
RIGHT JOIN candidate_master cm ON cfm.most_recent_fec_id = cm.cand_id
WHERE cm.file_year = 2022;

-- Check cycle distribution
SELECT 
    CASE 
        WHEN cycles_appeared LIKE '%2024%' THEN '2024'
        WHEN cycles_appeared LIKE '%2022%' THEN '2022'
        WHEN cycles_appeared LIKE '%2020%' THEN '2020'
        WHEN cycles_appeared LIKE '%2018%' THEN '2018'
        ELSE 'Other'
    END as most_recent_cycle,
    COUNT(*) as candidate_count
FROM crp_fec_mapping 
GROUP BY most_recent_cycle
ORDER BY most_recent_cycle DESC;
```

## Support

For issues with the mapping data itself, contact OpenSecrets.org. For issues with the database implementation, refer to the main project documentation. 