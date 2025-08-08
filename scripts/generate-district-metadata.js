const fs = require('fs');
const path = require('path');

async function generateDistrictMetadata() {
  try {
    console.log('🗺️ Generating district metadata from API...');

    // Create public/districts directory if it doesn't exist
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

    // Create a clean metadata object
    const districtMetadata = {};
    let districtsWithRealData = 0;

    realDistricts.forEach((district) => {
      const districtMatch = district.district_name.match(/District (\d+)/);
      const districtNumber = districtMatch ? districtMatch[1] : district.district;
      const key = `${district.state}-${districtNumber}`;
      
      districtMetadata[key] = {
        state: district.state,
        district_number: districtNumber,
        district_name: district.district_name,
        incumbent_name: district.incumbent_name,
        incumbent_party: district.incumbent_party,
        incumbent_israel_score: district.incumbent_israel_score,
        incumbent_total_israel_funding: district.incumbent_total_israel_funding,
        incumbent_cash_on_hand: district.incumbent_cash_on_hand,
        incumbent_person_id: district.incumbent_person_id,
        first_elected_year: district.first_elected_year,
        challenger_count: district.challenger_count,
        top_challenger_name: district.top_challenger_name,
        top_challenger_party: district.top_challenger_party,
        top_challenger_israel_score: district.top_challenger_israel_score,
        status: 'FILLED',
        voting: true
      };
      
      districtsWithRealData++;
      console.log(`✅ Added metadata for ${key}: ${district.incumbent_name}`);
    });

    // Write metadata file
    const metadataPath = path.join(publicDir, 'district-metadata.json');
    fs.writeFileSync(metadataPath, JSON.stringify(districtMetadata, null, 2));
    console.log(`✅ District metadata written to: ${metadataPath}`);

    // Create summary
    const summary = {
      total_districts: realDistricts.length,
      districts_with_real_data: districtsWithRealData,
      created_at: new Date().toISOString(),
      note: 'Clean district metadata from API',
      source: 'API data from /api/house-districts'
    };

    const summaryPath = path.join(publicDir, 'summary.json');
    fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
    console.log(`✅ Summary written to: ${summaryPath}`);

    console.log(`\n📊 Summary:`);
    console.log(`   Total districts: ${realDistricts.length}`);
    console.log(`   Districts with real data: ${districtsWithRealData}`);
    console.log(`   Success rate: 100%`);

    return true;
  } catch (error) {
    console.error('❌ Error generating district metadata:', error);
    return false;
  }
}

generateDistrictMetadata();
