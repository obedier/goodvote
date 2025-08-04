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

async function checkSchema() {
  try {
    console.log('🔍 Checking FEC Database Schema...\n');
    
    // Check committee_master table
    console.log('📋 Committee Master Table:');
    const committeeResult = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'committee_master' 
      ORDER BY ordinal_position
    `);
    
    committeeResult.rows.forEach(row => {
      console.log(`  ${row.column_name} (${row.data_type})`);
    });
    
    console.log('\n📋 Individual Contributions Table:');
    const contributionsResult = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'individual_contributions' 
      ORDER BY ordinal_position
      LIMIT 20
    `);
    
    contributionsResult.rows.forEach(row => {
      console.log(`  ${row.column_name} (${row.data_type})`);
    });
    
    console.log('\n📋 Operating Expenditures Table:');
    const expendituresResult = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'operating_expenditures' 
      ORDER BY ordinal_position
      LIMIT 20
    `);
    
    expendituresResult.rows.forEach(row => {
      console.log(`  ${row.column_name} (${row.data_type})`);
    });
    
    // Check if fec_contributions view exists
    console.log('\n📋 Checking for fec_contributions view:');
    const viewResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = 'fec_contributions'
    `);
    
    if (viewResult.rows.length > 0) {
      console.log('  ✅ fec_contributions view exists');
    } else {
      console.log('  ❌ fec_contributions view does not exist');
    }
    
  } catch (error) {
    console.error('❌ Schema check failed:', error.message);
  } finally {
    await pool.end();
  }
}

checkSchema(); 