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
  '56': 'WY',
  // Territories (these don't have GeoJSON files but we need to handle them)
  '60': 'AS', '66': 'GU', '69': 'MP', '72': 'PR', '78': 'VI'
};

// Path to the GeoJSON files in our project
const GEOJSON_SOURCE_PATH = path.join(__dirname, '../public/district_data/geojson');

async function generateRealDistrictGeojsonFixed() {
  try {
    console.log('🗺️ Generating real congressional district boundaries with API data (FIXED VERSION)...');

    // Check if GeoJSON source directory exists
    if (!fs.existsSync(GEOJSON_SOURCE_PATH)) {
      console.error('❌ GeoJSON source directory not found:', GEOJSON_SOURCE_PATH);
      return false;
    }

    // Create public directory if it doesn't exist
    const publicDir = path.join(__dirname, '../public/districts');
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true });
    }

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
      console.log(`🔍 Created real data lookup: ${key} for ${district.incumbent_name}`);
    });

    // Read all GeoJSON files from the source directory
    const files = fs.readdirSync(GEOJSON_SOURCE_PATH)
      .filter(file => file.endsWith('.geojson'))
      .sort();

    console.log(`📁 Found ${files.length} state district files`);

    const allFeatures = [];
    let totalDistricts = 0;
    let districtsWithRealData = 0;
    let districtsWithSampleData = 0;

    // Process each state file
    files.forEach(file => {
      try {
        const filePath = path.join(GEOJSON_SOURCE_PATH, file);
        const stateData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        
        console.log(`📄 Processing ${file} with ${stateData.features.length} features`);

        stateData.features.forEach(feature => {
          const properties = feature.properties;
          
          // Extract state and district from FIPS codes
          const stateFips = properties.STATEFP;
          const districtFips = properties.CD119FP;
          const stateAbbr = stateFipsToAbbr[stateFips];
          
          if (!stateAbbr) {
            console.log(`⚠️ Unknown state FIPS: ${stateFips}, skipping`);
            return;
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
            return;
          }

          // Create the lookup key in API format
          const lookupKey = `${stateAbbr}-${districtNumber}`;
          
          // Look for real data using the properly formatted key
          const realData = realDataLookup.get(lookupKey);

          if (realData) {
            console.log(`✅ Found real data for ${lookupKey}: ${realData.incumbent_name}`);
            allFeatures.push({
              ...feature,
              properties: {
                ...properties, // Preserve original Census properties
                state: stateAbbr,
                district: districtNumber,
                district_name: realData.district_name,
                incumbent_name: realData.incumbent_name,
                incumbent_party: realData.incumbent_party,
                incumbent_israel_score: realData.incumbent_israel_score,
                incumbent_total_israel_funding: realData.incumbent_total_israel_funding,
                incumbent_cash_on_hand: realData.incumbent_cash_on_hand,
                status: 'FILLED',
                voting: true,
                district_type: 'real_census',
                lookup_key: lookupKey
              }
            });
            districtsWithRealData++;
          } else {
            console.log(`⚠️ No real data found for ${lookupKey}, using fallback`);
            // Fallback to sample data if no real data found
            const isRepublican = Math.random() > 0.5;
            const party = isRepublican ? 'REP' : 'DEM';
            let baseScore = isRepublican ? 1.5 : 3.5;
            baseScore += (Math.random() - 0.5) * 2;
            const israelScore = Math.max(0, Math.min(5, baseScore));

            allFeatures.push({
              ...feature,
              properties: {
                ...properties, // Preserve original Census properties
                state: stateAbbr,
                district: districtNumber,
                district_name: `${stateAbbr} District ${districtNumber}`,
                incumbent_name: `Sample Incumbent ${totalDistricts + 1}`,
                incumbent_party: party,
                incumbent_israel_score: parseFloat(israelScore.toFixed(1)),
                incumbent_total_israel_funding: Math.floor(Math.random() * 150000) + 5000,
                incumbent_cash_on_hand: Math.floor(Math.random() * 500000) + 50000,
                status: 'FILLED',
                voting: true,
                district_type: 'real_census',
                lookup_key: lookupKey
              }
            });
            districtsWithSampleData++;
          }
          totalDistricts++;
        });
      } catch (error) {
        console.error(`❌ Error processing ${file}:`, error.message);
      }
    });

    // Write the combined GeoJSON file
    const outputPath = path.join(publicDir, 'congressional-districts-fixed.json');
    const combinedGeoJSON = {
      type: 'FeatureCollection',
      features: allFeatures
    };

    fs.writeFileSync(outputPath, JSON.stringify(combinedGeoJSON, null, 2));
    console.log(`✅ Combined GeoJSON written to: ${outputPath}`);

    // Write summary
    const summary = {
      total_districts: totalDistricts,
      districts_with_real_data: districtsWithRealData,
      districts_with_sample_data: districtsWithSampleData,
      success_rate: Math.round((districtsWithRealData / totalDistricts) * 100),
      created_at: new Date().toISOString(),
      note: 'Fixed FIPS to API district number mapping'
    };

    const summaryPath = path.join(publicDir, 'geojson-summary-fixed.json');
    fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
    console.log(`✅ Summary written to: ${summaryPath}`);

    console.log(`\n📊 Summary:`);
    console.log(`   Total districts: ${totalDistricts}`);
    console.log(`   Districts with real data: ${districtsWithRealData}`);
    console.log(`   Districts with sample data: ${districtsWithSampleData}`);
    console.log(`   Success rate: ${summary.success_rate}%`);

    return true;
  } catch (error) {
    console.error('❌ Error generating real district GeoJSON:', error);
    return false;
  }
}

generateRealDistrictGeojsonFixed();
