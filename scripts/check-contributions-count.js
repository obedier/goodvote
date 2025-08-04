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

async function checkContributionsCount() {
  try {
    console.log('🔍 Checking Individual Contributions Count...\n');
    
    // Check what years are available
    console.log('1. Checking available years in individual_contributions...');
    const yearsQuery = `
      SELECT DISTINCT file_year, COUNT(*) as count
      FROM individual_contributions
      GROUP BY file_year
      ORDER BY file_year DESC
      LIMIT 10
    `;
    
    const yearsResult = await pool.query(yearsQuery);
    console.log('Available years:', yearsResult.rows);
    
    // Check specific years
    const testYears = [2024, 2026, 2022, 2020];
    
    for (const year of testYears) {
      console.log(`\n2. Checking ${year}...`);
      try {
        const countQuery = `
          SELECT COUNT(*) as count
          FROM individual_contributions
          WHERE file_year = $1
        `;
        
        const result = await pool.query(countQuery, [year]);
        console.log(`${year}: ${result.rows[0].count} records`);
      } catch (error) {
        console.log(`${year}: Error - ${error.message}`);
      }
    }
    
    // Check if there are any records at all
    console.log('\n3. Checking total records...');
    const totalQuery = `
      SELECT COUNT(*) as total_count
      FROM individual_contributions
    `;
    
    const totalResult = await pool.query(totalQuery);
    console.log(`Total individual contributions: ${totalResult.rows[0].total_count}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkContributionsCount(); 