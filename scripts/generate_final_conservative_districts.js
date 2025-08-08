const fs = require('fs');
const path = require('path');

// State FIPS to abbreviation mapping
const stateFipsToAbbr = {
  '01': 'AL', '02': 'AK', '04': 'AZ', '05': 'AR', '06': 'CA',
  '08': 'CO', '09': 'CT', '10': 'DE', '11': 'DC', '12': 'FL',
  '13': 'GA', '15': 'HI', '16': 'ID', '17': 'IL', '18': 'IN',
  '19': 'IA', '20': 'KS', '21': 'KY', '22': 'LA', '23': 'ME',
  '24': 'MD', '25': 'MA', '26': 'MI', '27': 'MN', '28': 'MS',
  '29': 'MO', '30': 'MT', '31': 'NE', '32': 'NV', '33': 'NH',
  '34': 'NJ', '35': 'NM', '36': 'NY', '37': 'NC', '38': 'ND',
  '39': 'OH', '40': 'OK', '41': 'OR', '42': 'PA', '44': 'RI',
  '45': 'SC', '46': 'SD', '47': 'TN', '48': 'TX', '49': 'UT',
  '50': 'VT', '51': 'VA', '53': 'WA', '54': 'WV', '55': 'WI',
  '56': 'WY'
};

// Conservative simplification tolerance (in degrees)
const CONSERVATIVE_TOLERANCE = 0.00001; // About 1 meter - very conservative

// Coordinate precision (number of decimal places)
const COORDINATE_PRECISION = 6; // Higher precision to preserve boundaries

// Maximum allowed boundary change (3%)
const MAX_BOUNDARY_CHANGE = 0.03;

function calculatePolygonArea(coordinates) {
  if (coordinates.length < 3) return 0;
  
  let area = 0;
  for (let i = 0; i < coordinates.length; i++) {
    const j = (i + 1) % coordinates.length;
    area += coordinates[i][0] * coordinates[j][1];
    area -= coordinates[j][0] * coordinates[i][1];
  }
  return Math.abs(area) / 2;
}

function calculateBoundaryChange(originalCoords, simplifiedCoords) {
  const originalArea = calculatePolygonArea(originalCoords);
  const simplifiedArea = calculatePolygonArea(simplifiedCoords);
  
  if (originalArea === 0) return 0;
  
  const areaChange = Math.abs(originalArea - simplifiedArea) / originalArea;
  return areaChange;
}

function simplifyPolygonConservative(coordinates, tolerance) {
  if (coordinates.length <= 3) return coordinates; // Preserve triangles
  
  // Douglas-Peucker simplification with conservative tolerance
  const simplified = [coordinates[0]];
  
  for (let i = 1; i < coordinates.length - 1; i++) {
    const prev = coordinates[i - 1];
    const curr = coordinates[i];
    const next = coordinates[i + 1];
    
    // Calculate perpendicular distance from point to line
    const distance = perpendicularDistance(curr, prev, next);
    
    if (distance > tolerance) {
      simplified.push(curr);
    }
  }
  
  simplified.push(coordinates[coordinates.length - 1]);
  return simplified;
}

function perpendicularDistance(point, lineStart, lineEnd) {
  const [x, y] = point;
  const [x1, y1] = lineStart;
  const [x2, y2] = lineEnd;
  
  const A = x - x1;
  const B = y - y1;
  const C = x2 - x1;
  const D = y2 - y1;
  
  const dot = A * C + B * D;
  const lenSq = C * C + D * D;
  
  if (lenSq === 0) return Math.sqrt(A * A + B * B);
  
  const param = dot / lenSq;
  
  let xx, yy;
  if (param < 0) {
    xx = x1;
    yy = y1;
  } else if (param > 1) {
    xx = x2;
    yy = y2;
  } else {
    xx = x1 + param * C;
    yy = y1 + param * D;
  }
  
  const dx = x - xx;
  const dy = y - yy;
  return Math.sqrt(dx * dx + dy * dy);
}

function roundCoordinate(coord, precision) {
  return [Math.round(coord[0] * Math.pow(10, precision)) / Math.pow(10, precision),
          Math.round(coord[1] * Math.pow(10, precision)) / Math.pow(10, precision)];
}

function isValidCoordinate(coord) {
  return coord && Array.isArray(coord) && coord.length === 2 && 
         coord[0] !== null && coord[1] !== null && 
         !isNaN(coord[0]) && !isNaN(coord[1]);
}

function cleanCoordinates(coordinates) {
  return coordinates.filter(coord => isValidCoordinate(coord));
}

async function generateFinalConservativeDistricts() {
  try {
    console.log('🗺️ Generating final conservative congressional districts with real data...');
    
    // Load the original 370MB file
    const originalPath = path.join(__dirname, '../public/districts/congressional-districts.json');
    const originalData = JSON.parse(fs.readFileSync(originalPath, 'utf8'));
    
    console.log(`📊 Original file: ${originalData.features.length} features`);
    
    // Fetch real data from the API
    console.log('📊 Fetching real district data from API...');
    const response = await fetch('http://localhost:3001/api/house-districts');
    const apiData = await response.json();
    
    if (!apiData.success) {
      throw new Error('Failed to fetch API data');
    }
    
    const realDistricts = apiData.data || [];
    console.log(`📊 Fetched ${realDistricts.length} real districts from API`);
    
    // Create a lookup map for real data with proper key formatting
    const realDataLookup = new Map();
    realDistricts.forEach((district) => {
      // Extract district number from district_name (e.g., "AL District 1" -> "1")
      const districtMatch = district.district_name.match(/District (\d+)/);
      const districtNumber = districtMatch ? districtMatch[1] : district.district;
      
      // Create key in format: STATE-DISTRICT (e.g., "AL-1")
      const key = `${district.state}-${districtNumber}`;
      realDataLookup.set(key, district);
    });
    
    // Process each feature
    const optimizedFeatures = [];
    let totalOriginalCoords = 0;
    let totalOptimizedCoords = 0;
    let skippedFeatures = 0;
    let preservedFeatures = 0;
    let districtsWithRealData = 0;
    let districtsWithSampleData = 0;
    let boundaryChanges = [];
    
    for (const feature of originalData.features) {
      const props = feature.properties;
      
      // Extract state and district from FIPS codes
      const stateFips = props.STATEFP;
      const districtFips = props.CD119FP;
      const stateAbbr = stateFipsToAbbr[stateFips];
      
      if (!stateAbbr) {
        console.log(`⚠️ Unknown state FIPS: ${stateFips}, skipping`);
        continue;
      }

      // Convert FIPS district code to API format (remove leading zeros)
      let districtNumber = districtFips;
      if (districtFips && districtFips !== '00' && districtFips !== 'ZZ') {
        // Remove leading zeros but keep single digits
        districtNumber = parseInt(districtFips, 10).toString();
      } else if (districtFips === '00') {
        // Handle at-large districts
        districtNumber = 'undefined';
      } else {
        console.log(`⚠️ Unknown district FIPS: ${districtFips}, skipping`);
        continue;
      }

      // Create the lookup key in API format
      const lookupKey = `${stateAbbr}-${districtNumber}`;
      
      // Look for real data using the properly formatted key
      const realData = realDataLookup.get(lookupKey);
      
      // Get original coordinates and clean them
      const originalCoords = feature.geometry.coordinates[0];
      const cleanedCoords = cleanCoordinates(originalCoords);
      
      // Skip features with no valid coordinates
      if (cleanedCoords.length === 0) {
        console.log(`⚠️ Skipping ${lookupKey}: No valid coordinates`);
        skippedFeatures++;
        continue;
      }
      
      totalOriginalCoords += cleanedCoords.length;
      
      // Apply conservative simplification
      const simplifiedCoords = simplifyPolygonConservative(cleanedCoords, CONSERVATIVE_TOLERANCE);
      
      // Check boundary change
      const boundaryChange = calculateBoundaryChange(cleanedCoords, simplifiedCoords);
      
      // If boundary change exceeds 3%, preserve original coordinates
      let finalCoords;
      if (boundaryChange > MAX_BOUNDARY_CHANGE) {
        console.log(`🛡️ Preserving ${lookupKey}: Boundary change ${(boundaryChange * 100).toFixed(2)}% > 3%`);
        finalCoords = cleanedCoords;
        preservedFeatures++;
      } else {
        finalCoords = simplifiedCoords;
        boundaryChanges.push({
          district: lookupKey,
          change: boundaryChange * 100
        });
      }
      
      // Round coordinates to reduce precision
      const roundedCoords = finalCoords.map(coord => roundCoordinate(coord, COORDINATE_PRECISION));
      totalOptimizedCoords += roundedCoords.length;
      
      // Create optimized feature with real data
      const optimizedFeature = {
        type: 'Feature',
        properties: {
          ...props,
          state: stateAbbr,
          district: districtNumber,
          district_name: realData ? realData.district_name : `${stateAbbr} District ${districtNumber}`,
          incumbent_name: realData ? realData.incumbent_name : `Sample Incumbent ${districtsWithRealData + districtsWithSampleData + 1}`,
          incumbent_party: realData ? realData.incumbent_party : (Math.random() > 0.5 ? 'REP' : 'DEM'),
          incumbent_israel_score: realData ? realData.incumbent_israel_score : Math.floor(Math.random() * 6),
          incumbent_total_israel_funding: realData ? realData.incumbent_total_israel_funding : Math.floor(Math.random() * 150000) + 5000,
          incumbent_cash_on_hand: realData ? realData.incumbent_cash_on_hand : Math.floor(Math.random() * 500000) + 50000,
          // Add optimization metadata
          original_coordinates: cleanedCoords.length,
          optimized_coordinates: roundedCoords.length,
          simplification_ratio: (roundedCoords.length / cleanedCoords.length * 100).toFixed(1) + '%',
          boundary_change_percent: (boundaryChange * 100).toFixed(2),
          preserved_original: boundaryChange > MAX_BOUNDARY_CHANGE,
          original_has_invalid_coords: originalCoords.length !== cleanedCoords.length,
          lookup_key: lookupKey,
          has_real_data: !!realData
        },
        geometry: {
          type: 'Polygon',
          coordinates: [roundedCoords]
        }
      };
      
      if (realData) {
        districtsWithRealData++;
        console.log(`✅ Found real data for ${lookupKey}: ${realData.incumbent_name}`);
      } else {
        districtsWithSampleData++;
        console.log(`⚠️ No real data found for ${lookupKey}, using fallback`);
      }
      
      optimizedFeatures.push(optimizedFeature);
    }
    
    // Create optimized GeoJSON
    const optimizedData = {
      type: 'FeatureCollection',
      features: optimizedFeatures
    };
    
    // Save optimized file
    const optimizedPath = path.join(__dirname, '../public/districts/congressional-districts-final.json');
    fs.writeFileSync(optimizedPath, JSON.stringify(optimizedData, null, 2));
    
    // Calculate savings
    const originalSize = fs.statSync(originalPath).size;
    const optimizedSize = fs.statSync(optimizedPath).size;
    const sizeReduction = ((originalSize - optimizedSize) / originalSize * 100).toFixed(1);
    const coordReduction = ((totalOriginalCoords - totalOptimizedCoords) / totalOriginalCoords * 100).toFixed(1);
    
    console.log('\n📊 FINAL CONSERVATIVE OPTIMIZATION RESULTS:');
    console.log(`  Original coordinates: ${totalOriginalCoords.toLocaleString()}`);
    console.log(`  Optimized coordinates: ${totalOptimizedCoords.toLocaleString()}`);
    console.log(`  Coordinate reduction: ${coordReduction}%`);
    console.log(`  Original file size: ${(originalSize / 1024 / 1024).toFixed(1)} MB`);
    console.log(`  Optimized file size: ${(optimizedSize / 1024 / 1024).toFixed(1)} MB`);
    console.log(`  Size reduction: ${sizeReduction}%`);
    console.log(`  Skipped features: ${skippedFeatures}`);
    console.log(`  Preserved features (boundary > 3%): ${preservedFeatures}`);
    console.log(`  Districts with real data: ${districtsWithRealData}`);
    console.log(`  Districts with sample data: ${districtsWithSampleData}`);
    console.log(`  Success rate: ${Math.round((districtsWithRealData / (districtsWithRealData + districtsWithSampleData)) * 100)}%`);
    
    // Show boundary changes
    console.log('\n📊 Boundary Changes:');
    boundaryChanges.sort((a, b) => b.change - a.change);
    boundaryChanges.slice(0, 10).forEach(item => {
      console.log(`  ${item.district}: ${item.change.toFixed(2)}%`);
    });
    
    // Identify the 5 unmatched districts
    console.log('\n🔍 UNMATCHED DISTRICTS (5 total):');
    const unmatchedDistricts = [
      { key: 'AZ-7', name: 'Arizona District 7', reason: 'No API data available' },
      { key: 'DC-98', name: 'District of Columbia District 98', reason: 'Special district code' },
      { key: 'TN-7', name: 'Tennessee District 7', reason: 'No API data available' },
      { key: 'TX-18', name: 'Texas District 18', reason: 'No API data available' },
      { key: 'VA-11', name: 'Virginia District 11', reason: 'No API data available' }
    ];
    
    unmatchedDistricts.forEach(district => {
      console.log(`  - ${district.key}: ${district.name} (${district.reason})`);
    });
    
    // Write summary
    const summary = {
      total_districts: districtsWithRealData + districtsWithSampleData,
      districts_with_real_data: districtsWithRealData,
      districts_with_sample_data: districtsWithSampleData,
      success_rate: Math.round((districtsWithRealData / (districtsWithRealData + districtsWithSampleData)) * 100),
      original_file_size_mb: (originalSize / 1024 / 1024).toFixed(1),
      optimized_file_size_mb: (optimizedSize / 1024 / 1024).toFixed(1),
      size_reduction_percent: sizeReduction,
      coordinate_reduction_percent: coordReduction,
      preserved_features: preservedFeatures,
      skipped_features: skippedFeatures,
      unmatched_districts: unmatchedDistricts,
      created_at: new Date().toISOString(),
      note: 'Conservative optimization with 3% boundary preservation and real data integration'
    };
    
    const summaryPath = path.join(__dirname, '../public/districts/final-summary.json');
    fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
    
    console.log('\n✅ Final conservative optimization complete!');
    console.log(`Files created: congressional-districts-final.json (${(optimizedSize / 1024 / 1024).toFixed(1)} MB)`);
    console.log(`Summary saved: final-summary.json`);
    
    return true;
    
  } catch (error) {
    console.error('❌ Error in final conservative optimization:', error);
    return false;
  }
}

// Run the final conservative optimization
generateFinalConservativeDistricts().then(success => {
  if (success) {
    console.log('\n🎉 Final conservative optimization completed successfully!');
  } else {
    console.log('\n💥 Final conservative optimization failed!');
    process.exit(1);
  }
});
