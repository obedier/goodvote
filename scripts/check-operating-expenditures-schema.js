#!/usr/bin/env node

const { Pool } = require('pg');
require('dotenv').config();

const fecCompleteConfig = {
  host: process.env.FEC_DB_HOST || 'localhost',
  port: parseInt(process.env.FEC_DB_PORT || '5432'),
  database: process.env.FEC_DB_NAME || 'fec_gold',
  user: process.env.FEC_DB_USER || 'osamabedier',
  password: process.env.FEC_DB_PASSWORD || '',
};

const fecCompletePool = new Pool(fecCompleteConfig);

async function checkOperatingExpendituresSchema() {
  try {
    console.log('🔍 Checking operating_expenditures table schema...');
    
    // Get column information
    const columnsQuery = `
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'operating_expenditures'
      ORDER BY ordinal_position
    `;
    
    const columnsResult = await fecCompletePool.query(columnsQuery);
    
    console.log('\n📊 Operating Expenditures Table Columns:');
    console.log('='.repeat(50));
    columnsResult.rows.forEach((row, index) => {
      console.log(`${index + 1}. ${row.column_name} (${row.data_type}) - ${row.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });
    
    // Check a few sample records
    const sampleQuery = `
      SELECT *
      FROM operating_expenditures
      WHERE file_year = 2024
      AND cmte_id = 'C00799031'  -- UDP
      LIMIT 5
    `;
    
    const sampleResult = await fecCompletePool.query(sampleQuery);
    
    console.log('\n📊 Sample UDP Operating Expenditures:');
    console.log('='.repeat(45));
    
    if (sampleResult.rows.length > 0) {
      sampleResult.rows.forEach((row, index) => {
        console.log(`Record ${index + 1}:`);
        Object.keys(row).forEach(key => {
          console.log(`  ${key}: ${row[key]}`);
        });
        console.log('');
      });
    } else {
      console.log('No UDP operating expenditures found');
    }
    
    console.log('✅ Analysis complete!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await fecCompletePool.end();
  }
}

checkOperatingExpendituresSchema(); 