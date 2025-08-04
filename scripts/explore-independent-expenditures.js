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

async function exploreIndependentExpenditures() {
  try {
    console.log('🔍 Exploring independent expenditures and outside spending...');
    
    // Check if there's an independent_expenditures table
    const tableCheckQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name LIKE '%expenditure%'
    `;
    
    const tableCheckResult = await fecCompletePool.query(tableCheckQuery);
    console.log('\n📋 Available expenditure tables:');
    tableCheckResult.rows.forEach(row => {
      console.log(`  - ${row.table_name}`);
    });

    // Check committee_candidate_contributions for transaction types
    const transactionTypesQuery = `
      SELECT DISTINCT transaction_tp, COUNT(*) as count
      FROM committee_candidate_contributions
      WHERE file_year = 2024
      GROUP BY transaction_tp
      ORDER BY count DESC
    `;
    
    const transactionTypesResult = await fecCompletePool.query(transactionTypesQuery);
    console.log('\n📊 Committee-Candidate Contribution Transaction Types:');
    transactionTypesResult.rows.forEach(row => {
      console.log(`  - ${row.transaction_tp}: ${row.count} transactions`);
    });

    // Check for any transactions mentioning Rashida Tlaib
    const rashidaTransactionsQuery = `
      SELECT 
        ccc.cmte_id,
        cm.cmte_nm as committee_name,
        ccc.transaction_tp,
        ccc.transaction_amt,
        ccc.name,
        ccc.transaction_dt
      FROM committee_candidate_contributions ccc
      JOIN committee_master cm ON ccc.cmte_id = cm.cmte_id
      WHERE ccc.cand_id = 'H8MI13250'
      AND ccc.file_year = 2024
      AND ccc.transaction_amt > 0
      ORDER BY ccc.transaction_amt DESC
      LIMIT 20
    `;
    
    const rashidaTransactionsResult = await fecCompletePool.query(rashidaTransactionsQuery);
    console.log('\n🎯 Committee Contributions to Rashida Tlaib:');
    rashidaTransactionsResult.rows.forEach(row => {
      console.log(`  - ${row.committee_name} (${row.cmte_id})`);
      console.log(`    Type: ${row.transaction_tp}, Amount: $${row.transaction_amt}, Name: ${row.name}`);
    });

    // Check operating expenditures for any mention of candidates
    const operatingExpendituresQuery = `
      SELECT 
        oe.cmte_id,
        cm.cmte_nm as committee_name,
        oe.purpose,
        oe.transaction_amt,
        oe.name
      FROM operating_expenditures oe
      JOIN committee_master cm ON oe.cmte_id = cm.cmte_id
      WHERE oe.file_year = 2024
      AND oe.transaction_amt > 0
      AND (
        oe.purpose ILIKE '%TLAIB%' OR 
        oe.name ILIKE '%TLAIB%' OR
        oe.purpose ILIKE '%CANDIDATE%' OR
        oe.purpose ILIKE '%SUPPORT%' OR
        oe.purpose ILIKE '%OPPOSE%'
      )
      ORDER BY oe.transaction_amt DESC
      LIMIT 20
    `;
    
    const operatingExpendituresResult = await fecCompletePool.query(operatingExpendituresQuery);
    console.log('\n🔍 Operating Expenditures Mentioning Candidates:');
    operatingExpendituresResult.rows.forEach(row => {
      console.log(`  - ${row.committee_name} (${row.cmte_id})`);
      console.log(`    Purpose: ${row.purpose}, Amount: $${row.transaction_amt}, Name: ${row.name}`);
    });

  } catch (error) {
    console.error('❌ Error exploring independent expenditures:', error);
  } finally {
    await fecCompletePool.end();
  }
}

exploreIndependentExpenditures(); 