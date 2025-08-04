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

async function checkUDPProIsrael() {
  try {
    console.log('🔍 Checking if UDP is pro-Israel...');
    
    // Check UDP committee details
    const udpQuery = `
      SELECT cmte_nm, cmte_tp, cmte_dsgn, cmte_filing_freq, cmte_st, cmte_id
      FROM committee_master 
      WHERE cmte_id = 'C00799031'
      AND file_year = 2024
    `;
    
    const udpResult = await fecCompletePool.query(udpQuery);
    
    if (udpResult.rows.length > 0) {
      const udp = udpResult.rows[0];
      console.log(`Name: ${udp.cmte_nm}`);
      console.log(`Type: ${udp.cmte_tp}`);
      console.log(`Designation: ${udp.cmte_dsgn}`);
      console.log(`Filing Frequency: ${udp.cmte_filing_freq}`);
      console.log(`State: ${udp.cmte_st}`);
      console.log(`Committee ID: ${udp.cmte_id}`);
    }
    
    // Check what candidates UDP supports
    console.log('\n📊 Top 10 candidates supported by UDP:');
    const candidatesQuery = `
      SELECT 
        pc.display_name,
        pc.state,
        pc.current_district,
        pc.current_party,
        SUM(CAST(cc.transaction_amt AS NUMERIC)) as total_amount,
        COUNT(*) as contribution_count
      FROM committee_candidate_contributions cc
      JOIN person_candidates pc ON cc.cand_id = pc.cand_id
      WHERE cc.cmte_id = 'C00799031'
      AND cc.file_year = 2024
      AND cc.transaction_amt > 0
      GROUP BY pc.display_name, pc.state, pc.current_district, pc.current_party
      ORDER BY total_amount DESC
      LIMIT 10
    `;
    
    const candidatesResult = await fecCompletePool.query(candidatesQuery);
    
    candidatesResult.rows.forEach((row, index) => {
      console.log(`${index + 1}. ${row.display_name} (${row.state}-${row.current_district})`);
      console.log(`   Party: ${row.current_party}`);
      console.log(`   Amount: $${parseInt(row.total_amount).toLocaleString()}`);
      console.log(`   Contributions: ${row.contribution_count}`);
      console.log('');
    });
    
    // Check if UDP supports George Latimer (Bowman's opponent)
    console.log('\n🔍 Checking UDP support for George Latimer (Bowman\'s opponent):');
    const latimerQuery = `
      SELECT 
        SUM(CAST(cc.transaction_amt AS NUMERIC)) as total_amount,
        COUNT(*) as contribution_count
      FROM committee_candidate_contributions cc
      WHERE cc.cmte_id = 'C00799031'
      AND cc.file_year = 2024
      AND cc.cand_id = 'H0NY16144'  -- George Latimer's candidate ID
      AND cc.transaction_amt > 0
    `;
    
    const latimerResult = await fecCompletePool.query(latimerQuery);
    
    if (latimerResult.rows[0].total_amount) {
      console.log(`UDP Support for Latimer: $${parseInt(latimerResult.rows[0].total_amount).toLocaleString()}`);
      console.log(`Contributions: ${latimerResult.rows[0].contribution_count}`);
    } else {
      console.log('No UDP support found for Latimer');
    }
    
    console.log('\n✅ Analysis complete!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await fecCompletePool.end();
  }
}

checkUDPProIsrael(); 