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

async function testIsraelLobbyQuery() {
  try {
    console.log('🔍 Testing Israel Lobby Query for George Latimer...');
    
    const PRO_ISRAEL_PACS = ['C00797670', 'C00247403', 'C00741792', 'C00142299', 'C00127811', 'C00799031'];
    const PRO_ISRAEL_KEYWORDS = ['AIPAC', 'NORPAC', 'Pro-Israel America', 'Republican Jewish Coalition', 'U.S. Israel PAC', 'USI PAC', 'JACPAC', 'ZOA', 'Zionist Organization of America', 'Israel PAC', 'Jewish PAC', 'American Israel', 'Israel America', 'United Democracy Project', 'UDP'];
    
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
        cc.cmte_id = ANY($1) OR
        cm.cmte_nm ILIKE ANY($2)
      )
      GROUP BY cc.cmte_id, cm.cmte_nm, cc.transaction_tp
      ORDER BY total_amount DESC
    `;
    
    const testResult = await fecCompletePool.query(testQuery, [
      PRO_ISRAEL_PACS,
      PRO_ISRAEL_KEYWORDS.map(k => `%${k}%`)
    ]);
    
    console.log('\n📊 Query Results:');
    console.log('='.repeat(45));
    
    if (testResult.rows.length > 0) {
      let totalSupport = 0;
      let totalOppose = 0;
      
      testResult.rows.forEach((row, index) => {
        const amount = parseFloat(row.total_amount);
        console.log(`${index + 1}. PAC: ${row.pac_name} (${row.pac_id})`);
        console.log(`   Amount: $${amount.toLocaleString()}`);
        console.log(`   Support/Oppose: ${row.support_oppose}`);
        console.log(`   Transactions: ${row.contribution_count}`);
        console.log('');
        
        if (row.support_oppose === 'SUPPORT') {
          totalSupport += amount;
        } else if (row.support_oppose === 'OPPOSE') {
          totalOppose += amount;
        }
      });
      
      console.log(`📊 Summary:`);
      console.log(`   Total Support: $${totalSupport.toLocaleString()}`);
      console.log(`   Total Oppose: $${totalOppose.toLocaleString()}`);
      console.log(`   Net: $${(totalSupport - totalOppose).toLocaleString()}`);
      
      // Calculate score manually
      const supportScore = Math.min(60, (totalSupport / 10000) * 30);
      const opposeScore = Math.min(60, (totalOppose / 10000) * 30);
      const pacScore = Math.max(0, supportScore - opposeScore);
      const lobbyScore = Math.min(100, Math.max(0, pacScore));
      
      console.log(`\n📊 Score Calculation:`);
      console.log(`   Support Score: ${supportScore.toFixed(2)}`);
      console.log(`   Oppose Score: ${opposeScore.toFixed(2)}`);
      console.log(`   PAC Score: ${pacScore.toFixed(2)}`);
      console.log(`   Final Score: ${lobbyScore.toFixed(2)}`);
    } else {
      console.log('No pro-Israel PAC contributions found');
    }
    
    console.log('✅ Analysis complete!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await fecCompletePool.end();
  }
}

testIsraelLobbyQuery(); 