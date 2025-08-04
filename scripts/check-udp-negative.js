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

async function checkUDPNegative() {
  try {
    console.log('🔍 Checking for UDP negative transactions against Bowman...');
    
    // Check for negative transactions
    const negativeQuery = `
      SELECT 
        cc.transaction_amt,
        cc.transaction_tp,
        cc.transaction_dt,
        cc.name,
        cc.memo_text
      FROM committee_candidate_contributions cc
      WHERE cc.cand_id = 'H0NY16143'
      AND cc.file_year = 2024
      AND cc.cmte_id = 'C00799031'  -- UDP
      AND cc.transaction_amt < 0
      ORDER BY cc.transaction_amt ASC
      LIMIT 20
    `;
    
    const negativeResult = await fecCompletePool.query(negativeQuery);
    
    console.log('\n📊 UDP Negative Transactions Against Bowman:');
    console.log('='.repeat(50));
    
    if (negativeResult.rows.length > 0) {
      negativeResult.rows.forEach((row, index) => {
        console.log(`${index + 1}. Amount: $${parseInt(row.transaction_amt).toLocaleString()}`);
        console.log(`   Type: ${row.transaction_tp}`);
        console.log(`   Date: ${row.transaction_dt}`);
        console.log(`   Name: ${row.name}`);
        console.log(`   Memo: ${row.memo_text || 'N/A'}`);
        console.log('');
      });
    } else {
      console.log('No negative transactions found');
    }
    
    // Check if UDP is spending FOR Latimer (Bowman's opponent)
    console.log('\n🔍 UDP Spending FOR Latimer (Bowman\'s opponent):');
    const latimerQuery = `
      SELECT 
        SUM(CAST(cc.transaction_amt AS NUMERIC)) as total_amount,
        COUNT(*) as contribution_count,
        MIN(cc.transaction_dt) as first_date,
        MAX(cc.transaction_dt) as last_date
      FROM committee_candidate_contributions cc
      WHERE cc.cmte_id = 'C00799031'
      AND cc.file_year = 2024
      AND cc.cand_id = 'H0NY16144'  -- George Latimer
      AND cc.transaction_amt > 0
    `;
    
    const latimerResult = await fecCompletePool.query(latimerQuery);
    
    if (latimerResult.rows[0].total_amount) {
      console.log(`UDP Support for Latimer: $${parseInt(latimerResult.rows[0].total_amount).toLocaleString()}`);
      console.log(`Contributions: ${latimerResult.rows[0].contribution_count}`);
      console.log(`Date Range: ${latimerResult.rows[0].first_date} to ${latimerResult.rows[0].last_date}`);
    } else {
      console.log('No UDP support found for Latimer');
    }
    
    // Check if there's a different UDP committee ID
    console.log('\n🔍 Checking for other UDP-related committees:');
    const udpVariationsQuery = `
      SELECT DISTINCT cmte_id, cmte_nm, cmte_tp
      FROM committee_master 
      WHERE cmte_nm ILIKE '%UNITED DEMOCRACY%'
      AND file_year = 2024
      ORDER BY cmte_nm
    `;
    
    const udpVariationsResult = await fecCompletePool.query(udpVariationsQuery);
    
    udpVariationsResult.rows.forEach((row, index) => {
      console.log(`${index + 1}. ${row.cmte_nm} (${row.cmte_id})`);
      console.log(`   Type: ${row.cmte_tp}`);
      console.log('');
    });
    
    console.log('✅ Analysis complete!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await fecCompletePool.end();
  }
}

checkUDPNegative(); 