# Humanity Score Implementation

## Overview
The humanity score feature has been successfully implemented to replace the A-F grade system with a 0-5 numerical scale and color gradient system for Israel lobby support analysis.

## Key Changes Made

### 1. Updated Israel Lobby Scoring System (`src/lib/israel-lobby.ts`)
- Added `humanity_score: number` field to the `IsraelLobbyScore` interface
- Implemented scoring logic that inverts the lobby score:
  - 0 = Most pro-Israel (worst humanity score, red)
  - 5 = Least pro-Israel (best humanity score, green)
  - Grade A (80-100) → Humanity Score 0
  - Grade B (60-79) → Humanity Score 1
  - Grade C (40-59) → Humanity Score 2
  - Grade D (1-39) → Humanity Score 3
  - Grade F (0) → Humanity Score 5

### 2. Updated Israel Lobby Page (`src/app/israel-lobby/[personId]/page.tsx`)
- Added `humanity_score` field to the interface
- Created `getHumanityScoreColor()` function with color gradient:
  - 0: Red (worst)
  - 1: Orange
  - 2: Yellow
  - 3: Blue
  - 4: Green
  - 5: Dark Green (best)
- Updated score display to prominently show the humanity score in a circular badge
- Added funding amount display alongside the score

### 3. Updated Candidate API (`src/app/api/candidates/[personId]/route.ts`)
- Added import for `getIsraelLobbyScore` function
- Added Israel lobby data fetching with timeout handling
- Included `israel_lobby` data in the API response

### 4. Updated Candidate Page (`src/app/candidates/[personId]/page.tsx`)
- Added `IsraelLobbyData` interface with humanity score field
- Added `getHumanityScoreColor()` function for color coding
- Updated the main candidate header to display humanity score prominently
- Shows both the numerical score and funding amount on the main name card

## Color Gradient System
The humanity score uses a color gradient where:
- **0 (Red)**: High pro-Israel support (worst humanity score)
- **1 (Orange)**: Moderate pro-Israel support
- **2 (Yellow)**: Low pro-Israel support
- **3 (Blue)**: Very low pro-Israel support
- **4 (Green)**: Minimal pro-Israel support
- **5 (Dark Green)**: No pro-Israel support (best humanity score)

## Testing Results
The implementation has been tested and verified to work correctly:
- API returns humanity score: 5 for candidates with no pro-Israel support
- Color coding works as expected
- Both the dedicated Israel lobby page and main candidate page display the score
- Funding amounts are displayed alongside the scores

## Usage
The humanity score is now displayed on:
1. **Main candidate name card**: Shows the score prominently with color coding and funding amount
2. **Israel lobby analysis page**: Shows detailed breakdown with the score as the primary metric
3. **API responses**: Includes the humanity score in candidate data

The feature successfully replaces the A-F grade system with a more intuitive 0-5 numerical scale that clearly indicates the level of pro-Israel support, with appropriate color coding for quick visual assessment. 