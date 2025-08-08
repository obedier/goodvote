const fs = require('fs');
const path = require('path');

// Douglas-Peucker simplification tolerance (in degrees)
const SIMPLIFICATION_TOLERANCE = 0.0001; // About 10 meters

// Coordinate precision (number of decimal places)
const COORDINATE_PRECISION = 5;

function simplifyPolygon(coordinates, tolerance) {
  if (coordinates.length <= 2) return coordinates;
  
  // Simple distance-based simplification
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
  // Remove null/invalid coordinates
  return coordinates.filter(coord => isValidCoordinate(coord));
}

async function optimizeCongressionalDistrictsFinal() {
  try {
    console.log('🗺️ Optimizing congressional districts file (FINAL VERSION)...');
    
    // Load the fixed file
    const originalPath = path.join(__dirname, '../public/districts/congressional-districts-fixed.json');
    const originalData = JSON.parse(fs.readFileSync(originalPath, 'utf8'));
    
    console.log(`📊 Original file: ${originalData.features.length} features`);
    
    // Process each feature
    const optimizedFeatures = [];
    let totalOriginalCoords = 0;
    let totalOptimizedCoords = 0;
    let skippedFeatures = 0;
    let problematicFeatures = 0;
    
    for (const feature of originalData.features) {
      const props = feature.properties;
      const key = `${props.state}-${props.district}`;
      
      // Get original coordinates and clean them
      const originalCoords = feature.geometry.coordinates[0];
      const cleanedCoords = cleanCoordinates(originalCoords);
      
      // Skip features with no valid coordinates
      if (cleanedCoords.length === 0) {
        console.log(`⚠️ Skipping ${key}: No valid coordinates`);
        skippedFeatures++;
        continue;
      }
      
      // Check if this is a problematic district (very few coordinates)
      const isProblematic = cleanedCoords.length < 10;
      if (isProblematic) {
        console.log(`⚠️ Problematic district ${key}: ${cleanedCoords.length} coordinates`);
        problematicFeatures++;
      }
      
      totalOriginalCoords += cleanedCoords.length;
      
      let optimizedCoords;
      
      if (isProblematic) {
        // For problematic districts, don't simplify - just round coordinates
        optimizedCoords = cleanedCoords.map(coord => roundCoordinate(coord, COORDINATE_PRECISION));
      } else {
        // Apply coordinate simplification for normal districts
        const simplifiedCoords = simplifyPolygon(cleanedCoords, SIMPLIFICATION_TOLERANCE);
        optimizedCoords = simplifiedCoords.map(coord => roundCoordinate(coord, COORDINATE_PRECISION));
      }
      
      totalOptimizedCoords += optimizedCoords.length;
      
      // Create optimized feature
      const optimizedFeature = {
        type: 'Feature',
        properties: {
          ...props,
          // Add optimization metadata
          original_coordinates: cleanedCoords.length,
          optimized_coordinates: optimizedCoords.length,
          simplification_ratio: (optimizedCoords.length / cleanedCoords.length * 100).toFixed(1) + '%',
          was_problematic: isProblematic,
          original_has_invalid_coords: originalCoords.length !== cleanedCoords.length
        },
        geometry: {
          type: 'Polygon',
          coordinates: [optimizedCoords]
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
    const optimizedPath = path.join(__dirname, '../public/districts/congressional-districts-optimized-fixed.json');
    fs.writeFileSync(optimizedPath, JSON.stringify(optimizedData, null, 2));
    
    // Calculate savings
    const originalSize = fs.statSync(originalPath).size;
    const optimizedSize = fs.statSync(optimizedPath).size;
    const sizeReduction = ((originalSize - optimizedSize) / originalSize * 100).toFixed(1);
    const coordReduction = ((totalOriginalCoords - totalOptimizedCoords) / totalOriginalCoords * 100).toFixed(1);
    
    console.log('\n📊 OPTIMIZATION RESULTS (FINAL):');
    console.log(`  Original coordinates: ${totalOriginalCoords.toLocaleString()}`);
    console.log(`  Optimized coordinates: ${totalOptimizedCoords.toLocaleString()}`);
    console.log(`  Coordinate reduction: ${coordReduction}%`);
    console.log(`  Original file size: ${(originalSize / 1024 / 1024).toFixed(1)} MB`);
    console.log(`  Optimized file size: ${(optimizedSize / 1024 / 1024).toFixed(1)} MB`);
    console.log(`  Size reduction: ${sizeReduction}%`);
    console.log(`  Skipped features: ${skippedFeatures}`);
    console.log(`  Problematic features: ${problematicFeatures}`);
    
    // Create a simplified version for progressive loading
    console.log('\n🔄 Creating simplified version for progressive loading...');
    
    const simplifiedFeatures = optimizedFeatures.map(feature => {
      const coords = feature.geometry.coordinates[0];
      
      // For problematic districts, don't simplify further
      if (feature.properties.was_problematic) {
        return {
          ...feature,
          properties: {
            ...feature.properties,
            simplified_coordinates: coords.length,
            progressive_loading: true,
            preserved_original: true
          }
        };
      }
      
      // Apply more aggressive simplification for normal districts
      const simplifiedCoords = simplifyPolygon(coords, SIMPLIFICATION_TOLERANCE * 5);
      
      return {
        ...feature,
        geometry: {
          type: 'Polygon',
          coordinates: [simplifiedCoords]
        },
        properties: {
          ...feature.properties,
          simplified_coordinates: simplifiedCoords.length,
          progressive_loading: true
        }
      };
    });
    
    const simplifiedData = {
      type: 'FeatureCollection',
      features: simplifiedFeatures
    };
    
    const simplifiedPath = path.join(__dirname, '../public/districts/congressional-districts-simplified-fixed.json');
    fs.writeFileSync(simplifiedPath, JSON.stringify(simplifiedData, null, 2));
    
    const simplifiedSize = fs.statSync(simplifiedPath).size;
    console.log(`  Simplified file size: ${(simplifiedSize / 1024 / 1024).toFixed(1)} MB`);
    console.log(`  Simplified size reduction: ${((originalSize - simplifiedSize) / originalSize * 100).toFixed(1)}%`);
    
    console.log('\n✅ Final optimization complete!');
    console.log('Files created:');
    console.log(`  - congressional-districts-optimized-fixed.json (${(optimizedSize / 1024 / 1024).toFixed(1)} MB)`);
    console.log(`  - congressional-districts-simplified-fixed.json (${(simplifiedSize / 1024 / 1024).toFixed(1)} MB)`);
    
    return true;
    
  } catch (error) {
    console.error('❌ Error optimizing congressional districts:', error);
    return false;
  }
}

// Run the final optimization
optimizeCongressionalDistrictsFinal().then(success => {
  if (success) {
    console.log('\n🎉 Final optimization completed successfully!');
  } else {
    console.log('\n💥 Final optimization failed!');
    process.exit(1);
  }
});
