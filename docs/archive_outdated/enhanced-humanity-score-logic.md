# Enhanced Humanity Score Logic

## Overview
The humanity score has been enhanced to consider historical patterns of Israel lobby funding and electoral success, providing a more nuanced assessment of a candidate's relationship with pro-Israel interests. **The humanity score is a constant for each candidate based on their historical relationship with Israel lobby funding, regardless of which election cycle is selected.**

## Scoring Rules (0-5 Scale, 0=Worst, 5=Best)

### Rule 1: Historical Funding
**If a candidate has ever received funding from Israel lobby, they should at most a 4**
- Applies to any candidate who has received pro-Israel contributions in any election cycle
- Prevents candidates from getting a "perfect" score (5) if they have any history of Israel lobby support

### Rule 2: Single Election Win with Funding
**If a candidate has received funding in 1 election cycle and won, score is at most a 3**
- Applies when a candidate received pro-Israel funding in exactly one election cycle and won
- Indicates the candidate has proven they can win with Israel lobby support

### Rule 3: Multiple Election Cycles
**If a candidate has received funding in multiple election cycles, one most being recent, score is at most a 2**
- Applies when a candidate has received pro-Israel funding across multiple election cycles
- Shows a consistent pattern of Israel lobby support

### Rule 4: Multiple Elections + Win
**If a candidate has received funding in multiple election cycles and won, score is at most a 1**
- Applies when a candidate has both historical funding across multiple cycles and electoral success
- Indicates a strong, proven relationship with Israel lobby

### Rule 5: Most Recent Election Funding
**If a candidate has received funding in the most recent election cycle they are a 0**
- Applies when a candidate has received pro-Israel funding in their most recent election cycle (regardless of which election year is being viewed)
- Represents the most active relationship with Israel lobby
- **This score remains constant across all election year selections**

## Implementation Details

### Historical Data Collection
The system now tracks:
- All election years where a candidate received pro-Israel funding
- Whether the candidate has won any elections
- Whether the candidate won their most recent election
- The most recent election year with pro-Israel funding

### Scoring Logic
```typescript
// Start with best possible score
let humanityScore = 5;

     if (hasEverReceivedFunding) {
       // Rule 1: At most 4
       humanityScore = Math.min(humanityScore, 4);
       
       // Check if candidate has won any election with funding
       const hasWonWithFunding = hasWonElection;
       
       if (hasWonWithFunding && singleElectionCycle) {
         // Rule 2: At most 3
         humanityScore = Math.min(humanityScore, 3);
       }
       
       if (multipleElectionCycles) {
         // Rule 3: At most 2
         humanityScore = Math.min(humanityScore, 2);
         
         if (hasWonWithFunding) {
           // Rule 4: At most 1
           humanityScore = Math.min(humanityScore, 1);
         }
       }
       
       // Rule 5: Most recent election funding = 0
       if (currentElectionIsMostRecent) {
         humanityScore = 0;
       }
     }
```

## Test Cases

### George Latimer (PFBE2320B)
- **2024 Election**: `humanity_score: 0` (Rule 5 - funding in most recent election cycle)
- **2026 Election**: `humanity_score: 0` (Rule 5 - funding in most recent election cycle)
- **Any Election Year**: `humanity_score: 0` (Constant based on historical relationship)

### John Gonzales (P265F290D)
- **2024 Election**: `humanity_score: 5` (No historical funding)
- **2026 Election**: `humanity_score: 5` (No historical funding)
- **Any Election Year**: `humanity_score: 5` (Constant based on historical relationship)

## Benefits

1. **Historical Context**: Considers a candidate's full relationship with Israel lobby
2. **Electoral Impact**: Weights successful elections with Israel lobby support more heavily
3. **Pattern Recognition**: Identifies candidates with consistent pro-Israel support
4. **Current vs Historical**: Distinguishes between past and present relationships
5. **Nuanced Assessment**: Provides more granular scoring than simple A-F grades
6. **Consistent Scoring**: Humanity score remains constant regardless of which election cycle is selected
7. **Reliable Assessment**: Provides a stable measure of a candidate's relationship with Israel lobby interests

## Database Queries

The enhanced system uses additional queries to gather historical data:
- Cross-references `committee_candidate_contributions` with `person_candidates`
- Tracks funding across multiple election cycles
- Determines electoral success from candidate records
- Identifies the most recent election with pro-Israel funding

This provides a much more sophisticated and accurate assessment of a candidate's relationship with Israel lobby interests. 