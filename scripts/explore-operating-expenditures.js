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

async function exploreOperatingExpenditures() {
  try {
    console.log('🔍 Exploring operating expenditures data...');
    
    // Get candidate committees for Rashida Tlaib
    const candidateQuery = `
      SELECT DISTINCT ccl.cmte_id, cm.cmte_nm, cm.cmte_tp
      FROM candidate_committee_linkages ccl
      JOIN committee_master cm ON ccl.cmte_id = cm.cmte_id
      WHERE ccl.cand_id = 'H8MI13250'
      AND ccl.file_year = 2024
    `;
    
    const candidateResult = await fecCompletePool.query(candidateQuery);
    console.log('\n📋 Candidate Committees:');
    candidateResult.rows.forEach(row => {
      console.log(`  - ${row.cmte_nm} (${row.cmte_id}) - Type: ${row.cmte_tp}`);
    });

    // Get sample operating expenditures
    const sampleQuery = `
      SELECT DISTINCT category, category_desc, purpose
      FROM operating_expenditures
      WHERE cmte_id IN (
        SELECT DISTINCT ccl.cmte_id
        FROM candidate_committee_linkages ccl
        WHERE ccl.cand_id = 'H8MI13250'
        AND ccl.file_year = 2024
      )
      AND file_year = 2024
      LIMIT 20
    `;
    
    const sampleResult = await fecCompletePool.query(sampleQuery);
    console.log('\n📊 Sample Operating Expenditure Categories:');
    sampleResult.rows.forEach(row => {
      console.log(`  - Category: ${row.category} (${row.category_desc})`);
      console.log(`    Purpose: ${row.purpose}`);
    });

    // Get total operating expenditures by category
    const categoryQuery = `
      SELECT 
        category,
        category_desc,
        COUNT(*) as count,
        SUM(transaction_amt) as total_amount
      FROM operating_expenditures
      WHERE cmte_id IN (
        SELECT DISTINCT ccl.cmte_id
        FROM candidate_committee_linkages ccl
        WHERE ccl.cand_id = 'H8MI13250'
        AND ccl.file_year = 2024
      )
      AND file_year = 2024
      GROUP BY category, category_desc
      ORDER BY total_amount DESC
      LIMIT 10
    `;
    
    const categoryResult = await fecCompletePool.query(categoryQuery);
    console.log('\n💰 Top Operating Expenditure Categories:');
    categoryResult.rows.forEach(row => {
      console.log(`  - ${row.category_desc} (${row.category}): $${row.total_amount.toLocaleString()} (${row.count} transactions)`);
    });

  } catch (error) {
    console.error('❌ Error exploring operating expenditures:', error);
  } finally {
    await fecCompletePool.end();
  }
}

exploreOperatingExpenditures(); 