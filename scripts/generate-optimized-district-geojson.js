const fs = require('fs');
const path = require('path');

// Path to the goodvote2 project with real district boundaries
const GOODVOTE2_PATH = '/Users/osamabedier/CodeProjects/goodvote2';
const GEOJSON_SOURCE_PATH = path.join(GOODVOTE2_PATH, 'data/geojson');

async function generateOptimizedDistrictGeojson() {
  try {
    console.log('🗺️ Generating optimized congressional district boundaries with real data...');

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

    // Fetch real data from our API
    console.log('📊 Fetching real district data from API...');
    const response = await fetch('http://localhost:3000/api/house-districts');
    const apiData = await response.json();

    if (!apiData.success) {
      throw new Error('Failed to fetch API data');
    }

    const realDistricts = apiData.data || [];
    console.log(`📊 Fetched ${realDistricts.length} real districts from API`);

    // Create a lookup map for real data using FIPS codes
    const realDataLookup = new Map();
    realDistricts.forEach((district) => {
      const districtMatch = district.district_name.match(/District (\d+)/);
      const districtNumber = districtMatch ? districtMatch[1] : district.district;
      
      // Convert state abbreviation to FIPS code
      const stateFipsMap = {
        'AL': '01', 'AK': '02', 'AZ': '04', 'AR': '05', 'CA': '06', 'CO': '08', 'CT': '09', 'DE': '10',
        'DC': '11', 'FL': '12', 'GA': '13', 'HI': '15', 'ID': '16', 'IL': '17', 'IN': '18', 'IA': '19',
        'KS': '20', 'KY': '21', 'LA': '22', 'ME': '23', 'MD': '24', 'MA': '25', 'MI': '26', 'MN': '27',
        'MS': '28', 'MO': '29', 'MT': '30', 'NE': '31', 'NV': '32', 'NH': '33', 'NJ': '34', 'NM': '35',
        'NY': '36', 'NC': '37', 'ND': '38', 'OH': '39', 'OK': '40', 'OR': '41', 'PA': '42', 'RI': '44',
        'SC': '45', 'SD': '46', 'TN': '47', 'TX': '48', 'UT': '49', 'VT': '50', 'VA': '51', 'WA': '53',
        'WV': '54', 'WI': '55', 'WY': '56'
      };
      
      const stateFips = stateFipsMap[district.state] || '01';
      const districtNum = districtNumber ? districtNumber.toString().padStart(2, '0') : '01';
      const key = `${stateFips}-${districtNum}`;
      realDataLookup.set(key, district);
      console.log(`🔍 Created FIPS lookup: ${key} for ${district.incumbent_name}`);
    });

    // Read all GeoJSON files from goodvote2 and extract boundaries
    const files = fs.readdirSync(GEOJSON_SOURCE_PATH)
      .filter(file => file.endsWith('.geojson'))
      .sort();

    console.log(`📁 Found ${files.length} state district files`);

    const allFeatures = [];
    let totalDistricts = 0;
    let matchedDistricts = 0;

    files.forEach((file, index) => {
      try {
        const filePath = path.join(GEOJSON_SOURCE_PATH, file);
        const geojsonData = JSON.parse(fs.readFileSync(filePath, 'utf8'));

        console.log(`📊 Processing ${file}: ${geojsonData.features.length} districts`);

        // Process each feature to extract boundaries and add real data
        geojsonData.features.forEach((feature, featureIndex) => {
          const properties = feature.properties;
          
          // Extract FIPS codes from GeoJSON properties
          const stateFips = properties.STATEFP;
          const districtFips = properties.CD119FP;
          
          if (!stateFips || !districtFips) {
            console.log(`⚠️ Missing FIPS codes in ${file} feature ${featureIndex}`);
            return;
          }

          const key = `${stateFips}-${districtFips}`;
          const realData = realDataLookup.get(key);

          if (realData) {
            console.log(`✅ Found real data for ${key}: ${realData.incumbent_name}`);
            matchedDistricts++;
            
            // Create optimized feature with only necessary properties
            allFeatures.push({
              type: 'Feature',
              geometry: feature.geometry, // Keep the boundary geometry
              properties: {
                // Essential identifiers
                STATEFP: stateFips,
                CD119FP: districtFips,
                state: realData.state,
                district: districtFips,
                
                // Real data from our database
                district_name: realData.district_name,
                incumbent_name: realData.incumbent_name,
                incumbent_party: realData.incumbent_party,
                incumbent_israel_score: realData.incumbent_israel_score,
                incumbent_total_israel_funding: realData.incumbent_total_israel_funding,
                incumbent_cash_on_hand: realData.incumbent_cash_on_hand,
                
                // Metadata
                status: 'FILLED',
                data_source: 'fec_gold'
              }
            });
          } else {
            console.log(`⚠️ No real data found for ${key}, skipping`);
          }
          totalDistricts++;
        });
      } catch (error) {
        console.error(`❌ Error processing ${file}:`, error.message);
      }
    });

    // Create the optimized GeoJSON
    const optimizedGeojson = {
      type: 'FeatureCollection',
      features: allFeatures
    };

    // Write the optimized GeoJSON file
    const outputPath = path.join(publicDistrictsPath, 'congressional-districts.json');
    fs.writeFileSync(outputPath, JSON.stringify(optimizedGeojson, null, 2));

    // Create a summary file
    const summary = {
      generated_at: new Date().toISOString(),
      total_districts_processed: totalDistricts,
      districts_with_real_data: matchedDistricts,
      districts_missing_data: totalDistricts - matchedDistricts,
      data_source: 'fec_gold',
      file_size_mb: (fs.statSync(outputPath).size / 1024 / 1024).toFixed(2)
    };

    const summaryPath = path.join(publicDistrictsPath, 'summary.json');
    fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));

    console.log(`✅ Successfully created optimized district boundaries`);
    console.log(`📊 Total districts processed: ${totalDistricts}`);
    console.log(`📊 Districts with real data: ${matchedDistricts}`);
    console.log(`📊 Districts missing data: ${totalDistricts - matchedDistricts}`);
    console.log(`📁 Output file: ${outputPath}`);
    console.log(`📁 File size: ${summary.file_size_mb} MB`);
    console.log(`📁 Summary: ${summaryPath}`);

    return true;
  } catch (error) {
    console.error('❌ Error generating optimized district GeoJSON:', error);
    return false;
  }
}

generateOptimizedDistrictGeojson();
