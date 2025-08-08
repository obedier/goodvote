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

async function checkIndependentExpendituresTable() {
  try {
    console.log('🔍 Checking independent_expenditures table...');
    
    // Check if table exists
    const tableExistsQuery = `
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'independent_expenditures'
      );
    `;
    
    const tableExistsResult = await fecCompletePool.query(tableExistsQuery);
    
    if (tableExistsResult.rows[0].exists) {
      console.log('✅ Independent Expenditures table exists!');
      
      // Get column information
      const columnsQuery = `
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'independent_expenditures'
        ORDER BY ordinal_position
      `;
      
      const columnsResult = await fecCompletePool.query(columnsQuery);
      
      console.log('\n📊 Independent Expenditures Table Columns:');
      console.log('='.repeat(50));
      columnsResult.rows.forEach((row, index) => {
        console.log(`${index + 1}. ${row.column_name} (${row.data_type}) - ${row.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
      });
      
      // Check for support_oppose_code column
      const hasSupportOppose = columnsResult.rows.some(row => 
        row.column_name.toLowerCase() === 'support_oppose_code' || 
        row.column_name.toLowerCase() === 'sup_opp'
      );
      
      if (hasSupportOppose) {
        console.log('\n✅ Found support/oppose column!');
      } else {
        console.log('\n❌ No support/oppose column found');
      }
      
      // Check sample UDP data
      const sampleQuery = `
        SELECT *
        FROM independent_expenditures
        WHERE cmte_id = 'C00799031'  -- UDP
        AND file_year = 2024
        LIMIT 5
      `;
      
      try {
        const sampleResult = await fecCompletePool.query(sampleQuery);
        
        console.log('\n📊 Sample UDP Independent Expenditures:');
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
          console.log('No UDP independent expenditures found');
        }
      } catch (error) {
        console.log('Error querying independent_expenditures:', error.message);
      }
      
    } else {
      console.log('❌ Independent Expenditures table does not exist');
      
      // Check what tables exist with similar names
      const similarTablesQuery = `
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name ILIKE '%expend%'
        ORDER BY table_name
      `;
      
      const similarTablesResult = await fecCompletePool.query(similarTablesQuery);
      
      console.log('\n📊 Similar tables found:');
      similarTablesResult.rows.forEach((row, index) => {
        console.log(`${index + 1}. ${row.table_name}`);
      });
    }
    
    console.log('\n✅ Analysis complete!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await fecCompletePool.end();
  }
}

checkIndependentExpendituresTable(); 