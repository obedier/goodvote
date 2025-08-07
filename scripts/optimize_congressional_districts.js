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

async function optimizeCongressionalDistricts() {
  try {
    console.log('🗺️ Optimizing congressional districts file...');
    
    // Load the original file
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
    
    for (const feature of originalData.features) {
      const props = feature.properties;
      const key = `${props.state}-${props.district}`;
      
      // Get metadata for this district
      const districtMetadata = metadata[key] || {};
      
      // Simplify coordinates
      const originalCoords = feature.geometry.coordinates[0];
      totalOriginalCoords += originalCoords.length;
      
      // Apply coordinate simplification
      const simplifiedCoords = simplifyPolygon(originalCoords, SIMPLIFICATION_TOLERANCE);
      
      // Round coordinates to reduce precision
      const roundedCoords = simplifiedCoords.map(coord => roundCoordinate(coord, COORDINATE_PRECISION));
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
          original_coordinates: originalCoords.length,
          optimized_coordinates: roundedCoords.length,
          simplification_ratio: (roundedCoords.length / originalCoords.length * 100).toFixed(1) + '%'
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
    const optimizedPath = path.join(__dirname, '../public/districts/congressional-districts-optimized.json');
    fs.writeFileSync(optimizedPath, JSON.stringify(optimizedData, null, 2));
    
    // Calculate savings
    const originalSize = fs.statSync(originalPath).size;
    const optimizedSize = fs.statSync(optimizedPath).size;
    const sizeReduction = ((originalSize - optimizedSize) / originalSize * 100).toFixed(1);
    const coordReduction = ((totalOriginalCoords - totalOptimizedCoords) / totalOriginalCoords * 100).toFixed(1);
    
    console.log('\n📊 OPTIMIZATION RESULTS:');
    console.log(`  Original coordinates: ${totalOriginalCoords.toLocaleString()}`);
    console.log(`  Optimized coordinates: ${totalOptimizedCoords.toLocaleString()}`);
    console.log(`  Coordinate reduction: ${coordReduction}%`);
    console.log(`  Original file size: ${(originalSize / 1024 / 1024).toFixed(1)} MB`);
    console.log(`  Optimized file size: ${(optimizedSize / 1024 / 1024).toFixed(1)} MB`);
    console.log(`  Size reduction: ${sizeReduction}%`);
    
    // Create a simplified version for progressive loading
    console.log('\n🔄 Creating simplified version for progressive loading...');
    
    const simplifiedFeatures = optimizedFeatures.map(feature => {
      const simplifiedCoords = simplifyPolygon(
        feature.geometry.coordinates[0], 
        SIMPLIFICATION_TOLERANCE * 5 // More aggressive simplification
      );
      
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
    
    const simplifiedPath = path.join(__dirname, '../public/districts/congressional-districts-simplified.json');
    fs.writeFileSync(simplifiedPath, JSON.stringify(simplifiedData, null, 2));
    
    const simplifiedSize = fs.statSync(simplifiedPath).size;
    console.log(`  Simplified file size: ${(simplifiedSize / 1024 / 1024).toFixed(1)} MB`);
    console.log(`  Simplified size reduction: ${((originalSize - simplifiedSize) / originalSize * 100).toFixed(1)}%`);
    
    console.log('\n✅ Optimization complete!');
    console.log('Files created:');
    console.log(`  - congressional-districts-optimized.json (${(optimizedSize / 1024 / 1024).toFixed(1)} MB)`);
    console.log(`  - congressional-districts-simplified.json (${(simplifiedSize / 1024 / 1024).toFixed(1)} MB)`);
    
    return true;
    
  } catch (error) {
    console.error('❌ Error optimizing congressional districts:', error);
    return false;
  }
}

// Run the optimization
optimizeCongressionalDistricts().then(success => {
  if (success) {
    console.log('\n🎉 Optimization completed successfully!');
  } else {
    console.log('\n💥 Optimization failed!');
    process.exit(1);
  }
});
