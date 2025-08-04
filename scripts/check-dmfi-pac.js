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

async function checkDMFIPAC() {
  try {
    console.log('🔍 Checking DMFI PAC details...');
    
    // Get DMFI PAC details
    const query = `
      SELECT cmte_nm, cmte_tp, cmte_dsgn, cmte_filing_freq, cmte_st, cmte_id
      FROM committee_master 
      WHERE cmte_id = 'C00710848'
      AND file_year = 2024
    `;
    
    const result = await fecCompletePool.query(query);
    
    if (result.rows.length > 0) {
      const dmfi = result.rows[0];
      console.log(`Name: ${dmfi.cmte_nm}`);
      console.log(`Type: ${dmfi.cmte_tp}`);
      console.log(`Designation: ${dmfi.cmte_dsgn}`);
      console.log(`Filing Frequency: ${dmfi.cmte_filing_freq}`);
      console.log(`State: ${dmfi.cmte_st}`);
      console.log(`Committee ID: ${dmfi.cmte_id}`);
    }
    
    // Check what candidates DMFI PAC supports
    console.log('\n📊 Top 10 candidates supported by DMFI PAC:');
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
      WHERE cc.cmte_id = 'C00710848'
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
    
    console.log('✅ Analysis complete!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await fecCompletePool.end();
  }
}

checkDMFIPAC(); 