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

async function checkStateData() {
  try {
    console.log('🔍 Checking State Data Availability...\n');
    
    // Check what's in the state summary view
    console.log('1. Checking state_contributions_summary view...');
    const summaryQuery = `
      SELECT state, file_year, contribution_count, total_amount
      FROM state_contributions_summary
      ORDER BY file_year DESC, total_amount DESC
      LIMIT 10
    `;
    
    const summaryResult = await pool.query(summaryQuery);
    console.log('State summary data:', summaryResult.rows);
    
    // Check what states have data
    console.log('\n2. Checking available states...');
    const statesQuery = `
      SELECT DISTINCT state, COUNT(*) as records
      FROM state_contributions_summary
      GROUP BY state
      ORDER BY records DESC
      LIMIT 10
    `;
    
    const statesResult = await pool.query(statesQuery);
    console.log('Available states:', statesResult.rows);
    
    // Check what years have data
    console.log('\n3. Checking available years...');
    const yearsQuery = `
      SELECT DISTINCT file_year, COUNT(*) as records
      FROM state_contributions_summary
      GROUP BY file_year
      ORDER BY file_year DESC
    `;
    
    const yearsResult = await pool.query(yearsQuery);
    console.log('Available years:', yearsResult.rows);
    
    // Check individual contributions by state
    console.log('\n4. Checking individual contributions by state...');
    const contribQuery = `
      SELECT 
        state,
        COUNT(*) as contribution_count,
        SUM(transaction_amt) as total_amount
      FROM individual_contributions
      WHERE file_year = 2024
      GROUP BY state
      ORDER BY total_amount DESC
      LIMIT 10
    `;
    
    const contribResult = await pool.query(contribQuery);
    console.log('Individual contributions by state (2024):', contribResult.rows);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkStateData(); 