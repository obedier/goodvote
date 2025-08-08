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

async function createDistrictMappingTable() {
  try {
    console.log('🗺️ Creating district name to FIPS mapping table...');
    
    // Load the original GeoJSON file to get all districts
    const originalPath = path.join(__dirname, '../public/districts/congressional-districts.json');
    const originalData = JSON.parse(fs.readFileSync(originalPath, 'utf8'));
    
    // Load the API data to get real district names
    console.log('📊 Fetching real district data from API...');
    const response = await fetch('http://localhost:3001/api/house-districts');
    const apiData = await response.json();
    
    if (!apiData.success) {
      throw new Error('Failed to fetch API data');
    }
    
    const realDistricts = apiData.data || [];
    console.log(`📊 Fetched ${realDistricts.length} real districts from API`);
    
    // Create mapping table
    const mappingTable = [];
    const unmatchedApiDistricts = [];
    const unmatchedGeoJsonDistricts = [];
    
    // Process each GeoJSON feature
    originalData.features.forEach(feature => {
      const props = feature.properties;
      const stateFips = props.STATEFP;
      const districtFips = props.CD119FP;
      const stateAbbr = stateFipsToAbbr[stateFips];
      
      if (!stateAbbr) {
        console.log(`⚠️ Unknown state FIPS: ${stateFips}`);
        return;
      }
      
      // Create the key that the API uses
      const geoJsonKey = `${stateAbbr}-${districtFips}`;
      
      // Find matching API district
      const matchingApiDistrict = realDistricts.find(apiDistrict => {
        // Try different matching strategies
        const apiDistrictMatch = apiDistrict.district_name.match(/District (\d+)/);
        const apiDistrictNumber = apiDistrictMatch ? apiDistrictMatch[1] : apiDistrict.district;
        const apiKey = `${apiDistrict.state}-${apiDistrictNumber}`;
        
        return apiKey === geoJsonKey;
      });
      
      if (matchingApiDistrict) {
        mappingTable.push({
          geoJsonKey: geoJsonKey,
          stateFips: stateFips,
          districtFips: districtFips,
          stateAbbr: stateAbbr,
          apiDistrictName: matchingApiDistrict.district_name,
          apiState: matchingApiDistrict.state,
          apiDistrictNumber: matchingApiDistrict.district,
          incumbentName: matchingApiDistrict.incumbent_name,
          incumbentParty: matchingApiDistrict.incumbent_party,
          incumbentIsraelScore: matchingApiDistrict.incumbent_israel_score,
          incumbentTotalIsraelFunding: matchingApiDistrict.incumbent_total_israel_funding,
          incumbentCashOnHand: matchingApiDistrict.incumbent_cash_on_hand,
          matched: true
        });
        console.log(`✅ Matched: ${geoJsonKey} → ${matchingApiDistrict.district_name}`);
      } else {
        unmatchedGeoJsonDistricts.push({
          geoJsonKey: geoJsonKey,
          stateFips: stateFips,
          districtFips: districtFips,
          stateAbbr: stateAbbr
        });
        console.log(`❌ No API match for: ${geoJsonKey}`);
      }
    });
    
    // Find API districts that weren't matched
    const matchedApiKeys = mappingTable.map(m => `${m.apiState}-${m.apiDistrictNumber}`);
    realDistricts.forEach(apiDistrict => {
      const apiDistrictMatch = apiDistrict.district_name.match(/District (\d+)/);
      const apiDistrictNumber = apiDistrictMatch ? apiDistrictMatch[1] : apiDistrict.district;
      const apiKey = `${apiDistrict.state}-${apiDistrictNumber}`;
      
      if (!matchedApiKeys.includes(apiKey)) {
        unmatchedApiDistricts.push({
          apiKey: apiKey,
          districtName: apiDistrict.district_name,
          state: apiDistrict.state,
          district: apiDistrict.district,
          incumbentName: apiDistrict.incumbent_name
        });
        console.log(`❌ No GeoJSON match for: ${apiKey} (${apiDistrict.district_name})`);
      }
    });
    
    // Save mapping table
    const mappingPath = path.join(__dirname, '../public/districts/district-mapping-table.json');
    fs.writeFileSync(mappingPath, JSON.stringify({
      mappingTable: mappingTable,
      unmatchedGeoJsonDistricts: unmatchedGeoJsonDistricts,
      unmatchedApiDistricts: unmatchedApiDistricts,
      summary: {
        totalGeoJsonDistricts: originalData.features.length,
        totalApiDistricts: realDistricts.length,
        matchedDistricts: mappingTable.length,
        unmatchedGeoJson: unmatchedGeoJsonDistricts.length,
        unmatchedApi: unmatchedApiDistricts.length,
        matchRate: Math.round((mappingTable.length / originalData.features.length) * 100)
      },
      created_at: new Date().toISOString()
    }, null, 2));
    
    console.log('\n📊 MAPPING SUMMARY:');
    console.log(`  Total GeoJSON districts: ${originalData.features.length}`);
    console.log(`  Total API districts: ${realDistricts.length}`);
    console.log(`  Matched districts: ${mappingTable.length}`);
    console.log(`  Unmatched GeoJSON: ${unmatchedGeoJsonDistricts.length}`);
    console.log(`  Unmatched API: ${unmatchedApiDistricts.length}`);
    console.log(`  Match rate: ${Math.round((mappingTable.length / originalData.features.length) * 100)}%`);
    
    if (unmatchedGeoJsonDistricts.length > 0) {
      console.log('\n❌ Unmatched GeoJSON districts:');
      unmatchedGeoJsonDistricts.forEach(d => {
        console.log(`  - ${d.geoJsonKey} (FIPS: ${d.stateFips}-${d.districtFips})`);
      });
    }
    
    if (unmatchedApiDistricts.length > 0) {
      console.log('\n❌ Unmatched API districts:');
      unmatchedApiDistricts.forEach(d => {
        console.log(`  - ${d.apiKey}: ${d.districtName}`);
      });
    }
    
    console.log(`\n✅ Mapping table saved to: ${mappingPath}`);
    
    return true;
    
  } catch (error) {
    console.error('❌ Error creating district mapping table:', error);
    return false;
  }
}

// Run the mapping creation
createDistrictMappingTable().then(success => {
  if (success) {
    console.log('\n🎉 District mapping table created successfully!');
  } else {
    console.log('\n💥 District mapping table creation failed!');
    process.exit(1);
  }
});
