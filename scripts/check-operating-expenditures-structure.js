const { Pool } = require('pg');

const fecCompleteConfig = {
  host: process.env.FEC_DB_HOST || process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.FEC_DB_PORT || process.env.DB_PORT || '5432'),
  database: process.env.FEC_DB_NAME || 'fec_gold',
  user: process.env.FEC_DB_USER || process.env.DB_USER || 'osamabedier',
  password: process.env.FEC_DB_PASSWORD || process.env.DB_PASSWORD || '',
  max: 3,
  min: 0,
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 3000,
  acquireTimeoutMillis: 3000,
};

const fecPool = new Pool(fecCompleteConfig);

async function checkOperatingExpendituresStructure() {
  try {
    console.log('🔍 Checking Operating Expenditures Table Structure\n');
    console.log('================================================================================');

    // Check table structure
    const structureQuery = `
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'operating_expenditures'
      ORDER BY ordinal_position
    `;

    const structureResult = await fecPool.query(structureQuery);
    
    console.log('📊 Operating Expenditures Table Columns:');
    structureResult.rows.forEach((row, index) => {
      console.log(`   ${index + 1}. ${row.column_name} (${row.data_type}, nullable: ${row.is_nullable})`);
    });

    // Check sample data
    const sampleQuery = `
      SELECT *
      FROM operating_expenditures
      WHERE file_year = 2024
      LIMIT 3
    `;

    const sampleResult = await fecPool.query(sampleQuery);
    
    if (sampleResult.rows.length > 0) {
      console.log('\n📊 Sample Operating Expenditures Data:');
      sampleResult.rows.forEach((row, index) => {
        console.log(`\n   Sample ${index + 1}:`);
        Object.keys(row).forEach(key => {
          if (row[key] !== null) {
            console.log(`     ${key}: ${row[key]}`);
          }
        });
      });
    } else {
      console.log('\n📊 No sample operating expenditures found');
    }

    console.log('\n✅ Operating expenditures structure check completed!');
    
  } catch (error) {
    console.error('❌ Error checking operating expenditures structure:', error);
  } finally {
    await fecPool.end();
  }
}

checkOperatingExpendituresStructure(); 