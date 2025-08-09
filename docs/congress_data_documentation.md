# Congress Data Integration Documentation

## Overview

This project integrates data from the [unitedstates/congress-legislators](https://github.com/unitedstates/congress-legislators) GitHub repository to provide comprehensive information about current and historical members of Congress.

## Database Tables

### Core Tables (cng_ prefix)

#### `cng_legislators_current`
- **Purpose**: Current members of Congress (House and Senate)
- **Key Fields**: `bioguide_id`, `official_full`, `first_name`, `last_name`, `terms` (JSONB)
- **Terms Structure**: Array of term objects with `type`, `state`, `district`, `start`, `end`, `party`, etc.

#### `cng_legislators_historical`
- **Purpose**: Historical members of Congress
- **Structure**: Same as current, but for past members

#### `cng_committees_current`
- **Purpose**: Current congressional committees
- **Key Fields**: `thomas_id`, `name`, `chamber`, `type`, `congress`

#### `cng_committees_historical`
- **Purpose**: Historical congressional committees
- **Structure**: Same as current, but for past committees

#### `cng_committee_membership`
- **Purpose**: Links legislators to committees
- **Key Fields**: `committee_thomas_id`, `bioguide_id`, `role`, `title`, `rank`

#### `cng_executive`
- **Purpose**: Executive branch officials
- **Key Fields**: `bioguide_id`, `official_full`, `terms`

#### `cng_district_offices`
- **Purpose**: District office locations for representatives
- **Key Fields**: `bioguide_id`, `address`, `city`, `state`, `zip`, `phone`, `latitude`, `longitude`

#### `cng_social_media`
- **Purpose**: Social media accounts for legislators
- **Key Fields**: `bioguide_id`, `platform`, `url`

### District Mapping Tables

#### `cng_legislator_district`
- **Purpose**: Maps legislators to their districts with voting status
- **Key Fields**: 
  - `legislator_id` (references `cng_legislators_current.id`)
  - `state` (2-letter state code)
  - `district` (district number, 0 for at-large)
  - `voting` (boolean - true for voting representatives, false for non-voting delegates)
  - `created_at` (timestamp)

## Views

### `cng_district_mapping`
- **Purpose**: Complete view of all districts (filled and vacant)
- **Columns**: 
  - `representative` (name or 'VACANT')
  - `state` (2-letter state code)
  - `district` (district number)
  - `voting` (boolean)
  - `status` ('FILLED' or 'VACANT')
  - `previous_representative` (for vacant seats)

## Current Status (119th Congress)

### Representatives Summary
- **Total Voting Representatives**: 431 (should be 435)
- **Senators**: 100 ✓
- **Non-voting Delegates**: 6 ✓
- **At-large Representatives**: 6 ✓
- **Overall Accuracy**: 98.9% (537/541 members)

### Vacant Districts (4)
1. **AZ-07**: Raúl Grijalva (deceased - seat vacant)
2. **TX-18**: Sheila Jackson Lee (deceased - seat vacant)  
3. **TN-07**: Mark Green (resigned - seat vacant)
4. **VA-11**: Jennifer Wexton (resigned - seat vacant)

## Data Loading Scripts

### `load_congress_data.sh`
- **Purpose**: Main script to download and load congress data
- **Actions**:
  - Clones/updates congress-legislators repository
  - Creates all `cng_` tables
  - Calls Python script to parse and load data
  - Creates district mapping table and view

### `load_congress_data.py`
- **Purpose**: Python script to parse YAML files and load into PostgreSQL
- **Files Processed**:
  - `legislators-current.yaml`
  - `legislators-historical.yaml`
  - `committees-current.yaml`
  - `committees-historical.yaml`
  - `committee-membership-current.yaml`
  - `executive.yaml`
  - `legislators-district-offices.yaml`
  - `legislators-social-media.yaml`

### `update_congress_data.sh`
- **Purpose**: Script for automated updates via cron job
- **Actions**:
  - Pulls latest data from repository
  - Re-runs data loading process

## Sample Queries

### Find All Current Representatives
```sql
SELECT 
    official_full,
    t->>'state' as state,
    t->>'district' as district,
    t->>'type' as chamber
FROM cng_legislators_current,
     LATERAL jsonb_array_elements(terms) AS t
WHERE (t->>'end')::date >= CURRENT_DATE
ORDER BY state, (t->>'district')::int;
```

### Find Vacant Districts
```sql
SELECT * FROM cng_district_mapping 
WHERE status = 'VACANT'
ORDER BY state, district;
```

### Committee Membership
```sql
SELECT 
    lc.official_full,
    cc.name as committee_name,
    cm.role
FROM cng_committee_membership cm
JOIN cng_legislators_current lc ON cm.bioguide_id = lc.bioguide_id
JOIN cng_committees_current cc ON cm.committee_thomas_id = cc.thomas_id
ORDER BY cc.name, lc.official_full;
```

### District Offices
```sql
SELECT 
    lc.official_full,
    do.address,
    do.city,
    do.state,
    do.phone
FROM cng_district_offices do
JOIN cng_legislators_current lc ON do.bioguide_id = lc.bioguide_id
WHERE do.state = 'CA'
ORDER BY lc.official_full;
```

## Data Quality

### Validation Queries
- **House Count**: Should be 435 voting representatives
- **Senate Count**: Should be 100 senators
- **District Coverage**: All expected districts should be present
- **Committee Coverage**: All current committees should have members

### Known Issues
- 4 vacant districts due to deaths and resignations
- Some district offices may be missing for new representatives
- Social media accounts may not be complete

## Maintenance

### Regular Updates
- **Frequency**: Weekly recommended
- **Script**: `update_congress_data.sh`
- **Monitoring**: Check for new representatives and committee changes

### Data Validation
- **Script**: `fix_congress_data.sh`
- **Purpose**: Validates data completeness and reports issues
- **Output**: Generates reports on missing districts and data quality

## Integration with FEC Data

The congress data can be linked to FEC data using:
- `bioguide_id` (if available in FEC data)
- `official_full` name matching
- State and district combinations

This enables analysis of campaign finance data by congressional district and representative.

## File Structure

```
sql/
├── cng_legislator_district_mapping.sql    # District mapping table
├── cng_district_mapping_view.sql          # District mapping view
└── congress_sample_queries.sql            # Sample queries

docs/
├── congress_data_documentation.md         # This file
├── congress_cron_setup.md                 # Cron job setup
└── CONGRESS_INTEGRATION_SUMMARY.md        # Integration summary

scripts/
├── load_congress_data.sh                  # Main loading script
├── load_congress_data.py                  # Python parser
├── update_congress_data.sh                # Update script
└── fix_congress_data.sh                   # Validation script
```

## Future Enhancements

1. **Automated Monitoring**: Set up alerts for data quality issues
2. **Historical Analysis**: Expand historical data coverage
3. **API Integration**: Real-time updates from official sources
4. **Visualization**: Dashboard for congress data
5. **FEC Integration**: Direct linking with campaign finance data 