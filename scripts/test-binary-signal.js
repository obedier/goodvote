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

async function testBinarySignal() {
  try {
    console.log('🔍 Testing Binary Signal Logic...');
    
    // Test the scoring logic with different scenarios
    const testScenarios = [
      { support: 100000, oppose: 50000, description: 'More Support' },
      { support: 50000, oppose: 100000, description: 'More Oppose' },
      { support: 10000, oppose: 0, description: 'Only Support' },
      { support: 0, oppose: 10000, description: 'Only Oppose' },
      { support: 50000, oppose: 50000, description: 'Equal Amounts' }
    ];
    
    console.log('\n📊 Binary Signal Test Scenarios:');
    console.log('='.repeat(50));
    
    testScenarios.forEach((scenario, index) => {
      const maxAmount = Math.max(scenario.support, scenario.oppose);
      const isSupport = scenario.support > scenario.oppose;
      
      let pacScore = 0;
      if (maxAmount > 0) {
        if (isSupport) {
          pacScore = Math.min(60, (maxAmount / 10000) * 30);
        } else {
          pacScore = Math.min(60, (maxAmount / 10000) * 30);
          if (maxAmount > 50000) {
            pacScore = 0;
          }
        }
      }
      
      console.log(`${index + 1}. ${scenario.description}`);
      console.log(`   Support: $${scenario.support.toLocaleString()}`);
      console.log(`   Oppose: $${scenario.oppose.toLocaleString()}`);
      console.log(`   Max Amount: $${maxAmount.toLocaleString()}`);
      console.log(`   Signal: ${isSupport ? 'SUPPORT' : 'OPPOSE'}`);
      console.log(`   Score: ${pacScore}`);
      console.log('');
    });
    
    // Test with actual data for Bowman (should be oppose)
    const bowmanQuery = `
      SELECT 
        SUM(CASE WHEN cc.transaction_tp = '24E' THEN CAST(cc.transaction_amt AS NUMERIC) ELSE 0 END) as support_amount,
        SUM(CASE WHEN cc.transaction_tp = '24A' THEN CAST(cc.transaction_amt AS NUMERIC) ELSE 0 END) as oppose_amount
      FROM committee_candidate_contributions cc
      WHERE cc.cmte_id = 'C00799031'  -- UDP
      AND cc.cand_id = 'H0NY16143'  -- Jamaal Bowman
      AND cc.file_year = 2024
      AND cc.transaction_tp IN ('24A', '24E')
    `;
    
    const bowmanResult = await fecCompletePool.query(bowmanQuery);
    
    if (bowmanResult.rows.length > 0) {
      const row = bowmanResult.rows[0];
      const supportAmount = parseFloat(row.support_amount || 0);
      const opposeAmount = parseFloat(row.oppose_amount || 0);
      const maxAmount = Math.max(supportAmount, opposeAmount);
      const isSupport = supportAmount > opposeAmount;
      
      let pacScore = 0;
      if (maxAmount > 0) {
        if (isSupport) {
          pacScore = Math.min(60, (maxAmount / 10000) * 30);
        } else {
          pacScore = Math.min(60, (maxAmount / 10000) * 30);
          if (maxAmount > 50000) {
            pacScore = 0;
          }
        }
      }
      
      console.log('📊 Bowman Test (Should be OPPOSE):');
      console.log('='.repeat(40));
      console.log(`   Support: $${supportAmount.toLocaleString()}`);
      console.log(`   Oppose: $${opposeAmount.toLocaleString()}`);
      console.log(`   Max Amount: $${maxAmount.toLocaleString()}`);
      console.log(`   Signal: ${isSupport ? 'SUPPORT' : 'OPPOSE'}`);
      console.log(`   Score: ${pacScore}`);
      console.log('');
    }
    
    // Test with actual data for Latimer (should be support)
    const latimerQuery = `
      SELECT 
        SUM(CASE WHEN cc.transaction_tp = '24E' THEN CAST(cc.transaction_amt AS NUMERIC) ELSE 0 END) as support_amount,
        SUM(CASE WHEN cc.transaction_tp = '24A' THEN CAST(cc.transaction_amt AS NUMERIC) ELSE 0 END) as oppose_amount
      FROM committee_candidate_contributions cc
      WHERE cc.cmte_id = 'C00799031'  -- UDP
      AND cc.cand_id = 'H4NY16087'  -- George Latimer
      AND cc.file_year = 2024
      AND cc.transaction_tp IN ('24A', '24E')
    `;
    
    const latimerResult = await fecCompletePool.query(latimerQuery);
    
    if (latimerResult.rows.length > 0) {
      const row = latimerResult.rows[0];
      const supportAmount = parseFloat(row.support_amount || 0);
      const opposeAmount = parseFloat(row.oppose_amount || 0);
      const maxAmount = Math.max(supportAmount, opposeAmount);
      const isSupport = supportAmount > opposeAmount;
      
      let pacScore = 0;
      if (maxAmount > 0) {
        if (isSupport) {
          pacScore = Math.min(60, (maxAmount / 10000) * 30);
        } else {
          pacScore = Math.min(60, (maxAmount / 10000) * 30);
          if (maxAmount > 50000) {
            pacScore = 0;
          }
        }
      }
      
      console.log('📊 Latimer Test (Should be SUPPORT):');
      console.log('='.repeat(40));
      console.log(`   Support: $${supportAmount.toLocaleString()}`);
      console.log(`   Oppose: $${opposeAmount.toLocaleString()}`);
      console.log(`   Max Amount: $${maxAmount.toLocaleString()}`);
      console.log(`   Signal: ${isSupport ? 'SUPPORT' : 'OPPOSE'}`);
      console.log(`   Score: ${pacScore}`);
      console.log('');
    }
    
    console.log('✅ Analysis complete!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await fecCompletePool.end();
  }
}

testBinarySignal(); 