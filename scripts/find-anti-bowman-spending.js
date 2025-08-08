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

async function findAntiBowmanSpending() {
  try {
    console.log('🔍 Finding pro-Israel committees spending against Bowman...');
    
    // Check AIPAC spending against Bowman
    const aipacQuery = `
      SELECT 
        SUM(CAST(cc.transaction_amt AS NUMERIC)) as total_amount,
        COUNT(*) as contribution_count
      FROM committee_candidate_contributions cc
      WHERE cc.cand_id = 'H0NY16143'
      AND cc.file_year = 2024
      AND cc.cmte_id = 'C00797670'  -- AIPAC PAC
      AND cc.transaction_amt < 0
    `;
    
    const aipacResult = await fecCompletePool.query(aipacQuery);
    
    console.log('\n📊 AIPAC Spending AGAINST Bowman:');
    console.log('='.repeat(40));
    if (aipacResult.rows[0].total_amount) {
      console.log(`Amount: $${parseInt(aipacResult.rows[0].total_amount).toLocaleString()}`);
      console.log(`Transactions: ${aipacResult.rows[0].contribution_count}`);
    } else {
      console.log('No AIPAC spending against Bowman found');
    }
    
    // Check all pro-Israel PACs spending against Bowman
    const proIsraelPACs = ['C00797670', 'C00247403', 'C00741792', 'C00142299', 'C00127811'];
    
    console.log('\n📊 All Pro-Israel PACs Spending AGAINST Bowman:');
    console.log('='.repeat(50));
    
    for (const pacId of proIsraelPACs) {
      const query = `
        SELECT 
          cm.cmte_nm as pac_name,
          SUM(CAST(cc.transaction_amt AS NUMERIC)) as total_amount,
          COUNT(*) as contribution_count
        FROM committee_candidate_contributions cc
        JOIN committee_master cm ON cc.cmte_id = cm.cmte_id
        WHERE cc.cand_id = 'H0NY16143'
        AND cc.file_year = 2024
        AND cc.cmte_id = '${pacId}'
        AND cc.transaction_amt < 0
        GROUP BY cm.cmte_nm
      `;
      
      const result = await fecCompletePool.query(query);
      
      if (result.rows.length > 0 && result.rows[0].total_amount) {
        console.log(`${result.rows[0].pac_name}: $${parseInt(result.rows[0].total_amount).toLocaleString()}`);
        console.log(`  Transactions: ${result.rows[0].contribution_count}`);
      }
    }
    
    // Check if there are any committees with "Israel" in the name spending against Bowman
    console.log('\n📊 Committees with "Israel" in name spending against Bowman:');
    console.log('='.repeat(60));
    
    const israelQuery = `
      SELECT 
        cm.cmte_nm as pac_name,
        cc.cmte_id,
        SUM(CAST(cc.transaction_amt AS NUMERIC)) as total_amount,
        COUNT(*) as contribution_count
      FROM committee_candidate_contributions cc
      JOIN committee_master cm ON cc.cmte_id = cm.cmte_id
      WHERE cc.cand_id = 'H0NY16143'
      AND cc.file_year = 2024
      AND cc.transaction_amt < 0
      AND cm.cmte_nm ILIKE '%ISRAEL%'
      GROUP BY cm.cmte_nm, cc.cmte_id
      ORDER BY total_amount DESC
    `;
    
    const israelResult = await fecCompletePool.query(israelQuery);
    
    if (israelResult.rows.length > 0) {
      israelResult.rows.forEach((row, index) => {
        console.log(`${index + 1}. ${row.pac_name} (${row.cmte_id})`);
        console.log(`   Amount: $${parseInt(row.total_amount).toLocaleString()}`);
        console.log(`   Transactions: ${row.contribution_count}`);
        console.log('');
      });
    } else {
      console.log('No Israel-related committees spending against Bowman found');
    }
    
    console.log('✅ Analysis complete!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await fecCompletePool.end();
  }
}

findAntiBowmanSpending(); 