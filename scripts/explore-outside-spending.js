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

async function exploreOutsideSpending() {
  try {
    console.log('🔍 Exploring outside spending data...');
    
    // Get all operating expenditures for 2024
    const outsideSpendingQuery = `
      SELECT 
        oe.cmte_id,
        cm.cmte_nm as committee_name,
        cm.cmte_tp as committee_type,
        COUNT(*) as transaction_count,
        SUM(oe.transaction_amt) as total_amount
      FROM operating_expenditures oe
      JOIN committee_master cm ON oe.cmte_id = cm.cmte_id
      WHERE oe.file_year = 2024
      AND oe.transaction_amt > 0
      AND oe.purpose IN (
        'ADVERTISEMENT', 'DIGITAL ADVERTISING', 'MEDIA ADVERTISING',
        'POLLING', 'RESEARCH', 'CONSULTING', 'COMMUNICATIONS CONSULTING',
        'PRINTING', 'PRODUCTION', 'STAFF PAYROLL', 'SALARY'
      )
      GROUP BY oe.cmte_id, cm.cmte_nm, cm.cmte_tp
      ORDER BY total_amount DESC
      LIMIT 20
    `;
    
    const outsideSpendingResult = await fecCompletePool.query(outsideSpendingQuery);
    console.log('\n💰 Top Operating Expenditures (Outside Spending) by Committee:');
    outsideSpendingResult.rows.forEach(row => {
      console.log(`  - ${row.committee_name} (${row.cmte_id}) - Type: ${row.committee_type}`);
      console.log(`    Amount: $${row.total_amount.toLocaleString()} (${row.transaction_count} transactions)`);
    });

    // Check if any committees are spending on behalf of Rashida Tlaib
    const rashidaSpendingQuery = `
      SELECT 
        oe.cmte_id,
        cm.cmte_nm as committee_name,
        cm.cmte_tp as committee_type,
        COUNT(*) as transaction_count,
        SUM(oe.transaction_amt) as total_amount
      FROM operating_expenditures oe
      JOIN committee_master cm ON oe.cmte_id = cm.cmte_id
      WHERE oe.file_year = 2024
      AND oe.transaction_amt > 0
      AND oe.purpose IN (
        'ADVERTISEMENT', 'DIGITAL ADVERTISING', 'MEDIA ADVERTISING',
        'POLLING', 'RESEARCH', 'CONSULTING', 'COMMUNICATIONS CONSULTING',
        'PRINTING', 'PRODUCTION', 'STAFF PAYROLL', 'SALARY'
      )
      AND cm.cmte_id NOT IN (
        SELECT DISTINCT ccl.cmte_id
        FROM candidate_committee_linkages ccl
        WHERE ccl.cand_id = 'H8MI13250'
        AND ccl.file_year = 2024
      )
      GROUP BY oe.cmte_id, cm.cmte_nm, cm.cmte_tp
      ORDER BY total_amount DESC
      LIMIT 10
    `;
    
    const rashidaSpendingResult = await fecCompletePool.query(rashidaSpendingQuery);
    console.log('\n🎯 Committees Spending on Behalf of Rashida Tlaib (Outside Committees):');
    rashidaSpendingResult.rows.forEach(row => {
      console.log(`  - ${row.committee_name} (${row.cmte_id}) - Type: ${row.committee_type}`);
      console.log(`    Amount: $${row.total_amount.toLocaleString()} (${row.transaction_count} transactions)`);
    });

    // Check what purposes exist in operating expenditures
    const purposesQuery = `
      SELECT DISTINCT purpose, COUNT(*) as count
      FROM operating_expenditures
      WHERE file_year = 2024
      AND transaction_amt > 0
      GROUP BY purpose
      ORDER BY count DESC
      LIMIT 20
    `;
    
    const purposesResult = await fecCompletePool.query(purposesQuery);
    console.log('\n📋 Top Operating Expenditure Purposes:');
    purposesResult.rows.forEach(row => {
      console.log(`  - ${row.purpose}: ${row.count} transactions`);
    });

  } catch (error) {
    console.error('❌ Error exploring outside spending:', error);
  } finally {
    await fecCompletePool.end();
  }
}

exploreOutsideSpending(); 