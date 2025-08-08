const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

// Database connection
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: 'fec_gold',
  user: process.env.DB_USER || 'osamabedier',
  password: process.env.DB_PASSWORD || '',
});

async function getDistrictData() {
  const client = await pool.connect();
  try {
    // Query to get contribution data by congressional district
    const query = `
      SELECT 
        c.cand_office_district as candidate_district,
        c.cand_office_st as candidate_state,
        COUNT(*) as contribution_count,
        SUM(ic.transaction_amt) as total_amount,
        AVG(ic.transaction_amt) as avg_amount,
        COUNT(DISTINCT ic.name) as unique_contributors
      FROM individual_contributions ic
      JOIN committee_master cm ON ic.cmte_id = cm.cmte_id
      JOIN candidate_master c ON cm.cand_id = c.cand_id
      WHERE ic.file_year = 2024
        AND c.cand_office_district IS NOT NULL
        AND c.cand_office_st IS NOT NULL
        AND c.cand_office = 'H'
      GROUP BY c.cand_office_district, c.cand_office_st
      ORDER BY c.cand_office_st, c.cand_office_district
    `;
    
    const result = await client.query(query);
    return result.rows;
  } finally {
    client.release();
  }
}

function getStateFIPS(stateCode) {
  const stateFIPS = {
    'AL': '01', 'AK': '02', 'AZ': '04', 'AR': '05', 'CA': '06',
    'CO': '08', 'CT': '09', 'DE': '10', 'FL': '12', 'GA': '13',
    'HI': '15', 'ID': '16', 'IL': '17', 'IN': '18', 'IA': '19',
    'KS': '20', 'KY': '21', 'LA': '22', 'ME': '23', 'MD': '24',
    'MA': '25', 'MI': '26', 'MN': '27', 'MS': '28', 'MO': '29',
    'MT': '30', 'NE': '31', 'NV': '32', 'NH': '33', 'NJ': '34',
    'NM': '35', 'NY': '36', 'NC': '37', 'ND': '38', 'OH': '39',
    'OK': '40', 'OR': '41', 'PA': '42', 'RI': '44', 'SC': '45',
    'SD': '46', 'TN': '47', 'TX': '48', 'UT': '49', 'VT': '50',
    'VA': '51', 'WA': '53', 'WV': '54', 'WI': '55', 'WY': '56'
  };
  return stateFIPS[stateCode] || '00';
}

function generateDistrictGeoJSON(districtData) {
  // Read the example district boundaries
  const examplePath = path.join(__dirname, '../../goodvote2/data/geojson/01_cd119.geojson');
  let exampleGeoJSON;
  
  try {
    exampleGeoJSON = JSON.parse(fs.readFileSync(examplePath, 'utf8'));
  } catch (error) {
    console.error('Could not read example GeoJSON file:', error.message);
    return null;
  }

  const features = [];
  const processedDistricts = new Set();

  // Process each district from our database
  for (const district of districtData) {
    const stateFIPS = getStateFIPS(district.candidate_state);
    const districtFIPS = district.candidate_district.toString().padStart(2, '0');
    const geoid = `${stateFIPS}${districtFIPS}`;
    
    if (processedDistricts.has(geoid)) continue;
    processedDistricts.add(geoid);

    // Find matching feature from example (or create a placeholder)
    let geometry = null;
    if (exampleGeoJSON.features.length > 0) {
      // Use the first feature's geometry as a template
      geometry = exampleGeoJSON.features[0].geometry;
    }

    const feature = {
      type: "Feature",
      properties: {
        STATEFP: stateFIPS,
        CD119FP: districtFIPS,
        GEOID: geoid,
        GEOIDFQ: `5001900US${geoid}`,
        NAMELSAD: `Congressional District ${district.candidate_district}`,
        LSAD: "C2",
        CDSESSN: "119",
        MTFCC: "G5200",
        FUNCSTAT: "N",
        ALAND: 0, // Placeholder
        AWATER: 0, // Placeholder
        INTPTLAT: "+0.0000000", // Placeholder
        INTPTLON: "+0.0000000", // Placeholder
        // Our custom properties
        contribution_count: district.contribution_count,
        total_amount: parseFloat(district.total_amount || 0),
        avg_amount: parseFloat(district.avg_amount || 0),
        unique_contributors: district.unique_contributors,
        state: district.candidate_state,
        district: district.candidate_district
      },
      geometry: geometry
    };

    features.push(feature);
  }

  return {
    type: "FeatureCollection",
    crs: {
      type: "name",
      properties: {
        name: "urn:ogc:def:crs:OGC:1.3:CRS84"
      }
    },
    features: features
  };
}

async function main() {
  try {
    console.log('Fetching district data from database...');
    const districtData = await getDistrictData();
    
    console.log(`Found ${districtData.length} districts with data`);
    
    console.log('Generating GeoJSON...');
    const geoJSON = generateDistrictGeoJSON(districtData);
    
    if (!geoJSON) {
      console.error('Failed to generate GeoJSON');
      return;
    }

    const outputPath = path.join(__dirname, '../public/districts/congressional-districts-with-data.json');
    
    // Ensure directory exists
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(outputPath, JSON.stringify(geoJSON, null, 2));
    console.log(`GeoJSON file written to: ${outputPath}`);
    console.log(`Generated ${geoJSON.features.length} district features`);
    
    // Log some sample data
    console.log('\nSample district data:');
    geoJSON.features.slice(0, 3).forEach(feature => {
      console.log(`${feature.properties.state} District ${feature.properties.district}: ${feature.properties.contribution_count} contributions, $${feature.properties.total_amount.toLocaleString()} total`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  main();
}

module.exports = { generateDistrictGeoJSON, getDistrictData };
