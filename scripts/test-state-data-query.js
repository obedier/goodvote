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

async function testStateDataQuery() {
  try {
    console.log('🔍 Testing State Data Query...\n');
    
    // Test 1: Check if we have any data for CA
    console.log('📋 Test 1: Checking CA data count...');
    const countResult = await pool.query(`
      SELECT COUNT(*) as count
      FROM individual_contributions 
      WHERE state = 'CA'
      LIMIT 1
    `);
    
    console.log('CA contributions total:', countResult.rows[0].count);
    
    // Test 2: Check what years we have data for
    console.log('\n📋 Test 2: Checking available years...');
    const yearResult = await pool.query(`
      SELECT DISTINCT file_year 
      FROM individual_contributions 
      WHERE state = 'CA' AND file_year IS NOT NULL
      ORDER BY file_year DESC 
      LIMIT 5
    `);
    
    console.log('Available years for CA:', yearResult.rows.map(r => r.file_year));
    
    // Test 3: Simple query with small limit
    console.log('\n📋 Test 3: Simple query with limit...');
    const simpleResult = await pool.query(`
      SELECT ic.state, ic.city, ic.transaction_amt, ic.name as contributor_name
      FROM individual_contributions ic
      WHERE ic.state = 'CA' AND ic.file_year = 2024
      ORDER BY ic.transaction_amt DESC 
      LIMIT 5
    `);
    
    console.log('Sample results:', simpleResult.rows.length);
    if (simpleResult.rows.length > 0) {
      console.log('First result:', simpleResult.rows[0]);
    }
    
    // Test 4: Check if we have committee data
    console.log('\n📋 Test 4: Checking committee join...');
    const committeeResult = await pool.query(`
      SELECT ic.state, ic.transaction_amt, cm.cmte_nm
      FROM individual_contributions ic
      LEFT JOIN committee_master cm ON ic.cmte_id = cm.cmte_id
      WHERE ic.state = 'CA' AND ic.file_year = 2024
      LIMIT 3
    `);
    
    console.log('Committee join results:', committeeResult.rows.length);
    if (committeeResult.rows.length > 0) {
      console.log('First committee result:', committeeResult.rows[0]);
    }
    
  } catch (error) {
    console.error('❌ Query test failed:', error.message);
  } finally {
    await pool.end();
  }
}

testStateDataQuery(); 