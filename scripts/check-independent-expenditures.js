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

async function checkIndependentExpenditures() {
  try {
    console.log('🔍 Checking for independent expenditures against Bowman...');
    
    // Check what tables exist that might contain independent expenditures
    const tablesQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name ILIKE '%expend%'
      ORDER BY table_name
    `;
    
    const tablesResult = await fecCompletePool.query(tablesQuery);
    
    console.log('\n📊 Tables with "expend" in name:');
    console.log('='.repeat(40));
    tablesResult.rows.forEach((row, index) => {
      console.log(`${index + 1}. ${row.table_name}`);
    });
    
    // Check if there's an independent_expenditures table
    const ieTableQuery = `
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'independent_expenditures'
      );
    `;
    
    const ieTableResult = await fecCompletePool.query(ieTableQuery);
    
    if (ieTableResult.rows[0].exists) {
      console.log('\n📊 Independent Expenditures table exists!');
      
      // Check UDP independent expenditures against Bowman
      const udpIEQuery = `
        SELECT 
          cm.cmte_nm as committee_name,
          ie.exp_amt,
          ie.sup_opp,
          ie.exp_dt,
          ie.purpose,
          ie.memo_text
        FROM independent_expenditures ie
        JOIN committee_master cm ON ie.cmte_id = cm.cmte_id
        WHERE ie.cand_id = 'H0NY16143'
        AND ie.file_year = 2024
        AND ie.cmte_id = 'C00799031'  -- UDP
        ORDER BY ie.exp_amt DESC
        LIMIT 10
      `;
      
      try {
        const udpIEResult = await fecCompletePool.query(udpIEQuery);
        
        console.log('\n📊 UDP Independent Expenditures Against Bowman:');
        console.log('='.repeat(50));
        
        if (udpIEResult.rows.length > 0) {
          udpIEResult.rows.forEach((row, index) => {
            console.log(`${index + 1}. Amount: $${parseInt(row.exp_amt).toLocaleString()}`);
            console.log(`   Support/Oppose: ${row.sup_opp}`);
            console.log(`   Date: ${row.exp_dt}`);
            console.log(`   Purpose: ${row.purpose || 'N/A'}`);
            console.log(`   Memo: ${row.memo_text || 'N/A'}`);
            console.log('');
          });
        } else {
          console.log('No UDP independent expenditures found');
        }
      } catch (error) {
        console.log('Error querying independent_expenditures table:', error.message);
      }
    } else {
      console.log('\n❌ Independent Expenditures table does not exist');
    }
    
    // Check for any other expenditure-related tables
    console.log('\n🔍 Checking for other expenditure data...');
    
    // Check if there's an operating_expenditures table
    const oeTableQuery = `
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'operating_expenditures'
      );
    `;
    
    const oeTableResult = await fecCompletePool.query(oeTableQuery);
    
    if (oeTableResult.rows[0].exists) {
      console.log('\n📊 Operating Expenditures table exists!');
      
      // Check UDP operating expenditures
      const udpOEQuery = `
        SELECT 
          cm.cmte_nm as committee_name,
          oe.exp_amt,
          oe.exp_dt,
          oe.purpose,
          oe.memo_text
        FROM operating_expenditures oe
        JOIN committee_master cm ON oe.cmte_id = cm.cmte_id
        WHERE oe.file_year = 2024
        AND oe.cmte_id = 'C00799031'  -- UDP
        AND oe.purpose ILIKE '%BOWMAN%'
        ORDER BY oe.exp_amt DESC
        LIMIT 10
      `;
      
      try {
        const udpOEResult = await fecCompletePool.query(udpOEQuery);
        
        console.log('\n📊 UDP Operating Expenditures Related to Bowman:');
        console.log('='.repeat(55));
        
        if (udpOEResult.rows.length > 0) {
          udpOEResult.rows.forEach((row, index) => {
            console.log(`${index + 1}. Amount: $${parseInt(row.exp_amt).toLocaleString()}`);
            console.log(`   Date: ${row.exp_dt}`);
            console.log(`   Purpose: ${row.purpose || 'N/A'}`);
            console.log(`   Memo: ${row.memo_text || 'N/A'}`);
            console.log('');
          });
        } else {
          console.log('No UDP operating expenditures related to Bowman found');
        }
      } catch (error) {
        console.log('Error querying operating_expenditures table:', error.message);
      }
    } else {
      console.log('\n❌ Operating Expenditures table does not exist');
    }
    
    console.log('✅ Analysis complete!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await fecCompletePool.end();
  }
}

checkIndependentExpenditures(); 