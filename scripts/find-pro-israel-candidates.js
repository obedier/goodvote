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

// Pro-Israel PAC identifiers
const PRO_ISRAEL_PACS = [
  'C00797670', // AIPAC PAC
  'C00799031', // United Democracy Project (UDP)
  'C00247403', // NORPAC
  'C00710848', // DMFI PAC
  'C00741792', // Pro-Israel America PAC
  'C00142299', // Republican Jewish Coalition PAC
];

const PRO_ISRAEL_KEYWORDS = [
  'AIPAC',
  'NORPAC',
  'DMFI',
  'Pro-Israel',
  'Jewish Coalition',
  'Israel America',
  'United Democracy',
  'JACPAC',
  'ZOA',
  'Zionist Organization',
  'Israel PAC',
  'Jewish PAC'
];

async function findProIsraelCandidates() {
  try {
    console.log('🔍 Finding candidates with pro-Israel support...');
    
    // Find candidates with pro-Israel PAC contributions
    const query = `
      SELECT DISTINCT 
        pc.person_id,
        pc.cand_id,
        pc.display_name,
        pc.state,
        pc.current_office,
        pc.current_district,
        pc.current_party,
        SUM(CAST(cc.transaction_amt AS NUMERIC)) as total_pro_israel_amount,
        COUNT(DISTINCT cc.cmte_id) as pro_israel_pac_count
      FROM person_candidates pc
      JOIN committee_candidate_contributions cc ON pc.cand_id = cc.cand_id
      JOIN committee_master cm ON cc.cmte_id = cm.cmte_id
      WHERE cc.file_year = 2024
      AND cc.transaction_amt > 0
      AND cc.transaction_tp IN ('24A', '24E', '24C', '24N', '24K')
      AND (
        cc.cmte_id = ANY($1) OR
        cm.cmte_nm ILIKE ANY($2)
      )
      GROUP BY pc.person_id, pc.cand_id, pc.display_name, pc.state, pc.current_office, pc.current_district, pc.current_party
      ORDER BY total_pro_israel_amount DESC
      LIMIT 10
    `;
    
    const result = await fecCompletePool.query(query, [
      PRO_ISRAEL_PACS, 
      PRO_ISRAEL_KEYWORDS.map(k => `%${k}%`)
    ]);
    
    console.log('\n📊 Top 10 Candidates with Pro-Israel Support:');
    console.log('='.repeat(80));
    
    result.rows.forEach((row, index) => {
      console.log(`${index + 1}. ${row.display_name} (${row.state}-${row.current_district})`);
      console.log(`   Party: ${row.current_party}, Office: ${row.current_office}`);
      console.log(`   Pro-Israel Amount: $${parseInt(row.total_pro_israel_amount).toLocaleString()}`);
      console.log(`   Pro-Israel PACs: ${row.pro_israel_pac_count}`);
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

findProIsraelCandidates(); 