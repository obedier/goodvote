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
    https.get(url, (response) => {
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
      console.log('🔄 Falling back to improved boundaries...');
      return false;
    }
    
    // Extract the zip file
    console.log('📦 Extracting shapefiles...');
    try {
      await execAsync(`unzip -o "${zipPath}" -d "${shapefileDir}"`);
      console.log('✅ Extracted shapefiles');
    } catch (error) {
      console.error('❌ Failed to extract shapefiles:', error.message);
      console.log('🔄 Falling back to improved boundaries...');
      return false;
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
      console.log('🔄 Falling back to improved boundaries...');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Error processing Census district boundaries:', error);
    return false;
  }
}

// Run the script
downloadAndProcessCensusDistricts(); 