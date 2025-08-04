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

async function checkUDPBowmanExpenditures() {
  try {
    console.log('🔍 Checking UDP expenditures related to Bowman...');
    
    // Check UDP expenditures that mention Bowman
    const bowmanQuery = `
      SELECT 
        name,
        purpose,
        memo_text,
        transaction_amt,
        transaction_dt,
        category,
        category_desc
      FROM operating_expenditures
      WHERE cmte_id = 'C00799031'  -- UDP
      AND file_year = 2024
      AND (
        LOWER(name) LIKE '%bowman%' OR
        LOWER(purpose) LIKE '%bowman%' OR
        LOWER(memo_text) LIKE '%bowman%' OR
        LOWER(category_desc) LIKE '%bowman%'
      )
      ORDER BY transaction_amt DESC
      LIMIT 20
    `;
    
    const bowmanResult = await fecCompletePool.query(bowmanQuery);
    
    console.log('\n📊 UDP Expenditures Mentioning Bowman:');
    console.log('='.repeat(50));
    
    if (bowmanResult.rows.length > 0) {
      bowmanResult.rows.forEach((row, index) => {
        console.log(`${index + 1}. Amount: $${parseInt(row.transaction_amt).toLocaleString()}`);
        console.log(`   Date: ${row.transaction_dt}`);
        console.log(`   Name: ${row.name}`);
        console.log(`   Purpose: ${row.purpose}`);
        console.log(`   Memo: ${row.memo_text || 'N/A'}`);
        console.log(`   Category: ${row.category_desc || 'N/A'}`);
        console.log('');
      });
    } else {
      console.log('No UDP expenditures mentioning Bowman found');
    }
    
    // Check UDP expenditures for advertising or media
    const mediaQuery = `
      SELECT 
        name,
        purpose,
        memo_text,
        transaction_amt,
        transaction_dt,
        category,
        category_desc
      FROM operating_expenditures
      WHERE cmte_id = 'C00799031'  -- UDP
      AND file_year = 2024
      AND (
        LOWER(purpose) LIKE '%advertising%' OR
        LOWER(purpose) LIKE '%media%' OR
        LOWER(purpose) LIKE '%campaign%' OR
        LOWER(name) LIKE '%media%' OR
        LOWER(name) LIKE '%advertising%'
      )
      ORDER BY transaction_amt DESC
      LIMIT 20
    `;
    
    const mediaResult = await fecCompletePool.query(mediaQuery);
    
    console.log('\n📊 UDP Media/Advertising Expenditures:');
    console.log('='.repeat(45));
    
    if (mediaResult.rows.length > 0) {
      mediaResult.rows.forEach((row, index) => {
        console.log(`${index + 1}. Amount: $${parseInt(row.transaction_amt).toLocaleString()}`);
        console.log(`   Date: ${row.transaction_dt}`);
        console.log(`   Name: ${row.name}`);
        console.log(`   Purpose: ${row.purpose}`);
        console.log(`   Memo: ${row.memo_text || 'N/A'}`);
        console.log(`   Category: ${row.category_desc || 'N/A'}`);
        console.log('');
      });
    } else {
      console.log('No UDP media/advertising expenditures found');
    }
    
    // Check total UDP expenditures
    const totalQuery = `
      SELECT 
        SUM(CAST(transaction_amt AS NUMERIC)) as total_amount,
        COUNT(*) as transaction_count
      FROM operating_expenditures
      WHERE cmte_id = 'C00799031'  -- UDP
      AND file_year = 2024
    `;
    
    const totalResult = await fecCompletePool.query(totalQuery);
    
    console.log('\n📊 Total UDP Operating Expenditures 2024:');
    console.log('='.repeat(45));
    console.log(`Total Amount: $${parseInt(totalResult.rows[0].total_amount).toLocaleString()}`);
    console.log(`Transaction Count: ${totalResult.rows[0].transaction_count}`);
    
    console.log('\n✅ Analysis complete!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await fecCompletePool.end();
  }
}

checkUDPBowmanExpenditures(); 