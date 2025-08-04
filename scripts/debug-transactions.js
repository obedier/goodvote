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

async function debugTransactions() {
  try {
    console.log('🔍 Debugging transactions for Rashida Tlaib...');
    
    // Check transactions for the specific candidate and committee
    const transactionsQuery = `
      SELECT 
        ccc.sub_id as transaction_id,
        ccc.transaction_dt,
        ccc.transaction_amt,
        ccc.name,
        ccc.transaction_tp,
        ccc.memo_text
      FROM committee_candidate_contributions ccc
      WHERE ccc.cand_id = 'H8MI13250'
      AND ccc.cmte_id = 'C00002469'
      AND ccc.file_year = 2024
      AND ccc.transaction_amt > 0
      AND ccc.transaction_tp IN ('24A', '24E', '24C', '24N', '24K')
      ORDER BY ccc.transaction_dt DESC
      LIMIT 10
    `;
    
    const transactionsResult = await fecCompletePool.query(transactionsQuery);
    console.log('\n📊 Transactions for H8MI13250 and C00002469:');
    console.log(`Found ${transactionsResult.rows.length} transactions`);
    transactionsResult.rows.forEach((row, index) => {
      console.log(`  ${index + 1}. Date: ${row.transaction_dt}, Amount: $${row.transaction_amt}, Type: ${row.transaction_tp}, Name: ${row.name}`);
    });

    // Check all transactions for this candidate
    const allTransactionsQuery = `
      SELECT 
        ccc.cmte_id,
        cm.cmte_nm,
        COUNT(*) as transaction_count,
        SUM(ccc.transaction_amt) as total_amount
      FROM committee_candidate_contributions ccc
      JOIN committee_master cm ON ccc.cmte_id = cm.cmte_id
      WHERE ccc.cand_id = 'H8MI13250'
      AND ccc.file_year = 2024
      AND ccc.transaction_amt > 0
      AND ccc.transaction_tp IN ('24A', '24E', '24C', '24N', '24K')
      GROUP BY ccc.cmte_id, cm.cmte_nm
      ORDER BY total_amount DESC
      LIMIT 10
    `;
    
    const allTransactionsResult = await fecCompletePool.query(allTransactionsQuery);
    console.log('\n📋 All committees with transactions for H8MI13250:');
    allTransactionsResult.rows.forEach((row, index) => {
      console.log(`  ${index + 1}. ${row.cmte_nm} (${row.cmte_id}): ${row.transaction_count} transactions, $${row.total_amount}`);
    });

  } catch (error) {
    console.error('❌ Error debugging transactions:', error);
  } finally {
    await fecCompletePool.end();
  }
}

debugTransactions(); 