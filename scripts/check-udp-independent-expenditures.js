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

async function checkUDPIndependentExpenditures() {
  try {
    console.log('🔍 Checking UDP independent expenditures (24A/24E)...');
    
    // Check UDP independent expenditures for Bowman
    const bowmanQuery = `
      SELECT 
        cc.transaction_tp,
        cc.transaction_amt,
        cc.transaction_dt,
        cc.name,
        cc.memo_text,
        pc.display_name as candidate_name,
        pc.current_party as candidate_party,
        pc.current_district as candidate_district
      FROM committee_candidate_contributions cc
      JOIN person_candidates pc ON cc.cand_id = pc.cand_id
      WHERE cc.cmte_id = 'C00799031'  -- UDP
      AND cc.file_year = 2024
      AND cc.cand_id = 'H0NY16143'  -- Jamaal Bowman
      AND cc.transaction_tp IN ('24A', '24E')
      ORDER BY cc.transaction_amt DESC
    `;
    
    const bowmanResult = await fecCompletePool.query(bowmanQuery);
    
    console.log('\n📊 UDP Independent Expenditures for Jamaal Bowman:');
    console.log('='.repeat(55));
    
    if (bowmanResult.rows.length > 0) {
      let totalFor = 0;
      let totalAgainst = 0;
      
      bowmanResult.rows.forEach((row, index) => {
        const amount = parseFloat(row.transaction_amt);
        const type = row.transaction_tp === '24E' ? 'FOR' : 'AGAINST';
        
        if (row.transaction_tp === '24E') {
          totalFor += amount;
        } else {
          totalAgainst += amount;
        }
        
        console.log(`${index + 1}. Amount: $${amount.toLocaleString()}`);
        console.log(`   Type: ${row.transaction_tp} (${type})`);
        console.log(`   Date: ${row.transaction_dt}`);
        console.log(`   Name: ${row.name}`);
        console.log(`   Memo: ${row.memo_text || 'N/A'}`);
        console.log('');
      });
      
      console.log(`📊 Summary for Bowman:`);
      console.log(`   Total FOR: $${totalFor.toLocaleString()}`);
      console.log(`   Total AGAINST: $${totalAgainst.toLocaleString()}`);
      console.log(`   Net: $${(totalFor - totalAgainst).toLocaleString()}`);
    } else {
      console.log('No UDP independent expenditures found for Bowman');
    }
    
    // Check UDP independent expenditures for Cori Bush
    const bushQuery = `
      SELECT 
        cc.transaction_tp,
        cc.transaction_amt,
        cc.transaction_dt,
        cc.name,
        cc.memo_text,
        pc.display_name as candidate_name,
        pc.current_party as candidate_party,
        pc.current_district as candidate_district
      FROM committee_candidate_contributions cc
      JOIN person_candidates pc ON cc.cand_id = pc.cand_id
      WHERE cc.cmte_id = 'C00799031'  -- UDP
      AND cc.file_year = 2024
      AND cc.cand_id = 'H0MO02167'  -- Cori Bush
      AND cc.transaction_tp IN ('24A', '24E')
      ORDER BY cc.transaction_amt DESC
    `;
    
    const bushResult = await fecCompletePool.query(bushQuery);
    
    console.log('\n📊 UDP Independent Expenditures for Cori Bush:');
    console.log('='.repeat(50));
    
    if (bushResult.rows.length > 0) {
      let totalFor = 0;
      let totalAgainst = 0;
      
      bushResult.rows.forEach((row, index) => {
        const amount = parseFloat(row.transaction_amt);
        const type = row.transaction_tp === '24E' ? 'FOR' : 'AGAINST';
        
        if (row.transaction_tp === '24E') {
          totalFor += amount;
        } else {
          totalAgainst += amount;
        }
        
        console.log(`${index + 1}. Amount: $${amount.toLocaleString()}`);
        console.log(`   Type: ${row.transaction_tp} (${type})`);
        console.log(`   Date: ${row.transaction_dt}`);
        console.log(`   Name: ${row.name}`);
        console.log(`   Memo: ${row.memo_text || 'N/A'}`);
        console.log('');
      });
      
      console.log(`📊 Summary for Bush:`);
      console.log(`   Total FOR: $${totalFor.toLocaleString()}`);
      console.log(`   Total AGAINST: $${totalAgainst.toLocaleString()}`);
      console.log(`   Net: $${(totalFor - totalAgainst).toLocaleString()}`);
    } else {
      console.log('No UDP independent expenditures found for Bush');
    }
    
    // Check all UDP independent expenditures
    const allQuery = `
      SELECT 
        cc.transaction_tp,
        SUM(CAST(cc.transaction_amt AS NUMERIC)) as total_amount,
        COUNT(*) as transaction_count,
        pc.display_name as candidate_name,
        pc.current_party as candidate_party,
        pc.current_district as candidate_district
      FROM committee_candidate_contributions cc
      JOIN person_candidates pc ON cc.cand_id = pc.cand_id
      WHERE cc.cmte_id = 'C00799031'  -- UDP
      AND cc.file_year = 2024
      AND cc.transaction_tp IN ('24A', '24E')
      GROUP BY cc.transaction_tp, pc.display_name, pc.current_party, pc.current_district
      ORDER BY total_amount DESC
    `;
    
    const allResult = await fecCompletePool.query(allQuery);
    
    console.log('\n📊 All UDP Independent Expenditures 2024:');
    console.log('='.repeat(45));
    
    if (allResult.rows.length > 0) {
      allResult.rows.forEach((row, index) => {
        const type = row.transaction_tp === '24E' ? 'FOR' : 'AGAINST';
        console.log(`${index + 1}. ${row.candidate_name} (${row.candidate_party}-${row.candidate_district})`);
        console.log(`   Type: ${row.transaction_tp} (${type})`);
        console.log(`   Amount: $${parseInt(row.total_amount).toLocaleString()}`);
        console.log(`   Transactions: ${row.transaction_count}`);
        console.log('');
      });
    } else {
      console.log('No UDP independent expenditures found');
    }
    
    console.log('✅ Analysis complete!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await fecCompletePool.end();
  }
}

checkUDPIndependentExpenditures(); 