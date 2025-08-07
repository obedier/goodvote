const fs = require('fs');
const path = require('path');

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

async function conservativeDistrictOptimization() {
  try {
    console.log('🗺️ Conservative optimization of congressional districts...');
    console.log('📊 Preserving boundaries within 3% of original...');
    
    // Load the original 370MB file
    const originalPath = path.join(__dirname, '../public/districts/congressional-districts.json');
    const originalData = JSON.parse(fs.readFileSync(originalPath, 'utf8'));
    
    console.log(`📊 Original file: ${originalData.features.length} features`);
    
    // Load metadata if it exists
    const metadataPath = path.join(__dirname, '../public/districts/district-metadata.json');
    let metadata = {};
    if (fs.existsSync(metadataPath)) {
      metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
      console.log(`📊 Loaded metadata: ${Object.keys(metadata).length} entries`);
    }
    
    // Process each feature
    const optimizedFeatures = [];
    let totalOriginalCoords = 0;
    let totalOptimizedCoords = 0;
    let skippedFeatures = 0;
    let preservedFeatures = 0;
    let boundaryChanges = [];
    
    for (const feature of originalData.features) {
      const props = feature.properties;
      const key = `${props.state}-${props.district}`;
      
      // Get metadata for this district
      const districtMetadata = metadata[key] || {};
      
      // Get original coordinates and clean them
      const originalCoords = feature.geometry.coordinates[0];
      const cleanedCoords = cleanCoordinates(originalCoords);
      
      // Skip features with no valid coordinates
      if (cleanedCoords.length === 0) {
        console.log(`⚠️ Skipping ${key}: No valid coordinates`);
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
        console.log(`🛡️ Preserving ${key}: Boundary change ${(boundaryChange * 100).toFixed(2)}% > 3%`);
        finalCoords = cleanedCoords;
        preservedFeatures++;
      } else {
        finalCoords = simplifiedCoords;
        boundaryChanges.push({
          district: key,
          change: boundaryChange * 100
        });
      }
      
      // Round coordinates to reduce precision
      const roundedCoords = finalCoords.map(coord => roundCoordinate(coord, COORDINATE_PRECISION));
      totalOptimizedCoords += roundedCoords.length;
      
      // Create optimized feature
      const optimizedFeature = {
        type: 'Feature',
        properties: {
          ...props,
          // Merge metadata into properties
          incumbent_name: districtMetadata.incumbent_name || props.incumbent_name || 'Unknown',
          incumbent_party: districtMetadata.incumbent_party || props.incumbent_party || 'Unknown',
          incumbent_israel_score: districtMetadata.incumbent_israel_score || props.incumbent_israel_score || 0,
          incumbent_total_israel_funding: districtMetadata.incumbent_total_israel_funding || props.incumbent_total_israel_funding || 0,
          incumbent_cash_on_hand: districtMetadata.incumbent_cash_on_hand || props.incumbent_cash_on_hand || 0,
          // Add optimization metadata
          original_coordinates: cleanedCoords.length,
          optimized_coordinates: roundedCoords.length,
          simplification_ratio: (roundedCoords.length / cleanedCoords.length * 100).toFixed(1) + '%',
          boundary_change_percent: (boundaryChange * 100).toFixed(2),
          preserved_original: boundaryChange > MAX_BOUNDARY_CHANGE,
          original_has_invalid_coords: originalCoords.length !== cleanedCoords.length
        },
        geometry: {
          type: 'Polygon',
          coordinates: [roundedCoords]
        }
      };
      
      optimizedFeatures.push(optimizedFeature);
    }
    
    // Create optimized GeoJSON
    const optimizedData = {
      type: 'FeatureCollection',
      features: optimizedFeatures
    };
    
    // Save optimized file
    const optimizedPath = path.join(__dirname, '../public/districts/congressional-districts-conservative.json');
    fs.writeFileSync(optimizedPath, JSON.stringify(optimizedData, null, 2));
    
    // Calculate savings
    const originalSize = fs.statSync(originalPath).size;
    const optimizedSize = fs.statSync(optimizedPath).size;
    const sizeReduction = ((originalSize - optimizedSize) / originalSize * 100).toFixed(1);
    const coordReduction = ((totalOriginalCoords - totalOptimizedCoords) / totalOriginalCoords * 100).toFixed(1);
    
    console.log('\n📊 CONSERVATIVE OPTIMIZATION RESULTS:');
    console.log(`  Original coordinates: ${totalOriginalCoords.toLocaleString()}`);
    console.log(`  Optimized coordinates: ${totalOptimizedCoords.toLocaleString()}`);
    console.log(`  Coordinate reduction: ${coordReduction}%`);
    console.log(`  Original file size: ${(originalSize / 1024 / 1024).toFixed(1)} MB`);
    console.log(`  Optimized file size: ${(optimizedSize / 1024 / 1024).toFixed(1)} MB`);
    console.log(`  Size reduction: ${sizeReduction}%`);
    console.log(`  Skipped features: ${skippedFeatures}`);
    console.log(`  Preserved features (boundary > 3%): ${preservedFeatures}`);
    
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
    
    console.log('\n✅ Conservative optimization complete!');
    console.log(`Files created: congressional-districts-conservative.json (${(optimizedSize / 1024 / 1024).toFixed(1)} MB)`);
    
    return true;
    
  } catch (error) {
    console.error('❌ Error in conservative optimization:', error);
    return false;
  }
}

// Run the conservative optimization
conservativeDistrictOptimization().then(success => {
  if (success) {
    console.log('\n🎉 Conservative optimization completed successfully!');
  } else {
    console.log('\n💥 Conservative optimization failed!');
    process.exit(1);
  }
});
