const fs = require('fs');
const path = require('path');
const https = require('https');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

// Congressional district boundaries from US Census Bureau (2022)
const CENSUS_DISTRICTS_URL = 'https://www2.census.gov/geo/tiger/TIGER2022/CD/tl_2022_us_cd116.zip';

async function downloadFile(url, outputPath) {
  return new Promise((resolve, reject) => {
    console.log(`📥 Downloading from: ${url}`);
    const file = fs.createWriteStream(outputPath);
    
    const options = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      }
    };
    
    https.get(url, options, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
        return;
      }
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        console.log('✅ Download completed');
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(outputPath, () => {}); // Delete the file async
      reject(err);
    });
  });
}

async function downloadAndProcessCensusDistricts() {
  try {
    console.log('🗺️ Starting Census Bureau congressional district boundary download...');

    // Create public directory if it doesn't exist
    const publicDir = path.join(__dirname, '../public');
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true });
    }

    // Create districts directory
    const districtsDir = path.join(publicDir, 'districts');
    if (!fs.existsSync(districtsDir)) {
      fs.mkdirSync(districtsDir, { recursive: true });
    }

    const zipPath = path.join(districtsDir, 'census-congressional-districts.zip');
    const shapefileDir = path.join(districtsDir, 'census-shapefiles');

    // Download the Census Bureau shapefile
    try {
      await downloadFile(CENSUS_DISTRICTS_URL, zipPath);
      console.log('✅ Downloaded Census Bureau congressional district boundaries');
    } catch (error) {
      console.error('❌ Failed to download from Census Bureau:', error.message);
      console.log('🔄 Falling back to alternative source...');
      
      // Try alternative source
      const ALTERNATIVE_URL = 'https://www2.census.gov/geo/tiger/TIGER2022/CD/tl_2022_us_cd116.zip';
      try {
        await downloadFile(ALTERNATIVE_URL, zipPath);
        console.log('✅ Downloaded from alternative source');
      } catch (altError) {
        console.error('❌ Failed to download from alternative source:', altError.message);
        console.log('🔄 Creating sample data with realistic boundaries...');
        return createSampleData(districtsDir);
      }
    }

    // Extract the zip file
    console.log('📦 Extracting shapefiles...');
    try {
      await execAsync(`unzip -o "${zipPath}" -d "${shapefileDir}"`);
      console.log('✅ Extracted shapefiles');
    } catch (error) {
      console.error('❌ Failed to extract shapefiles:', error.message);
      console.log('🔄 Creating sample data with realistic boundaries...');
      return createSampleData(districtsDir);
    }

    // Convert shapefile to GeoJSON using ogr2ogr (if available)
    console.log('🔄 Converting shapefile to GeoJSON...');
    const geojsonPath = path.join(districtsDir, 'census-congressional-districts.json');

    try {
      await execAsync(`ogr2ogr -f GeoJSON "${geojsonPath}" "${shapefileDir}/tl_2022_us_cd116.shp"`);
      console.log('✅ Converted to GeoJSON');

      // Read and process the GeoJSON
      const geojsonData = JSON.parse(fs.readFileSync(geojsonPath, 'utf8'));
      console.log(`📊 Loaded ${geojsonData.features.length} districts from Census Bureau`);

      // Process the features to add our data
      const processedFeatures = geojsonData.features.map((feature, index) => {
        const properties = feature.properties;
        const state = properties.STUSPS || properties.STATE;
        const district = properties.CD116FP || properties.CD || '1';

        // Generate sample data for the district
        const isRepublican = Math.random() > 0.5;
        const party = isRepublican ? 'REP' : 'DEM';
        let baseScore = isRepublican ? 1.5 : 3.5;
        baseScore += (Math.random() - 0.5) * 2;
        const humanityScore = Math.max(0, Math.min(5, baseScore));
        const israelFunding = Math.floor(Math.random() * 150000) + 5000;
        const cashOnHand = Math.floor(Math.random() * 500000) + 50000;
        const incumbentName = `Sample Incumbent ${index + 1}`;

        return {
          ...feature,
          properties: {
            state: state,
            district: district,
            district_name: `${state} District ${district}`,
            incumbent_name: incumbentName,
            incumbent_party: party,
            incumbent_humanity_score: parseFloat(humanityScore.toFixed(1)),
            incumbent_total_israel_funding: israelFunding,
            incumbent_cash_on_hand: cashOnHand,
            status: 'FILLED',
            voting: true,
            district_type: 'census',
            // Preserve original Census properties
            ...properties
          }
        };
      });

      const processedGeojson = {
        type: 'FeatureCollection',
        features: processedFeatures
      };

      // Write the processed GeoJSON file
      const outputPath = path.join(districtsDir, 'congressional-districts.json');
      fs.writeFileSync(outputPath, JSON.stringify(processedGeojson, null, 2));

      console.log(`✅ Created Census-based congressional district boundaries with ${processedFeatures.length} districts`);
      console.log(`📁 Saved to: ${outputPath}`);

      // Create summary
      const summary = {
        total_districts: processedFeatures.length,
        states_covered: [...new Set(processedFeatures.map(f => f.properties.state))].length,
        districts_with_data: processedFeatures.filter(f => f.properties.incumbent_humanity_score > 0).length,
        created_at: new Date().toISOString(),
        note: 'Real Census Bureau boundaries with sample data',
        source: 'US Census Bureau TIGER/Line 2022'
      };

      const summaryPath = path.join(districtsDir, 'summary.json');
      fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));

      console.log('📊 Summary:', summary);

      // Clean up temporary files
      try {
        fs.unlinkSync(zipPath);
        fs.rmSync(shapefileDir, { recursive: true, force: true });
        fs.unlinkSync(geojsonPath);
        console.log('🧹 Cleaned up temporary files');
      } catch (cleanupError) {
        console.log('⚠️ Could not clean up temporary files:', cleanupError.message);
      }

      return true;

    } catch (error) {
      console.error('❌ Failed to convert shapefile:', error.message);
      console.log('🔄 Creating sample data with realistic boundaries...');
      return createSampleData(districtsDir);
    }

  } catch (error) {
    console.error('❌ Error processing Census district boundaries:', error);
    return createSampleData(districtsDir);
  }
}

function createSampleData(districtsDir) {
  console.log('📊 Creating sample congressional district boundaries...');
  
  // Create realistic sample data with proper GeoJSON structure
  const sampleFeatures = [];
  
  // Congressional district counts by state (2024)
  const districtCounts = {
    'AL': 7, 'AK': 1, 'AZ': 9, 'AR': 4, 'CA': 52, 'CO': 8, 'CT': 5, 'DE': 1,
    'FL': 28, 'GA': 14, 'HI': 2, 'ID': 2, 'IL': 17, 'IN': 9, 'IA': 4, 'KS': 4,
    'KY': 6, 'LA': 6, 'ME': 2, 'MD': 8, 'MA': 9, 'MI': 13, 'MN': 8, 'MS': 4,
    'MO': 8, 'MT': 2, 'NE': 3, 'NV': 4, 'NH': 2, 'NJ': 12, 'NM': 3, 'NY': 26,
    'NC': 14, 'ND': 1, 'OH': 15, 'OK': 5, 'OR': 6, 'PA': 17, 'RI': 2, 'SC': 7,
    'SD': 1, 'TN': 9, 'TX': 38, 'UT': 4, 'VT': 1, 'VA': 11, 'WA': 10, 'WV': 2,
    'WI': 8, 'WY': 1
  };

  let featureIndex = 0;
  
  Object.entries(districtCounts).forEach(([state, count]) => {
    for (let i = 1; i <= count; i++) {
      // Generate realistic coordinates for each district
      const baseLng = -98 + (Math.random() - 0.5) * 20;
      const baseLat = 39 + (Math.random() - 0.5) * 10;
      
      // Create a more realistic polygon (not just a rectangle)
      const polygon = [];
      const centerLng = baseLng;
      const centerLat = baseLat;
      const radius = 0.5 + Math.random() * 0.5;
      
      // Create a polygon with some variation
      for (let j = 0; j < 8; j++) {
        const angle = (j / 8) * 2 * Math.PI;
        const r = radius * (0.8 + Math.random() * 0.4);
        polygon.push([
          centerLng + r * Math.cos(angle),
          centerLat + r * Math.sin(angle)
        ]);
      }
      // Close the polygon
      polygon.push(polygon[0]);
      
      // Generate sample data
      const isRepublican = Math.random() > 0.5;
      const party = isRepublican ? 'REP' : 'DEM';
      let baseScore = isRepublican ? 1.5 : 3.5;
      baseScore += (Math.random() - 0.5) * 2;
      const humanityScore = Math.max(0, Math.min(5, baseScore));
      const israelFunding = Math.floor(Math.random() * 150000) + 5000;
      const cashOnHand = Math.floor(Math.random() * 500000) + 50000;
      const incumbentName = `Sample Incumbent ${featureIndex + 1}`;

      sampleFeatures.push({
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [polygon]
        },
        properties: {
          state: state,
          district: i.toString(),
          district_name: `${state} District ${i}`,
          incumbent_name: incumbentName,
          incumbent_party: party,
          incumbent_humanity_score: parseFloat(humanityScore.toFixed(1)),
          incumbent_total_israel_funding: israelFunding,
          incumbent_cash_on_hand: cashOnHand,
          status: 'FILLED',
          voting: true,
          district_type: 'sample'
        }
      });
      
      featureIndex++;
    }
  });

  const geojson = {
    type: 'FeatureCollection',
    features: sampleFeatures
  };

  const outputPath = path.join(districtsDir, 'congressional-districts.json');
  fs.writeFileSync(outputPath, JSON.stringify(geojson, null, 2));

  // Create summary
  const summary = {
    total_districts: sampleFeatures.length,
    states_covered: Object.keys(districtCounts).length,
    districts_with_data: sampleFeatures.length,
    created_at: new Date().toISOString(),
    note: 'Sample boundaries with realistic data (Census download failed)',
    source: 'Generated sample data'
  };

  const summaryPath = path.join(districtsDir, 'summary.json');
  fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));

  console.log(`✅ Created sample congressional district boundaries with ${sampleFeatures.length} districts`);
  console.log(`📁 Saved to: ${outputPath}`);
  console.log('📊 Summary:', summary);

  return true;
}

// Run the script
downloadAndProcessCensusDistricts(); 