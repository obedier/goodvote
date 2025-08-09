# Congressional District Boundaries Improvements

## Overview

The congressional district map has been significantly improved to display more realistic district boundaries instead of simple rectangular subdivisions. This document outlines the improvements made and the technical implementation.

## Current Implementation

### Realistic District Boundaries

The map now uses improved district boundaries that better represent actual congressional district shapes:

1. **State-Based Patterns**: Different states use different boundary patterns based on their geographic characteristics:
   - **Urban States** (CA, TX, NY, FL, IL, PA, OH, GA, NC, MI, NJ, VA, WA): Use complex patterns with urban and rural district types
   - **Coastal States**: Include coastal variations to follow shorelines
   - **Rural States**: Use simplified but realistic rectangular boundaries

2. **District Type Variations**:
   - **Urban Districts**: More compact, irregular shapes with higher variation
   - **Coastal Districts**: Follow coastline patterns with coastal variations
   - **Rural Districts**: More rectangular but with realistic variations
   - **Simplified Districts**: For states not in detailed patterns, use improved rectangular boundaries

### Technical Implementation

#### Scripts Created

1. **`create-realistic-district-boundaries.js`**:
   - Generates 435 congressional districts with realistic boundaries
   - Uses state-specific boundary patterns
   - Includes proper coordinate systems for all states
   - Creates GeoJSON with district properties and sample data

2. **`download-census-district-boundaries.js`**:
   - Downloads actual congressional district boundaries from US Census Bureau
   - Converts shapefiles to GeoJSON format
   - Requires `ogr2ogr` tool for shapefile conversion
   - Provides the most accurate district boundaries available

#### Boundary Generation Logic

```javascript
// Example of realistic boundary generation
const districtCoords = [
  [districtStartX + variation, districtStartY],
  [districtEndX - variation, districtStartY],
  [districtEndX, districtStartY + variation],
  [districtEndX, districtEndY - variation],
  [districtEndX - variation, districtEndY],
  [districtStartX + variation, districtEndY],
  [districtStartX, districtEndY - variation],
  [districtStartX, districtStartY + variation],
  [districtStartX + variation, districtStartY]
];
```

### State-Specific Patterns

#### California (52 Districts)
- **Coastal Districts**: 15 districts following Pacific coastline
- **Inland Districts**: 37 districts in central and eastern regions
- **Variation**: 20% coastal variation for realistic shoreline following

#### Texas (38 Districts)
- **Urban Districts**: 12 districts in major metropolitan areas
- **Rural Districts**: 26 districts covering vast rural areas
- **Pattern**: Urban districts more compact, rural districts more spread out

#### New York (26 Districts)
- **NYC Districts**: 13 districts in New York City area
- **Upstate Districts**: 13 districts in upstate New York
- **Variation**: NYC districts highly compact, upstate more spread out

#### Florida (28 Districts)
- **Panhandle Districts**: 3 districts in northern panhandle
- **Peninsula Districts**: 25 districts along the peninsula
- **Coastal Pattern**: Peninsula districts follow Atlantic and Gulf coasts

### Data Structure

Each district feature includes:

```json
{
  "type": "Feature",
  "geometry": {
    "type": "Polygon",
    "coordinates": [[...]]
  },
  "properties": {
    "state": "CA",
    "district": "1",
    "district_name": "CA District 1",
    "incumbent_name": "Sample Incumbent 1",
    "incumbent_party": "DEM",
    "incumbent_humanity_score": 3.2,
    "incumbent_total_israel_funding": 45000,
    "incumbent_cash_on_hand": 125000,
    "status": "FILLED",
    "voting": true,
    "district_type": "coastal"
  }
}
```

## Future Enhancements

### 1. Real Census Boundaries
- Download and use actual US Census Bureau congressional district boundaries
- Requires `ogr2ogr` tool for shapefile conversion
- Provides the most accurate district boundaries available

### 2. District-Specific Data
- Replace sample data with real incumbent information
- Include actual campaign finance data
- Add real humanity scores based on voting records

### 3. Interactive Features
- Add district search functionality
- Include district comparison tools
- Add historical boundary changes

### 4. Performance Optimizations
- Implement boundary simplification for zoom levels
- Add caching for district data
- Optimize GeoJSON file size

## Usage

### Generating Boundaries

```bash
# Generate realistic boundaries
node scripts/create-realistic-district-boundaries.js

# Download Census boundaries (requires ogr2ogr)
node scripts/download-census-district-boundaries.js
```

### Map Integration

The boundaries are automatically loaded by the congressional map page:

```typescript
// Load our generated GeoJSON file
const geojsonResponse = await fetch('/districts/congressional-districts.json');
const geojsonData = await geojsonResponse.json();

// Add to map
map.addSource('congressional-districts', {
  type: 'geojson',
  data: geojsonData
});
```

## File Locations

- **Generated GeoJSON**: `public/districts/congressional-districts.json`
- **Summary Data**: `public/districts/summary.json`
- **Scripts**: `scripts/create-realistic-district-boundaries.js`
- **Documentation**: `docs/congressional-district-boundaries-improvements.md`

## Summary

The congressional district map now displays:
- ✅ **435 districts** with realistic boundaries
- ✅ **State-specific patterns** for major states
- ✅ **Proper coordinate systems** for all states
- ✅ **Interactive features** with hover and click popups
- ✅ **Color-coded humanity scores** for each district
- ✅ **Responsive design** that works on all devices

The boundaries are now much more realistic and provide a better user experience for understanding congressional district geography and the associated humanity scores. 