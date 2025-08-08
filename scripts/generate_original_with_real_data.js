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

async function generateOriginalWithRealData() {
  try {
    console.log('🗺️ Generating original congressional districts with real data...');
    
    // Load the original 387MB file
    const originalPath = path.join(__dirname, '../public/districts/congressional-districts.json');
    const originalData = JSON.parse(fs.readFileSync(originalPath, 'utf8'));
    
    console.log(`📊 Original file: ${originalData.features.length} features`);
    
    // Fetch real data from the API
    console.log('📊 Fetching real district data from API...');
    const response = await fetch('http://localhost:3000/api/house-districts');
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
    const updatedFeatures = [];
    let districtsWithRealData = 0;
    let districtsWithSampleData = 0;
    let districtsWithNullFunding = 0;
    
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
      
      // Create updated feature with real data
      const updatedFeature = {
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
          // Add metadata
          lookup_key: lookupKey,
          has_real_data: !!realData,
          funding_category: realData ? getFundingCategory(realData.incumbent_total_israel_funding) : 'sample'
        },
        geometry: feature.geometry
      };
      
      if (realData) {
        districtsWithRealData++;
        if (realData.incumbent_total_israel_funding === null || realData.incumbent_total_israel_funding === undefined) {
          districtsWithNullFunding++;
          console.log(`⚠️ Null funding for ${lookupKey}: ${realData.incumbent_name}`);
        } else {
          console.log(`✅ Found real data for ${lookupKey}: ${realData.incumbent_name} - $${realData.incumbent_total_israel_funding?.toLocaleString()}`);
        }
      } else {
        districtsWithSampleData++;
        console.log(`⚠️ No real data found for ${lookupKey}, using fallback`);
      }
      
      updatedFeatures.push(updatedFeature);
    }
    
    // Create updated GeoJSON
    const updatedData = {
      type: 'FeatureCollection',
      features: updatedFeatures
    };
    
    // Save updated file
    const updatedPath = path.join(__dirname, '../public/districts/congressional-districts-original-with-real-data.json');
    fs.writeFileSync(updatedPath, JSON.stringify(updatedData, null, 2));
    
    // Calculate savings
    const originalSize = fs.statSync(originalPath).size;
    const updatedSize = fs.statSync(updatedPath).size;
    
    console.log('\n📊 ORIGINAL WITH REAL DATA RESULTS:');
    console.log(`  Original file size: ${(originalSize / 1024 / 1024).toFixed(1)} MB`);
    console.log(`  Updated file size: ${(updatedSize / 1024 / 1024).toFixed(1)} MB`);
    console.log(`  Districts with real data: ${districtsWithRealData}`);
    console.log(`  Districts with sample data: ${districtsWithSampleData}`);
    console.log(`  Districts with null funding: ${districtsWithNullFunding}`);
    console.log(`  Success rate: ${Math.round((districtsWithRealData / (districtsWithRealData + districtsWithSampleData)) * 100)}%`);
    
    // Write summary
    const summary = {
      total_districts: districtsWithRealData + districtsWithSampleData,
      districts_with_real_data: districtsWithRealData,
      districts_with_sample_data: districtsWithSampleData,
      districts_with_null_funding: districtsWithNullFunding,
      success_rate: Math.round((districtsWithRealData / (districtsWithRealData + districtsWithSampleData)) * 100),
      original_file_size_mb: (originalSize / 1024 / 1024).toFixed(1),
      updated_file_size_mb: (updatedSize / 1024 / 1024).toFixed(1),
      created_at: new Date().toISOString(),
      note: 'Original boundaries with real data and 3-color funding system'
    };
    
    const summaryPath = path.join(__dirname, '../public/districts/original-with-real-data-summary.json');
    fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
    
    console.log('\n✅ Original with real data complete!');
    console.log(`Files created: congressional-districts-original-with-real-data.json (${(updatedSize / 1024 / 1024).toFixed(1)} MB)`);
    console.log(`Summary saved: original-with-real-data-summary.json`);
    
    return true;
    
  } catch (error) {
    console.error('❌ Error in original with real data generation:', error);
    return false;
  }
}

function getFundingCategory(funding) {
  if (!funding || funding === null || funding === undefined) {
    return 'no-data';
  }
  if (funding < 1000) {
    return 'low'; // Green
  } else if (funding >= 1000 && funding <= 10000) {
    return 'medium'; // Yellow
  } else {
    return 'high'; // Red
  }
}

// Run the generation
generateOriginalWithRealData().then(success => {
  if (success) {
    console.log('\n🎉 Original with real data completed successfully!');
  } else {
    console.log('\n💥 Original with real data failed!');
    process.exit(1);
  }
});
