const fs = require('fs');
const path = require('path');

function checkDistrictIntegrity() {
  console.log('🔍 Checking district integrity...');
  
  // Load all files
  const originalPath = path.join(__dirname, '../public/districts/congressional-districts.json');
  const optimizedPath = path.join(__dirname, '../public/districts/congressional-districts-optimized.json');
  const simplifiedPath = path.join(__dirname, '../public/districts/congressional-districts-simplified.json');
  
  if (!fs.existsSync(originalPath)) {
    console.error('❌ Original file not found');
    return;
  }
  
  if (!fs.existsSync(optimizedPath)) {
    console.error('❌ Optimized file not found');
    return;
  }
  
  if (!fs.existsSync(simplifiedPath)) {
    console.error('❌ Simplified file not found');
    return;
  }
  
  const originalData = JSON.parse(fs.readFileSync(originalPath, 'utf8'));
  const optimizedData = JSON.parse(fs.readFileSync(optimizedPath, 'utf8'));
  const simplifiedData = JSON.parse(fs.readFileSync(simplifiedPath, 'utf8'));
  
  console.log(`📊 Original features: ${originalData.features.length}`);
  console.log(`📊 Optimized features: ${optimizedData.features.length}`);
  console.log(`📊 Simplified features: ${simplifiedData.features.length}`);
  
  // Check for missing districts
  const originalKeys = new Set();
  const optimizedKeys = new Set();
  const simplifiedKeys = new Set();
  
  originalData.features.forEach(f => {
    const key = `${f.properties.state}-${f.properties.district}`;
    originalKeys.add(key);
  });
  
  optimizedData.features.forEach(f => {
    const key = `${f.properties.state}-${f.properties.district}`;
    optimizedKeys.add(key);
  });
  
  simplifiedData.features.forEach(f => {
    const key = `${f.properties.state}-${f.properties.district}`;
    simplifiedKeys.add(key);
  });
  
  console.log('\n📊 District Count Comparison:');
  console.log(`  Original districts: ${originalKeys.size}`);
  console.log(`  Optimized districts: ${optimizedKeys.size}`);
  console.log(`  Simplified districts: ${simplifiedKeys.size}`);
  
  // Find missing districts
  const missingInOptimized = [...originalKeys].filter(key => !optimizedKeys.has(key));
  const missingInSimplified = [...originalKeys].filter(key => !simplifiedKeys.has(key));
  
  if (missingInOptimized.length > 0) {
    console.log('\n❌ Missing districts in optimized file:');
    missingInOptimized.forEach(key => console.log(`  - ${key}`));
  }
  
  if (missingInSimplified.length > 0) {
    console.log('\n❌ Missing districts in simplified file:');
    missingInSimplified.forEach(key => console.log(`  - ${key}`));
  }
  
  // Check for districts with very few coordinates (potential issues)
  console.log('\n🔍 Districts with very few coordinates (potential issues):');
  const problematicDistricts = [];
  
  optimizedData.features.forEach(f => {
    const coords = f.geometry.coordinates[0];
    if (coords.length < 10) {
      console.log(`  ${f.properties.state}-${f.properties.district}: ${coords.length} coordinates`);
      problematicDistricts.push({
        key: `${f.properties.state}-${f.properties.district}`,
        coords: coords,
        feature: f
      });
    }
  });
  
  // Check for null or invalid coordinates
  console.log('\n🔍 Checking for null or invalid coordinates:');
  let nullCoords = 0;
  let invalidCoords = 0;
  
  optimizedData.features.forEach(f => {
    const coords = f.geometry.coordinates[0];
    coords.forEach(coord => {
      if (coord === null || coord === undefined) {
        nullCoords++;
      } else if (!Array.isArray(coord) || coord.length !== 2) {
        invalidCoords++;
      } else if (coord[0] === null || coord[1] === null) {
        nullCoords++;
      }
    });
  });
  
  if (nullCoords > 0) {
    console.log(`  ⚠️  Found ${nullCoords} null coordinates`);
  }
  if (invalidCoords > 0) {
    console.log(`  ⚠️  Found ${invalidCoords} invalid coordinates`);
  }
  
  // Check for Florida districts specifically
  console.log('\n🔍 Florida Districts Check:');
  const floridaOriginal = originalData.features.filter(f => f.properties.state === '12');
  const floridaOptimized = optimizedData.features.filter(f => f.properties.state === '12');
  const floridaSimplified = simplifiedData.features.filter(f => f.properties.state === '12');
  
  console.log(`  Original Florida districts: ${floridaOriginal.length}`);
  console.log(`  Optimized Florida districts: ${floridaOptimized.length}`);
  console.log(`  Simplified Florida districts: ${floridaSimplified.length}`);
  
  // Check coordinate integrity for Florida districts
  floridaOriginal.forEach((original, index) => {
    const optimized = floridaOptimized[index];
    const simplified = floridaSimplified[index];
    
    if (original && optimized) {
      const originalCoords = original.geometry.coordinates[0];
      const optimizedCoords = optimized.geometry.coordinates[0];
      const simplifiedCoords = simplified?.geometry.coordinates[0];
      
      console.log(`  FL District ${original.properties.district}:`);
      console.log(`    Original coordinates: ${originalCoords.length}`);
      console.log(`    Optimized coordinates: ${optimizedCoords.length}`);
      console.log(`    Simplified coordinates: ${simplifiedCoords?.length || 'N/A'}`);
      
      // Check if coordinates are valid
      const originalValid = originalCoords.every(coord => coord && Array.isArray(coord) && coord.length === 2);
      const optimizedValid = optimizedCoords.every(coord => coord && Array.isArray(coord) && coord.length === 2);
      
      if (!originalValid) {
        console.log(`    ⚠️  Original has invalid coordinates`);
      }
      if (!optimizedValid) {
        console.log(`    ⚠️  Optimized has invalid coordinates`);
      }
      
      // Check bounding box only if coordinates are valid
      if (originalValid && optimizedValid) {
        const originalBounds = getBoundingBox(originalCoords);
        const optimizedBounds = getBoundingBox(optimizedCoords);
        
        console.log(`    Original bounds: ${JSON.stringify(originalBounds)}`);
        console.log(`    Optimized bounds: ${JSON.stringify(optimizedBounds)}`);
        
        // Check if bounds are significantly different
        const latDiff = Math.abs(originalBounds.maxLat - optimizedBounds.maxLat);
        const lonDiff = Math.abs(originalBounds.maxLon - optimizedBounds.maxLon);
        
        if (latDiff > 0.01 || lonDiff > 0.01) {
          console.log(`    ⚠️  WARNING: Significant bounds difference detected!`);
        }
      }
    }
  });
  
  // Check coordinate precision (only for valid coordinates)
  console.log('\n🔍 Checking coordinate precision:');
  let precisionIssues = 0;
  let validCoords = 0;
  
  optimizedData.features.forEach(f => {
    const coords = f.geometry.coordinates[0];
    coords.forEach(coord => {
      if (coord && Array.isArray(coord) && coord.length === 2 && coord[0] !== null && coord[1] !== null) {
        validCoords++;
        const latStr = coord[1].toString();
        const lonStr = coord[0].toString();
        
        if (latStr.includes('.') && latStr.split('.')[1].length > 5) {
          precisionIssues++;
        }
        if (lonStr.includes('.') && lonStr.split('.')[1].length > 5) {
          precisionIssues++;
        }
      }
    });
  });
  
  console.log(`  Valid coordinates checked: ${validCoords}`);
  if (precisionIssues > 0) {
    console.log(`  ⚠️  Found ${precisionIssues} coordinates with excessive precision`);
  } else {
    console.log(`  ✅ Coordinate precision looks good`);
  }
  
  // Summary
  console.log('\n📊 SUMMARY:');
  console.log(`  Total districts: ${optimizedData.features.length}`);
  console.log(`  Problematic districts (≤10 coords): ${problematicDistricts.length}`);
  console.log(`  Null coordinates: ${nullCoords}`);
  console.log(`  Invalid coordinates: ${invalidCoords}`);
  
  if (problematicDistricts.length > 0 || nullCoords > 0 || invalidCoords > 0) {
    console.log('\n❌ ISSUES FOUND: The optimization may have corrupted some districts!');
    console.log('Recommendation: Check the original data generation process.');
  } else {
    console.log('\n✅ No major issues found with the optimization.');
  }
}

function getBoundingBox(coordinates) {
  let minLat = Infinity, maxLat = -Infinity;
  let minLon = Infinity, maxLon = -Infinity;
  
  coordinates.forEach(coord => {
    if (coord && Array.isArray(coord) && coord.length === 2 && coord[0] !== null && coord[1] !== null) {
      const [lon, lat] = coord;
      minLat = Math.min(minLat, lat);
      maxLat = Math.max(maxLat, lat);
      minLon = Math.min(minLon, lon);
      maxLon = Math.max(maxLon, lon);
    }
  });
  
  return { minLat, maxLat, minLon, maxLon };
}

// Run the check
checkDistrictIntegrity();
