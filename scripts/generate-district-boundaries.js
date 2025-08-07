const fs = require('fs');
const path = require('path');

// Simplified state coordinates for creating district boundaries
const stateCoordinates = {
  'AL': [[-88.5, 30.5], [-84.5, 30.5], [-84.5, 35.5], [-88.5, 35.5], [-88.5, 30.5]],
  'AK': [[-180, 51], [-130, 51], [-130, 72], [-180, 72], [-180, 51]],
  'AZ': [[-114.5, 31.5], [-109.5, 31.5], [-109.5, 37.5], [-114.5, 37.5], [-114.5, 31.5]],
  'AR': [[-94.5, 33.5], [-89.5, 33.5], [-89.5, 36.5], [-94.5, 36.5], [-94.5, 33.5]],
  'CA': [[-124.5, 32.5], [-114.5, 32.5], [-114.5, 42.5], [-124.5, 42.5], [-124.5, 32.5]],
  'CO': [[-109.5, 37.5], [-102.5, 37.5], [-102.5, 41.5], [-109.5, 41.5], [-109.5, 37.5]],
  'CT': [[-73.5, 41.5], [-71.5, 41.5], [-71.5, 42.5], [-73.5, 42.5], [-73.5, 41.5]],
  'DE': [[-75.5, 38.5], [-74.5, 38.5], [-74.5, 39.5], [-75.5, 39.5], [-75.5, 38.5]],
  'FL': [[-87.5, 25.5], [-80.5, 25.5], [-80.5, 31.5], [-87.5, 31.5], [-87.5, 25.5]],
  'GA': [[-85.5, 30.5], [-80.5, 30.5], [-80.5, 35.5], [-85.5, 35.5], [-85.5, 30.5]],
  'HI': [[-160, 18], [-154, 18], [-154, 23], [-160, 23], [-160, 18]],
  'ID': [[-117.5, 42.5], [-111.5, 42.5], [-111.5, 49.5], [-117.5, 49.5], [-117.5, 42.5]],
  'IL': [[-91.5, 37.5], [-87.5, 37.5], [-87.5, 42.5], [-91.5, 42.5], [-91.5, 37.5]],
  'IN': [[-88.5, 37.5], [-84.5, 37.5], [-84.5, 41.5], [-88.5, 41.5], [-88.5, 37.5]],
  'IA': [[-96.5, 40.5], [-90.5, 40.5], [-90.5, 43.5], [-96.5, 43.5], [-96.5, 40.5]],
  'KS': [[-102.5, 37.5], [-94.5, 37.5], [-94.5, 40.5], [-102.5, 40.5], [-102.5, 37.5]],
  'KY': [[-89.5, 36.5], [-81.5, 36.5], [-81.5, 39.5], [-89.5, 39.5], [-89.5, 36.5]],
  'LA': [[-94.5, 29.5], [-88.5, 29.5], [-88.5, 33.5], [-94.5, 33.5], [-94.5, 29.5]],
  'ME': [[-71.5, 43.5], [-66.5, 43.5], [-66.5, 47.5], [-71.5, 47.5], [-71.5, 43.5]],
  'MD': [[-79.5, 37.5], [-75.5, 37.5], [-75.5, 39.5], [-79.5, 39.5], [-79.5, 37.5]],
  'MA': [[-73.5, 41.5], [-69.5, 41.5], [-69.5, 43.5], [-73.5, 43.5], [-73.5, 41.5]],
  'MI': [[-90.5, 41.5], [-82.5, 41.5], [-82.5, 46.5], [-90.5, 46.5], [-90.5, 41.5]],
  'MN': [[-97.5, 43.5], [-89.5, 43.5], [-89.5, 49.5], [-97.5, 49.5], [-97.5, 43.5]],
  'MS': [[-91.5, 30.5], [-88.5, 30.5], [-88.5, 35.5], [-91.5, 35.5], [-91.5, 30.5]],
  'MO': [[-95.5, 36.5], [-89.5, 36.5], [-89.5, 40.5], [-95.5, 40.5], [-95.5, 36.5]],
  'MT': [[-116.5, 45.5], [-104.5, 45.5], [-104.5, 49.5], [-116.5, 49.5], [-116.5, 45.5]],
  'NE': [[-104.5, 40.5], [-95.5, 40.5], [-95.5, 43.5], [-104.5, 43.5], [-104.5, 40.5]],
  'NV': [[-120.5, 35.5], [-114.5, 35.5], [-114.5, 42.5], [-120.5, 42.5], [-120.5, 35.5]],
  'NH': [[-72.5, 42.5], [-70.5, 42.5], [-70.5, 45.5], [-72.5, 45.5], [-72.5, 42.5]],
  'NJ': [[-75.5, 38.5], [-73.5, 38.5], [-73.5, 41.5], [-75.5, 41.5], [-75.5, 38.5]],
  'NM': [[-109.5, 31.5], [-103.5, 31.5], [-103.5, 37.5], [-109.5, 37.5], [-109.5, 31.5]],
  'NY': [[-79.5, 40.5], [-71.5, 40.5], [-71.5, 45.5], [-79.5, 45.5], [-79.5, 40.5]],
  'NC': [[-84.5, 33.5], [-75.5, 33.5], [-75.5, 36.5], [-84.5, 36.5], [-84.5, 33.5]],
  'ND': [[-104.5, 45.5], [-96.5, 45.5], [-96.5, 49.5], [-104.5, 49.5], [-104.5, 45.5]],
  'OH': [[-84.5, 38.5], [-80.5, 38.5], [-80.5, 42.5], [-84.5, 42.5], [-84.5, 38.5]],
  'OK': [[-100.5, 33.5], [-94.5, 33.5], [-94.5, 37.5], [-100.5, 37.5], [-100.5, 33.5]],
  'OR': [[-124.5, 42.5], [-116.5, 42.5], [-116.5, 46.5], [-124.5, 46.5], [-124.5, 42.5]],
  'PA': [[-80.5, 39.5], [-75.5, 39.5], [-75.5, 42.5], [-80.5, 42.5], [-80.5, 39.5]],
  'RI': [[-71.5, 41.5], [-71.5, 41.5], [-71.5, 42.5], [-71.5, 42.5], [-71.5, 41.5]],
  'SC': [[-83.5, 32.5], [-78.5, 32.5], [-78.5, 35.5], [-83.5, 35.5], [-83.5, 32.5]],
  'SD': [[-104.5, 43.5], [-96.5, 43.5], [-96.5, 46.5], [-104.5, 46.5], [-104.5, 43.5]],
  'TN': [[-90.5, 34.5], [-81.5, 34.5], [-81.5, 36.5], [-90.5, 36.5], [-90.5, 34.5]],
  'TX': [[-106.5, 26.5], [-93.5, 26.5], [-93.5, 36.5], [-106.5, 36.5], [-106.5, 26.5]],
  'UT': [[-114.5, 37.5], [-109.5, 37.5], [-109.5, 42.5], [-114.5, 42.5], [-114.5, 37.5]],
  'VT': [[-73.5, 42.5], [-71.5, 42.5], [-71.5, 45.5], [-73.5, 45.5], [-73.5, 42.5]],
  'VA': [[-83.5, 36.5], [-75.5, 36.5], [-75.5, 39.5], [-83.5, 39.5], [-83.5, 36.5]],
  'WA': [[-124.5, 45.5], [-116.5, 45.5], [-116.5, 49.5], [-124.5, 49.5], [-124.5, 45.5]],
  'WV': [[-82.5, 37.5], [-77.5, 37.5], [-77.5, 40.5], [-82.5, 40.5], [-82.5, 37.5]],
  'WI': [[-92.5, 42.5], [-86.5, 42.5], [-86.5, 47.5], [-92.5, 47.5], [-92.5, 42.5]],
  'WY': [[-111.5, 41.5], [-104.5, 41.5], [-104.5, 45.5], [-111.5, 45.5], [-111.5, 41.5]]
};

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

// Generate comprehensive district data
function generateAllDistricts() {
  const allDistricts = [];
  
  Object.entries(districtCounts).forEach(([state, count]) => {
    for (let i = 1; i <= count; i++) {
      // Generate sample data for each district
      const districtName = count === 1 ? `${state} At-Large` : `${state} District ${i}`;
      
      // Generate realistic sample data
      const isRepublican = Math.random() > 0.5;
      const party = isRepublican ? 'REP' : 'DEM';
      
      // Generate humanity score based on party (with some variation)
      let baseScore = isRepublican ? 1.5 : 3.5;
      baseScore += (Math.random() - 0.5) * 2; // Add variation
      const humanityScore = Math.max(0, Math.min(5, baseScore));
      
      // Generate funding data
      const israelFunding = Math.floor(Math.random() * 150000) + 5000;
      const cashOnHand = Math.floor(Math.random() * 500000) + 50000;
      
      // Generate incumbent name (simplified)
      const incumbentName = `Sample Incumbent ${i}`;
      
      allDistricts.push({
        state: state,
        district: i.toString(),
        district_name: districtName,
        incumbent_name: incumbentName,
        incumbent_party: party,
        incumbent_humanity_score: parseFloat(humanityScore.toFixed(1)),
        incumbent_total_israel_funding: israelFunding,
        incumbent_cash_on_hand: cashOnHand,
        status: 'FILLED',
        voting: true
      });
    }
  });
  
  return allDistricts;
}

async function generateDistrictBoundaries() {
  try {
    console.log('🗺️ Starting congressional district boundary generation...');
    
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
    
    console.log('📊 Creating comprehensive congressional district boundaries...');
    
    // Generate all 435 districts
    const allDistricts = generateAllDistricts();
    console.log(`📊 Generated ${allDistricts.length} districts`);
    
    const features = [];
    
    allDistricts.forEach((district) => {
      const stateCoords = stateCoordinates[district.state];
      if (!stateCoords) {
        console.log(`⚠️ No coordinates for state: ${district.state}`);
        return;
      }
      
      // Calculate district position within the state
      const districtIndex = parseInt(district.district) || 1;
      const totalDistrictsInState = districtCounts[district.state] || 1;
      
      // Create a subdivision of the state for this district
      const stateWidth = stateCoords[2][0] - stateCoords[0][0];
      const stateHeight = stateCoords[2][1] - stateCoords[0][1];
      
      // Calculate district boundaries (simplified rectangular subdivision)
      const districtWidth = stateWidth / Math.max(totalDistrictsInState, 1);
      const districtStartX = stateCoords[0][0] + (districtIndex - 1) * districtWidth;
      const districtEndX = districtStartX + districtWidth;
      
      const districtCoords = [
        [districtStartX, stateCoords[0][1]],
        [districtEndX, stateCoords[0][1]],
        [districtEndX, stateCoords[2][1]],
        [districtStartX, stateCoords[2][1]],
        [districtStartX, stateCoords[0][1]]
      ];
      
      features.push({
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [districtCoords]
        },
        properties: {
          state: district.state,
          district: district.district,
          district_name: district.district_name,
          incumbent_name: district.incumbent_name,
          incumbent_party: district.incumbent_party,
          incumbent_humanity_score: district.incumbent_humanity_score || 0,
          incumbent_total_israel_funding: district.incumbent_total_israel_funding || 0,
          incumbent_cash_on_hand: district.incumbent_cash_on_hand || 0,
          status: district.status,
          voting: district.voting
        }
      });
    });
    
    const geojson = {
      type: 'FeatureCollection',
      features: features
    };
    
    // Write the GeoJSON file
    const outputPath = path.join(districtsDir, 'congressional-districts.json');
    fs.writeFileSync(outputPath, JSON.stringify(geojson, null, 2));
    
    console.log(`✅ Created congressional district boundaries with ${features.length} districts`);
    console.log(`📁 Saved to: ${outputPath}`);
    
    // Also create a summary file
    const summary = {
      total_districts: features.length,
      states_covered: [...new Set(features.map(f => f.properties.state))].length,
      districts_with_data: features.filter(f => f.properties.incumbent_humanity_score > 0).length,
      created_at: new Date().toISOString()
    };
    
    const summaryPath = path.join(districtsDir, 'summary.json');
    fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
    
    console.log('📊 Summary:', summary);
    
  } catch (error) {
    console.error('❌ Error generating congressional districts:', error);
    process.exit(1);
  }
}

// Run the script
generateDistrictBoundaries(); 