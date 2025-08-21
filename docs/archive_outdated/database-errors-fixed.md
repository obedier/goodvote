# Database Errors Fixed

## Issues Identified
The application was experiencing database errors due to two main issues:

1. **ILIKE ANY() syntax**: The use of `ILIKE ANY()` syntax in PostgreSQL queries, which is not supported in all PostgreSQL versions.

2. **Missing table reference**: The code was referencing a non-existent `independent_expenditures` table, when independent expenditures are actually stored in the `committee_candidate_contributions` table.

## Root Cause
The Israel lobby scoring system had two main issues:

1. **ILIKE ANY() syntax**: Using `ILIKE ANY($4)` syntax in several queries:
   - PAC contributions query
   - SuperPAC expenditures query  
   - Overview statistics query
   - Top PACs query
   This syntax was causing "syntax error at end of input" errors.

2. **Incorrect table reference**: The SuperPAC expenditures query was referencing `independent_expenditures` table which doesn't exist. Independent expenditures are actually stored in the `committee_candidate_contributions` table with transaction types like '24A', '24E', '24F', etc.

## Solution Implemented
Two main fixes were implemented:

### 1. Fixed ILIKE ANY() syntax
Replaced all instances of `ILIKE ANY($4)` with explicit `ILIKE` conditions using `OR` operators:

**Before:**
```sql
AND (
  cc.cmte_id = ANY($3) OR
  cm.cmte_nm ILIKE ANY($4)
)
```

**After:**
```sql
AND (
  cc.cmte_id = ANY($3) OR
  (cm.cmte_nm ILIKE '%AIPAC%' OR cm.cmte_nm ILIKE '%NORPAC%' OR cm.cmte_nm ILIKE '%Pro-Israel America%' OR cm.cmte_nm ILIKE '%Republican Jewish Coalition%' OR cm.cmte_nm ILIKE '%U.S. Israel PAC%' OR cm.cmte_nm ILIKE '%USI PAC%' OR cm.cmte_nm ILIKE '%JACPAC%' OR cm.cmte_nm ILIKE '%ZOA%' OR cm.cmte_nm ILIKE '%Zionist Organization of America%' OR cm.cmte_nm ILIKE '%Israel PAC%' OR cm.cmte_nm ILIKE '%Jewish PAC%' OR cm.cmte_nm ILIKE '%American Israel%' OR cm.cmte_nm ILIKE '%Israel America%' OR cm.cmte_nm ILIKE '%United Democracy Project%' OR cm.cmte_nm ILIKE '%UDP%')
)
```

### 2. Fixed table reference for independent expenditures
Updated the SuperPAC expenditures query to use the correct table and structure:

**Before:**
```sql
FROM independent_expenditures ie
JOIN committee_master cm ON ie.cmte_id = cm.cmte_id
WHERE ie.cand_id = $1
AND ie.file_year = $2
AND ie.exp_amt > 0
```

**After:**
```sql
FROM committee_candidate_contributions cc
JOIN committee_master cm ON cc.cmte_id = cm.cmte_id
WHERE cc.cand_id = $1
AND cc.file_year = $2
AND cc.transaction_amt != 0
AND cc.transaction_tp IN ('24A', '24E', '24F', '24K', '24N', '24P', '24R', '24Z')
```

## Files Modified
1. `src/lib/israel-lobby.ts` - Fixed 4 queries:
   - PAC contributions query (fixed ILIKE ANY syntax)
   - SuperPAC expenditures query (fixed table reference and ILIKE ANY syntax)
   - Overview statistics query (fixed ILIKE ANY syntax)
   - Top PACs query (fixed ILIKE ANY syntax)
   - Updated data processing logic to handle new structure

## Testing Results
- ✅ Database connection successful
- ✅ Fixed query syntax works correctly
- ✅ Israel lobby API returns data without errors
- ✅ Humanity score feature working properly
- ✅ All API endpoints functioning correctly

## Impact
- Resolved database query errors
- Improved application stability
- Ensured compatibility across different PostgreSQL versions
- Maintained all existing functionality while fixing the syntax issues
- Enhanced humanity score system with historical pattern analysis

## Additional Enhancements
After fixing the database errors, the humanity score system was enhanced with sophisticated historical analysis:

### Enhanced Scoring Logic
- **Rule 1**: Historical funding limits score to 4 maximum
- **Rule 2**: Electoral success with funding limits score to 3 maximum  
- **Rule 3**: Multiple election cycles limits score to 2 maximum
- **Rule 4**: Multiple elections + recent win limits score to 1 maximum
- **Rule 5**: Current election funding results in score of 0

### Benefits
- More nuanced assessment of Israel lobby relationships
- Considers historical patterns and electoral success
- Distinguishes between current and past relationships
- Provides more accurate scoring than simple A-F grades

The application is now running without database errors and features an enhanced humanity score system that provides sophisticated analysis of candidate relationships with Israel lobby interests. 