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

async function findAIPACCandidates() {
  try {
    console.log('🔍 Finding candidates with AIPAC PAC support...');
    
    // Find candidates with AIPAC PAC contributions
    const query = `
      SELECT DISTINCT 
        pc.person_id,
        pc.cand_id,
        pc.display_name,
        pc.state,
        pc.current_office,
        pc.current_district,
        pc.current_party,
        SUM(CAST(cc.transaction_amt AS NUMERIC)) as total_aipac_amount,
        COUNT(DISTINCT cc.cmte_id) as aipac_contributions
      FROM person_candidates pc
      JOIN committee_candidate_contributions cc ON pc.cand_id = cc.cand_id
      WHERE cc.file_year = 2024
      AND cc.transaction_amt > 0
      AND cc.transaction_tp IN ('24A', '24E', '24C', '24N', '24K')
      AND cc.cmte_id = 'C00797670'  -- AIPAC PAC
      GROUP BY pc.person_id, pc.cand_id, pc.display_name, pc.state, pc.current_office, pc.current_district, pc.current_party
      ORDER BY total_aipac_amount DESC
      LIMIT 10
    `;
    
    const result = await fecCompletePool.query(query);
    
    console.log('\n📊 Top 10 Candidates with AIPAC PAC Support:');
    console.log('='.repeat(80));
    
    result.rows.forEach((row, index) => {
      console.log(`${index + 1}. ${row.display_name} (${row.state}-${row.current_district})`);
      console.log(`   Party: ${row.current_party}, Office: ${row.current_office}`);
      console.log(`   AIPAC Amount: $${parseInt(row.total_aipac_amount).toLocaleString()}`);
      console.log(`   AIPAC Contributions: ${row.aipac_contributions}`);
      console.log(`   Person ID: ${row.person_id}`);
      console.log('');
    });
    
    console.log('✅ Analysis complete!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await fecCompletePool.end();
  }
}

findAIPACCandidates(); 