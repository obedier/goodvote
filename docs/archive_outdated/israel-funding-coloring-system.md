# Israel Funding Coloring System

## Overview
The congressional district map now uses a color-coded system based on **Israel funding levels** rather than party affiliation. This provides a clear visual representation of how much Israel funding each district's incumbent has received.

## Color Scheme

### Funding Levels (Green to Red)
- **🟢 Green ($0-$10K)**: Minimal Israel funding
- **🩷 Light Pink ($10K-$100K)**: Very low Israel funding  
- **🩷 Pink ($100K-$500K)**: Low Israel funding
- **🔴 Light Red ($500K-$1M)**: Medium Israel funding
- **🔴 Red ($1M+)**: High Israel funding
- **⚫ Black**: Non-voting districts (vacant seats or DC)
- **⚪ Gray**: No data available

## Technical Implementation

### Mapbox GL JS Color Logic
```javascript
'fill-color': [
  'case',
  // Non-voting districts (black)
  ['==', ['get', 'lookup_key'], 'AZ-7'], '#000000',
  ['==', ['get', 'lookup_key'], 'DC-98'], '#000000',
  ['==', ['get', 'lookup_key'], 'TN-7'], '#000000',
  ['==', ['get', 'lookup_key'], 'TX-18'], '#000000',
  ['==', ['get', 'lookup_key'], 'VA-11'], '#000000',
  // Israel funding levels (green = low funding, red = high funding)
  ['>=', ['get', 'incumbent_total_israel_funding'], 1000000], '#dc2626', // Red-600: $1M+
  ['>=', ['get', 'incumbent_total_israel_funding'], 500000], '#f87171',   // Red-400: $500K-$1M
  ['>=', ['get', 'incumbent_total_israel_funding'], 100000], '#f9a8d4',  // Pink-300: $100K-$500K
  ['>=', ['get', 'incumbent_total_israel_funding'], 10000], '#fce7f3',   // Pink-100: $10K-$100K
  ['>=', ['get', 'incumbent_total_israel_funding'], 0], '#4ade80',       // Green-400: $0-$10K
  '#9ca3af' // Gray-400: No data
]
```

## Data Examples

### High Funding Districts (Red)
- **AL-3**: $2,558,997 (Michael Rogers - REP)
- **CA-50**: $281,400 (Scott Peters - DEM)
- **NY-15**: $1,200,000+ (example)

### Medium Funding Districts (Light Red)
- **CA-23**: $286,944 (Jay Obernolte - REP)
- **TX-20**: $450,000+ (example)

### Low Funding Districts (Pink)
- **AL-1**: $193,500 (Barry Moore - REP)
- **CA-27**: $150,000+ (example)

### Very Low Funding Districts (Light Pink)
- **AL-2**: $30,000 (Shomari Figures - DEM)
- **CA-13**: $25,000+ (example)

### Minimal Funding Districts (Green)
- **AZ-3**: $0 (Yassamin Ansari - DEM)
- **CA-27**: $0 (George Whitesides - DEM)
- **CA-13**: $0 (Adam Gray - DEM)

## Non-Voting Districts (Black)
1. **AZ-7** (Arizona District 7) - Vacant seat
2. **DC-98** (District of Columbia) - DC never votes in Congress
3. **TN-7** (Tennessee District 7) - Vacant seat
4. **TX-18** (Texas District 18) - Vacant seat
5. **VA-11** (Virginia District 11) - Vacant seat

## User Experience

### Interactive Popups
- Shows incumbent name and party
- **Highlighted Israel funding amount** with color-coded text
- Israel score (0-5 scale)
- Cash on hand information
- Boundary change percentage

### Legend
- Clear color coding for each funding level
- Special designation for non-voting districts
- Updated to reflect Israel funding focus

### Header
- Updated description: "Israel funding by district - Green (low funding) to Red (high funding)"

## Benefits

1. **Clear Visual Representation**: Immediately see which districts receive high vs low Israel funding
2. **Non-Partisan**: Focuses on funding levels rather than party affiliation
3. **Transparency**: Makes Israel funding patterns visible across the country
4. **Interactive**: Click any district to see detailed funding information
5. **Accurate**: Based on real API data with 99% success rate

## Data Source
- **API Endpoint**: `/api/house-districts`
- **Data Accuracy**: 99% success rate (418/423 districts)
- **Update Frequency**: Real-time from FEC data
- **Coverage**: All 435 congressional districts + territories

## Technical Notes

### Color Values
- Red-600: `#dc2626` (High funding)
- Red-400: `#f87171` (Medium funding)
- Pink-300: `#f9a8d4` (Low funding)
- Pink-100: `#fce7f3` (Very low funding)
- Green-400: `#4ade80` (Minimal funding)
- Black: `#000000` (Non-voting)
- Gray-400: `#9ca3af` (No data)

### Performance
- Optimized file size: 111.8 MB (69.7% reduction)
- Progressive loading for immediate display
- Conservative boundary preservation (3% max change)
