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

async function debugLatimerOppose() {
  try {
    console.log('🔍 Debugging Latimer oppose amounts...');
    
    // Check all UDP transactions for Latimer
    const udpQuery = `
      SELECT 
        cc.transaction_tp,
        cc.transaction_amt,
        cc.transaction_dt,
        cc.name,
        cc.memo_text,
        cc.sub_id,
        cc.file_year
      FROM committee_candidate_contributions cc
      WHERE cc.cmte_id = 'C00799031'  -- UDP
      AND cc.cand_id = 'H4NY16087'  -- George Latimer
      AND cc.file_year = 2024
      AND cc.transaction_tp IN ('24A', '24E')
      ORDER BY cc.transaction_amt DESC
    `;
    
    const udpResult = await fecCompletePool.query(udpQuery);
    
    console.log('\n📊 All UDP Transactions for Latimer:');
    console.log('='.repeat(50));
    
    let totalSupport = 0;
    let totalOppose = 0;
    
    udpResult.rows.forEach((row, index) => {
      const amount = parseFloat(row.transaction_amt);
      const type = row.transaction_tp === '24E' ? 'SUPPORT' : 'OPPOSE';
      
      if (row.transaction_tp === '24E') {
        totalSupport += amount;
      } else {
        totalOppose += amount;
      }
      
      console.log(`${index + 1}. Amount: $${amount.toLocaleString()}`);
      console.log(`   Type: ${row.transaction_tp} (${type})`);
      console.log(`   Date: ${row.transaction_dt}`);
      console.log(`   Name: ${row.name}`);
      console.log(`   Memo: ${row.memo_text || 'N/A'}`);
      console.log(`   Sub ID: ${row.sub_id}`);
      console.log('');
    });
    
    console.log(`📊 Summary:`);
    console.log(`   Total Support: $${totalSupport.toLocaleString()}`);
    console.log(`   Total Oppose: $${totalOppose.toLocaleString()}`);
    console.log(`   Net: $${(totalSupport - totalOppose).toLocaleString()}`);
    
    // Check if there are any negative amounts that might be causing confusion
    const negativeQuery = `
      SELECT 
        cc.transaction_tp,
        cc.transaction_amt,
        cc.transaction_dt,
        cc.name,
        cc.memo_text
      FROM committee_candidate_contributions cc
      WHERE cc.cmte_id = 'C00799031'  -- UDP
      AND cc.cand_id = 'H4NY16087'  -- George Latimer
      AND cc.file_year = 2024
      AND cc.transaction_amt < 0
      ORDER BY cc.transaction_amt ASC
    `;
    
    const negativeResult = await fecCompletePool.query(negativeQuery);
    
    console.log('\n📊 Negative Amount Transactions for Latimer:');
    console.log('='.repeat(55));
    
    if (negativeResult.rows.length > 0) {
      negativeResult.rows.forEach((row, index) => {
        console.log(`${index + 1}. Amount: $${parseFloat(row.transaction_amt).toLocaleString()}`);
        console.log(`   Type: ${row.transaction_tp}`);
        console.log(`   Date: ${row.transaction_dt}`);
        console.log(`   Name: ${row.name}`);
        console.log(`   Memo: ${row.memo_text || 'N/A'}`);
        console.log('');
      });
    } else {
      console.log('No negative transactions found');
    }
    
    console.log('✅ Analysis complete!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await fecCompletePool.end();
  }
}

debugLatimerOppose(); 