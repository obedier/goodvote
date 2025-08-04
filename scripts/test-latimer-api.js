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

async function testLatimerAPI() {
  try {
    console.log('🔍 Testing Israel Lobby API for George Latimer...');
    
    // Test the exact query that the API uses
    const testQuery = `
      SELECT 
        cc.cmte_id as pac_id,
        cm.cmte_nm as pac_name,
        SUM(CAST(ABS(cc.transaction_amt) AS NUMERIC)) as total_amount,
        COUNT(*) as contribution_count,
        MIN(cc.transaction_dt) as first_contribution,
        MAX(cc.transaction_dt) as last_contribution,
        CASE 
          WHEN cc.transaction_tp = '24E' THEN 'SUPPORT'
          WHEN cc.transaction_tp = '24A' THEN 'OPPOSE'
          WHEN SUM(cc.transaction_amt) > 0 THEN 'SUPPORT'
          WHEN SUM(cc.transaction_amt) < 0 THEN 'OPPOSE'
          ELSE 'NEUTRAL'
        END as support_oppose
      FROM committee_candidate_contributions cc
      JOIN committee_master cm ON cc.cmte_id = cm.cmte_id
      WHERE cc.cand_id = 'H4NY16087'  -- George Latimer's candidate ID
      AND cc.file_year = 2024
      AND cc.transaction_amt != 0
      AND cc.transaction_tp IN ('24A', '24E', '24C', '24N', '24K')
      AND (
        cc.cmte_id = ANY(ARRAY['C00797670', 'C00247403', 'C00741792', 'C00142299', 'C00127811', 'C00799031']) OR
        cm.cmte_nm ILIKE ANY(ARRAY['%AIPAC%', '%NORPAC%', '%Pro-Israel America%', '%Republican Jewish Coalition%', '%U.S. Israel PAC%', '%USI PAC%', '%JACPAC%', '%ZOA%', '%Zionist Organization of America%', '%Israel PAC%', '%Jewish PAC%', '%American Israel%', '%Israel America%', '%United Democracy Project%', '%UDP%'])
      )
      GROUP BY cc.cmte_id, cm.cmte_nm, cc.transaction_tp
      ORDER BY total_amount DESC
    `;
    
    const testResult = await fecCompletePool.query(testQuery);
    
    console.log('\n📊 Test Query Results for Latimer:');
    console.log('='.repeat(45));
    
    if (testResult.rows.length > 0) {
      testResult.rows.forEach((row, index) => {
        console.log(`${index + 1}. PAC: ${row.pac_name} (${row.pac_id})`);
        console.log(`   Amount: $${parseInt(row.total_amount).toLocaleString()}`);
        console.log(`   Support/Oppose: ${row.support_oppose}`);
        console.log(`   Transactions: ${row.contribution_count}`);
        console.log('');
      });
    } else {
      console.log('No pro-Israel PAC contributions found');
    }
    
    // Check if UDP is in the pro-Israel PAC list
    console.log('\n📊 Checking if UDP is in pro-Israel PAC list:');
    console.log('='.repeat(45));
    
    const udpCheckQuery = `
      SELECT cmte_id, cmte_nm
      FROM committee_master
      WHERE cmte_id = 'C00799031'
      AND file_year = 2024
    `;
    
    const udpCheckResult = await fecCompletePool.query(udpCheckQuery);
    
    if (udpCheckResult.rows.length > 0) {
      console.log(`UDP found: ${udpCheckResult.rows[0].cmte_nm} (${udpCheckResult.rows[0].cmte_id})`);
    } else {
      console.log('UDP not found in committee_master');
    }
    
    console.log('✅ Analysis complete!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await fecCompletePool.end();
  }
}

testLatimerAPI(); 