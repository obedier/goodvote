#!/usr/bin/env node

const { Pool } = require('pg');
require('dotenv').config();

const fecConfig = {
  host: process.env.FEC_DB_HOST || 'localhost',
  port: parseInt(process.env.FEC_DB_PORT || '5432'),
  database: process.env.FEC_DB_NAME || 'fec_gold',
  user: process.env.FEC_DB_USER || 'osamabedier',
  password: process.env.FEC_DB_PASSWORD || '',
};

const pool = new Pool(fecConfig);

async function checkContributionsSchema() {
  try {
    console.log('🔍 Checking Individual Contributions Schema...\n');
    
    // Get all columns
    const result = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'individual_contributions' 
      ORDER BY ordinal_position
    `);
    
    console.log('📋 Individual Contributions Columns:');
    result.rows.forEach(row => {
      console.log(`  ${row.column_name} (${row.data_type})`);
    });
    
    // Check for year-related columns
    console.log('\n📋 Year-related columns:');
    const yearColumns = result.rows.filter(row => 
      row.column_name.toLowerCase().includes('year') || 
      row.column_name.toLowerCase().includes('yr') ||
      row.column_name.toLowerCase().includes('date')
    );
    
    yearColumns.forEach(row => {
      console.log(`  ${row.column_name} (${row.data_type})`);
    });
    
    // Check sample data
    console.log('\n📋 Sample data:');
    const sampleResult = await pool.query(`
      SELECT * FROM individual_contributions 
      LIMIT 1
    `);
    
    if (sampleResult.rows.length > 0) {
      const sample = sampleResult.rows[0];
      Object.keys(sample).forEach(key => {
        console.log(`  ${key}: ${sample[key]}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Schema check failed:', error.message);
  } finally {
    await pool.end();
  }
}

checkContributionsSchema(); 