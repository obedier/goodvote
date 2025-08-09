const fs = require('fs');
const path = require('path');

// Path to the goodvote2 project with real district boundaries
const GOODVOTE2_PATH = '/Users/osamabedier/CodeProjects/goodvote2';
const GEOJSON_SOURCE_PATH = path.join(GOODVOTE2_PATH, 'data/geojson');

async function createCleanDistrictBoundaries() {
  try {
    console.log('🗺️ Creating clean congressional district boundaries...');

    // Check if goodvote2 directory exists
    if (!fs.existsSync(GOODVOTE2_PATH)) {
      console.error('❌ goodvote2 directory not found');
      return false;
    }

    if (!fs.existsSync(GEOJSON_SOURCE_PATH)) {
      console.error('❌ GeoJSON source directory not found');
      return false;
    }

    // Create public directory if it doesn't exist
    const publicDistrictsPath = path.join(__dirname, '../public/districts');
    if (!fs.existsSync(publicDistrictsPath)) {
      fs.mkdirSync(publicDistrictsPath, { recursive: true });
    }

    // Read all GeoJSON files from goodvote2
    const files = fs.readdirSync(GEOJSON_SOURCE_PATH)
      .filter(file => file.endsWith('.geojson'))
      .sort();

    console.log(`📁 Found ${files.length} state district files`);

    const allFeatures = [];
    let totalDistricts = 0;

    files.forEach((file, index) => {
      try {
        const filePath = path.join(GEOJSON_SOURCE_PATH, file);
        const geojsonData = JSON.parse(fs.readFileSync(filePath, 'utf8'));

        console.log(`📊 Processing ${file}: ${geojsonData.features.length} districts`);

        // Process each feature to add clean properties
        geojsonData.features.forEach((feature, featureIndex) => {
          const properties = feature.properties;
          
          // Extract state and district from the filename and feature
          const stateMatch = file.match(/(\d+)_cd119\.geojson/);
          const stateNumber = stateMatch ? stateMatch[1] : '01';
          
          // Convert state number to state abbreviation
          const stateMap = {
            '01': 'AL', '02': 'AK', '04': 'AZ', '05': 'AR', '06': 'CA', '08': 'CO', '09': 'CT', '10': 'DE',
            '11': 'DC', '12': 'FL', '13': 'GA', '15': 'HI', '16': 'ID', '17': 'IL', '18': 'IN', '19': 'IA',
            '20': 'KS', '21': 'KY', '22': 'LA', '23': 'ME', '24': 'MD', '25': 'MA', '26': 'MI', '27': 'MN',
            '28': 'MS', '29': 'MO', '30': 'MT', '31': 'NE', '32': 'NV', '33': 'NH', '34': 'NJ', '35': 'NM',
            '36': 'NY', '37': 'NC', '38': 'ND', '39': 'OH', '40': 'OK', '41': 'OR', '42': 'PA', '44': 'RI',
            '45': 'SC', '46': 'SD', '47': 'TN', '48': 'TX', '49': 'UT', '50': 'VT', '51': 'VA', '53': 'WA',
            '54': 'WV', '55': 'WI', '56': 'WY'
          };
          
          const state = stateMap[stateNumber] || 'AL';
          const district = properties.CD119FP || '01';
          
          allFeatures.push({
            ...feature,
            properties: {
              ...properties, // Keep original Census properties
              state: state,
              district: district,
              district_name: `${state} District ${district}`,
              // No sample data - let the map fetch real data from API
              status: 'FILLED',
              voting: true
            }
          });
          totalDistricts++;
        });
      } catch (error) {
        console.error(`❌ Error processing ${file}:`, error.message);
      }
    });

    // Create the combined GeoJSON
    const combinedGeojson = {
      type: 'FeatureCollection',
      features: allFeatures
    };

    // Write the combined GeoJSON file
    const outputPath = path.join(publicDistrictsPath, 'congressional-districts.json');
    fs.writeFileSync(outputPath, JSON.stringify(combinedGeojson, null, 2));

    console.log(`✅ Successfully created clean district boundaries`);
    console.log(`📊 Total districts: ${totalDistricts}`);
    console.log(`📁 Output file: ${outputPath}`);

    return true;
  } catch (error) {
    console.error('❌ Error creating clean district boundaries:', error);
    return false;
  }
}

createCleanDistrictBoundaries(); 