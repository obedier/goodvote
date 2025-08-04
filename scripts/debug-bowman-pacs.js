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

async function debugBowmanPACs() {
  try {
    console.log('🔍 Debugging Jamaal Bowman PAC contributions...');
    
    // Check what PACs are contributing to Bowman
    const query = `
      SELECT 
        cc.cmte_id,
        cm.cmte_nm as pac_name,
        cm.cmte_tp as committee_type,
        SUM(CAST(cc.transaction_amt AS NUMERIC)) as total_amount,
        COUNT(*) as contribution_count,
        MIN(cc.transaction_dt) as first_contribution,
        MAX(cc.transaction_dt) as last_contribution
      FROM committee_candidate_contributions cc
      JOIN committee_master cm ON cc.cmte_id = cm.cmte_id
      WHERE cc.cand_id = 'H0NY16143'
      AND cc.file_year = 2024
      AND cc.transaction_amt > 0
      AND cc.transaction_tp IN ('24A', '24E', '24C', '24N', '24K')
      GROUP BY cc.cmte_id, cm.cmte_nm, cm.cmte_tp
      ORDER BY total_amount DESC
      LIMIT 20
    `;
    
    const result = await fecCompletePool.query(query);
    
    console.log('\n📊 All PAC Contributions to Jamaal Bowman:');
    console.log('='.repeat(80));
    
    result.rows.forEach((row, index) => {
      console.log(`${index + 1}. ${row.pac_name} (${row.cmte_id})`);
      console.log(`   Type: ${row.committee_type}`);
      console.log(`   Amount: $${parseInt(row.total_amount).toLocaleString()}`);
      console.log(`   Contributions: ${row.contribution_count}`);
      console.log(`   Date Range: ${row.first_contribution} to ${row.last_contribution}`);
      console.log('');
    });
    
    // Check if UDP is actually pro-Israel
    console.log('\n🔍 Checking UDP (C00799031) details:');
    const udpQuery = `
      SELECT cmte_nm, cmte_tp, cmte_dsgn, cmte_filing_freq, cmte_st
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
    }
    
    // Check DMFI PAC details
    console.log('\n🔍 Checking DMFI PAC (C00710848) details:');
    const dmfiQuery = `
      SELECT cmte_nm, cmte_tp, cmte_dsgn, cmte_filing_freq, cmte_st
      FROM committee_master 
      WHERE cmte_id = 'C00710848'
      AND file_year = 2024
    `;
    
    const dmfiResult = await fecCompletePool.query(dmfiQuery);
    if (dmfiResult.rows.length > 0) {
      const dmfi = dmfiResult.rows[0];
      console.log(`Name: ${dmfi.cmte_nm}`);
      console.log(`Type: ${dmfi.cmte_tp}`);
      console.log(`Designation: ${dmfi.cmte_dsgn}`);
      console.log(`Filing Frequency: ${dmfi.cmte_filing_freq}`);
      console.log(`State: ${dmfi.cmte_st}`);
    }
    
    console.log('\n✅ Analysis complete!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await fecCompletePool.end();
  }
}

debugBowmanPACs(); 