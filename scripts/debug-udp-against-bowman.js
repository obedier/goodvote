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

async function debugUDPAgainstBowman() {
  try {
    console.log('🔍 Investigating UDP spending against Jamaal Bowman...');
    
    // Check UDP transactions with Bowman
    const query = `
      SELECT 
        cc.cmte_id,
        cm.cmte_nm as pac_name,
        cc.transaction_amt,
        cc.transaction_tp,
        cc.transaction_dt,
        cc.name,
        cc.memo_text
      FROM committee_candidate_contributions cc
      JOIN committee_master cm ON cc.cmte_id = cm.cmte_id
      WHERE cc.cand_id = 'H0NY16143'
      AND cc.file_year = 2024
      AND cc.cmte_id = 'C00799031'  -- UDP
      ORDER BY cc.transaction_amt DESC
      LIMIT 20
    `;
    
    const result = await fecCompletePool.query(query);
    
    console.log('\n📊 UDP Transactions with Jamaal Bowman:');
    console.log('='.repeat(80));
    
          result.rows.forEach((row, index) => {
        console.log(`${index + 1}. Amount: $${parseInt(row.transaction_amt).toLocaleString()}`);
        console.log(`   Type: ${row.transaction_tp}`);
        console.log(`   Date: ${row.transaction_dt}`);
        console.log(`   Name: ${row.name}`);
        console.log(`   Memo: ${row.memo_text || 'N/A'}`);
        console.log('');
      });
    
    // Check if UDP is spending AGAINST Bowman (negative amounts)
    const negativeQuery = `
      SELECT 
        SUM(CAST(cc.transaction_amt AS NUMERIC)) as total_negative_amount,
        COUNT(*) as negative_transactions
      FROM committee_candidate_contributions cc
      WHERE cc.cand_id = 'H0NY16143'
      AND cc.file_year = 2024
      AND cc.cmte_id = 'C00799031'  -- UDP
      AND cc.transaction_amt < 0
    `;
    
    const negativeResult = await fecCompletePool.query(negativeQuery);
    
    console.log('\n🔍 UDP Spending AGAINST Bowman (Negative Amounts):');
    console.log('='.repeat(50));
    if (negativeResult.rows[0].total_negative_amount) {
      console.log(`Total Negative Amount: $${parseInt(negativeResult.rows[0].total_negative_amount).toLocaleString()}`);
      console.log(`Negative Transactions: ${negativeResult.rows[0].negative_transactions}`);
    } else {
      console.log('No negative transactions found');
    }
    
    // Check independent expenditures against Bowman
    const ieQuery = `
      SELECT 
        ie.cmte_id,
        cm.cmte_nm as committee_name,
        ie.exp_amt,
        ie.sup_opp,
        ie.exp_dt,
        ie.memo_text
      FROM independent_expenditures ie
      JOIN committee_master cm ON ie.cmte_id = cm.cmte_id
      WHERE ie.cand_id = 'H0NY16143'
      AND ie.file_year = 2024
      AND ie.cmte_id = 'C00799031'  -- UDP
      ORDER BY ie.exp_amt DESC
      LIMIT 10
    `;
    
    const ieResult = await fecCompletePool.query(ieQuery);
    
    console.log('\n📊 UDP Independent Expenditures Against Bowman:');
    console.log('='.repeat(60));
    
    ieResult.rows.forEach((row, index) => {
      console.log(`${index + 1}. Amount: $${parseInt(row.exp_amt).toLocaleString()}`);
      console.log(`   Support/Oppose: ${row.sup_opp}`);
      console.log(`   Date: ${row.exp_dt}`);
      console.log(`   Memo: ${row.memo_text || 'N/A'}`);
      console.log('');
    });
    
    console.log('✅ Analysis complete!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await fecCompletePool.end();
  }
}

debugUDPAgainstBowman(); 