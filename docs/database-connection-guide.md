# Database Connection Guide

## Overview

This project uses **TWO separate PostgreSQL databases**:

1. **goodvote** database (default, `useFECDatabase: false`)
2. **fec_gold** database (`useFECDatabase: true`)

## Database Contents

### goodvote Database (`useFECDatabase: false`)
- **Purpose**: Application data, user preferences, cached results
- **Tables**: 
  - `congress_members_119th` - Current Congress members
  - `persons` - Person mapping and profiles
  - `person_candidates` - Links persons to FEC candidates
  - User preferences, cached summaries, etc.

### fec_gold Database (`useFECDatabase: true`)
- **Purpose**: All FEC (Federal Election Commission) raw data
- **Tables**:
  - `candidate_master` - All FEC candidates
  - `committee_master` - All FEC committees
  - `committee_candidate_contributions` - PAC contributions and independent expenditures
  - `individual_contributions` - Individual donor contributions
  - `operating_expenditures` - Committee spending
  - `committee_transactions` - Committee-to-committee transactions
  - `pac_summary` - PAC financial summaries
  - `candidate_summary` - Candidate financial summaries
  - `house_senate_current_campaigns` - Current campaign committees

## When to Use Which Database

### Use `useFECDatabase: false` (goodvote) for:
- ✅ Congress members list
- ✅ Person profiles and mapping
- ✅ User preferences
- ✅ Application state
- ✅ Cached summaries
- ✅ Person-candidate linkages

### Use `useFECDatabase: true` (fec_gold) for:
- ✅ All campaign finance data
- ✅ Candidate information
- ✅ Committee information
- ✅ Contributions (individual and PAC)
- ✅ Expenditures
- ✅ Israel lobby analysis
- ✅ Financial summaries
- ✅ Any FEC-related queries

## Quick Decision Tree

```
Is the query about:
├── Campaign finance data? → useFECDatabase: true
├── Contributions/expenditures? → useFECDatabase: true
├── Candidates/committees? → useFECDatabase: true
├── Israel lobby analysis? → useFECDatabase: true
├── Congress members? → useFECDatabase: false
├── Person profiles? → useFECDatabase: false
└── Application data? → useFECDatabase: false
```

## Common Patterns

### FEC Data Queries (use `useFECDatabase: true`)
```typescript
// Candidate data
const result = await executeQuery(candidateQuery, params, true);

// Contributions
const result = await executeQuery(contributionsQuery, params, true);

// Israel lobby analysis
const result = await executeQuery(israelQuery, params, true);

// Committee data
const result = await executeQuery(committeeQuery, params, true);
```

### Application Data Queries (use `useFECDatabase: false`)
```typescript
// Congress members
const result = await executeQuery(congressQuery, params, false);

// Person profiles
const result = await executeQuery(personQuery, params, false);

// User preferences
const result = await executeQuery(preferencesQuery, params, false);
```

## Debugging Database Issues

### Check Which Database You're Connected To
The `executeQuery` function now logs database selection in development:
```
🔍 Database Query: fec_gold - SELECT * FROM candidate_master...
🔍 Database Query: goodvote - SELECT * FROM congress_members_119th...
```

### Common Mistakes to Avoid
1. ❌ Querying `candidate_master` with `useFECDatabase: false`
2. ❌ Querying `congress_members_119th` with `useFECDatabase: true`
3. ❌ Querying `committee_candidate_contributions` with `useFECDatabase: false`
4. ❌ Querying `persons` with `useFECDatabase: true`

### Testing Database Connections
Use the test endpoint to verify database connections:
```bash
# Test FEC database
curl "http://localhost:3000/api/test-schema?db=fec"

# Test goodvote database  
curl "http://localhost:3000/api/test-schema?db=goodvote"
```

## Table Reference Guide

| Table | Database | useFECDatabase | Purpose |
|-------|----------|----------------|---------|
| `candidate_master` | fec_gold | `true` | FEC candidate data |
| `committee_master` | fec_gold | `true` | FEC committee data |
| `committee_candidate_contributions` | fec_gold | `true` | PAC contributions, independent expenditures |
| `individual_contributions` | fec_gold | `true` | Individual donor contributions |
| `operating_expenditures` | fec_gold | `true` | Committee spending |
| `congress_members_119th` | goodvote | `false` | Current Congress members |
| `persons` | goodvote | `false` | Person profiles and mapping |
| `person_candidates` | goodvote | `false` | Links persons to FEC candidates |

## Best Practices

1. **Always check the table you're querying** - if it's an FEC table, use `useFECDatabase: true`
2. **Use the decision tree above** for quick reference
3. **Add comments** in your code to document which database you're using
4. **Test your queries** with the test endpoint if unsure
5. **Check the logs** in development to verify database selection

## Example Implementation

```typescript
// ✅ Correct: FEC data query
const candidateResult = await executeQuery(
  'SELECT * FROM candidate_master WHERE cand_id = $1',
  [candidateId],
  true // Use FEC database
);

// ✅ Correct: Application data query  
const congressResult = await executeQuery(
  'SELECT * FROM congress_members_119th WHERE state = $1',
  [state],
  false // Use goodvote database
);

// ❌ Wrong: FEC table with wrong database
const wrongResult = await executeQuery(
  'SELECT * FROM candidate_master WHERE cand_id = $1',
  [candidateId],
  false // Should be true!
);
```

## Troubleshooting

If you get errors like:
- `relation "table_name" does not exist`
- `column "column_name" does not exist`

Check:
1. Are you using the correct `useFECDatabase` flag?
2. Does the table exist in the database you're connected to?
3. Are you using the correct column names for that database?

Use the test endpoint to verify table existence:
```bash
curl "http://localhost:3000/api/test-schema?table=candidate_master&db=fec"
``` 