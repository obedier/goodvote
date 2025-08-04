#!/usr/bin/env node

const { Pool } = require('pg');
require('dotenv').config();

// Database configurations
const fecCompleteConfig = {
  host: process.env.FEC_DB_HOST || process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.FEC_DB_PORT || process.env.DB_PORT || '5432'),
  database: process.env.FEC_DB_NAME || 'fec_gold',
  user: process.env.FEC_DB_USER || process.env.DB_USER || 'osamabedier',
  password: process.env.FEC_DB_PASSWORD || process.env.DB_PASSWORD || '',
};

const fecCompletePool = new Pool(fecCompleteConfig);

async function testConnection() {
  try {
    console.log('🔍 Testing database connection...');
    const client = await fecCompletePool.connect();
    const result = await client.query('SELECT NOW()');
    client.release();
    console.log('✅ Database connection successful');
    console.log(`   Connected at: ${result.rows[0].now}`);
    return true;
  } catch (error) {
    console.log('❌ Database connection failed');
    console.log(`   Error: ${error.message}`);
    return false;
  } finally {
    await fecCompletePool.end();
  }
}

testConnection().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
}); 