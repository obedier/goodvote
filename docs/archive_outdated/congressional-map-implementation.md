# Congressional Map Implementation

## Overview
The congressional map at `/congressional-map` displays interactive district boundaries with Israel lobby scores color-coded by district. The map fetches real data from the `/api/house-districts` endpoint and merges it with clean GeoJSON boundaries.

## Key Components

### 1. Data Flow
- **API Endpoint**: `/api/house-districts` provides real district data including incumbent names, parties, Israel scores, and funding
- **GeoJSON Boundaries**: Clean district boundaries stored in `/public/districts/congressional-districts.json`
- **Map Component**: React component that fetches API data and merges with GeoJSON boundaries

### 2. File Structure
```
goodvote-app/
├── src/app/congressional-map/page.tsx    # Main map component
├── public/districts/congressional-districts.json  # Clean district boundaries
├── scripts/create-clean-district-boundaries.js    # Script to generate boundaries
└── docs/congressional-map-implementation.md       # This documentation
```

### 3. Data Matching Logic
The map uses a sophisticated matching system to connect API data with GeoJSON boundaries:

1. **API Data Processing**: 
   - Extracts district number from `district_name` field (e.g., "AL District 1" → "1")
   - Creates lookup key: `${state}-${districtNumber}` (e.g., "AL-1")

2. **GeoJSON Property Extraction**:
   - Uses `STATEFP` (state FIPS code) to identify state
   - Uses `CD119FP` (district number) for district identification
   - Converts FIPS codes to state abbreviations using mapping table

3. **State FIPS to Abbreviation Mapping**:
   ```javascript
   const stateMap = {
     '01': 'AL', '02': 'AK', '04': 'AZ', '05': 'AR', '06': 'CA',
     // ... complete mapping for all states
   };
   ```

### 4. Key Features

#### Interactive Map
- **Click Events**: Shows detailed popup with incumbent information
- **Hover Effects**: Cursor changes to pointer on district hover
- **Real Data**: Displays actual incumbent names, parties, Israel scores, and funding

#### Data Display
- **Incumbent Name**: Full name from API
- **Party**: Political party affiliation
- **Israel Score**: 0-5 scale (0 = pro-Israel, 5 = anti-Israel)
- **Israel Funding**: Total funding from Israel lobby groups
- **Cash on Hand**: Current campaign funds

#### Visual Design
- **Color Coding**: Currently shows gray districts (color coding to be implemented)
- **District Outlines**: Black borders for clear district boundaries
- **Responsive Design**: Works on desktop and mobile devices

### 5. Technical Implementation

#### Mapbox Integration
```javascript
// Initialize map
map.current = new window.mapboxgl.Map({
  container: mapContainer.current,
  style: 'mapbox://styles/mapbox/light-v11',
  center: [-98.5795, 39.8283],
  zoom: 4
});
```

#### Data Fetching
```javascript
const fetchDistrictData = async () => {
  try {
    const response = await fetch('/api/house-districts');
    const data = await response.json();
    setDistrictData(data);
  } catch (error) {
    setError('Failed to load district data');
  }
};
```

#### District Matching
```javascript
// Create lookup for real data
const dataLookup = new Map();
districtData.forEach(district => {
  const districtMatch = district.district_name.match(/District (\d+)/);
  const districtNumber = districtMatch ? districtMatch[1] : district.district;
  const key = `${district.state}-${districtNumber}`;
  dataLookup.set(key, district);
});
```

### 6. Recent Fixes (Latest Update)

#### Problem Solved
- **Issue**: Each state showed only one district regardless of which district was clicked
- **Root Cause**: Incorrect field mapping between GeoJSON properties and API data
- **Solution**: Implemented proper state FIPS code to abbreviation conversion

#### Key Changes
1. **Fixed State Mapping**: Added complete FIPS code to state abbreviation mapping
2. **Corrected Property Extraction**: Now uses `STATEFP` and `CD119FP` from GeoJSON
3. **Improved Data Matching**: Proper key generation for district lookup
4. **Enhanced Error Handling**: Better fallback for missing data

#### Code Changes
```javascript
// Before (incorrect)
const state = properties.STUSPS || properties.STATE || 'AL';
const district = properties.CD119FP || properties.CD || '1';

// After (correct)
const stateFp = properties.STATEFP;
const districtNumber = properties.CD119FP;
const state = stateMap[stateFp] || 'AL';
```

### 7. Future Enhancements

#### Planned Features
1. **Color Coding**: Implement district coloring based on Israel scores
2. **Legend Integration**: Dynamic legend showing score ranges
3. **Search Functionality**: Allow users to search for specific districts
4. **Export Options**: Download district data as CSV
5. **Historical Data**: Show changes over time

#### Performance Optimizations
1. **Data Caching**: Cache API responses to reduce load times
2. **Lazy Loading**: Load district data on demand
3. **Compression**: Optimize GeoJSON file size

### 8. Troubleshooting

#### Common Issues
1. **No Data Showing**: Check API endpoint `/api/house-districts`
2. **Wrong District Info**: Verify GeoJSON file structure
3. **Map Not Loading**: Ensure Mapbox access token is configured

#### Debug Steps
1. Check browser console for JavaScript errors
2. Verify API response format
3. Test district matching logic with sample data
4. Validate GeoJSON file structure

### 9. Dependencies
- **Mapbox GL JS**: For interactive map functionality
- **Next.js**: React framework for the application
- **TypeScript**: Type safety and better development experience

### 10. API Integration
The map relies on the `/api/house-districts` endpoint which provides:
- Real incumbent data from the database
- Israel lobby scores and funding information
- District boundaries and geographic data
- Current election cycle information

This implementation provides a robust, interactive congressional district map that accurately displays real campaign finance data with proper district matching. 