#!/usr/bin/env node

const { Pool } = require('pg');
require('dotenv').config();

const fecConfig = {
  host: process.env.FEC_DB_HOST || 'localhost',
  port: parseInt(process.env.FEC_DB_PORT || '5432'),
  database: process.env.FEC_DB_NAME || 'fec_gold',
  user: process.env.FEC_DB_USER || 'osamabedier',
  password: process.env.FEC_DB_PASSWORD || '',
};

const pool = new Pool(fecConfig);

async function implementStateData() {
  try {
    console.log('🔍 Implementing Real State-Level Data...\n');
    
    // Test with a specific state
    const testState = 'CA';
    const electionYear = 2024;
    
    console.log(`Testing state data for ${testState} in ${electionYear}...`);
    
    // 1. Get total contributions by state
    console.log('\n1. Getting total contributions by state...');
    const totalContributionsQuery = `
      SELECT 
        COUNT(*) as contribution_count,
        SUM(transaction_amt) as total_amount,
        COUNT(DISTINCT ic.name) as unique_contributors,
        COUNT(DISTINCT ic.cmte_id) as unique_committees
      FROM individual_contributions ic
      JOIN candidate_committee_linkages ccl ON ic.cmte_id = ccl.cmte_id
      JOIN person_candidates pc ON ccl.cand_id = pc.cand_id
      WHERE ic.state = $1 
      AND ic.file_year = $2
      AND ic.transaction_amt > 0
    `;
    
    const totalResult = await pool.query(totalContributionsQuery, [testState, electionYear]);
    console.log('Total contributions:', totalResult.rows[0]);
    
    // 2. Get top cities
    console.log('\n2. Getting top cities...');
    const topCitiesQuery = `
      SELECT 
        ic.city,
        COUNT(*) as contribution_count,
        SUM(ic.transaction_amt) as total_amount
      FROM individual_contributions ic
      JOIN candidate_committee_linkages ccl ON ic.cmte_id = ccl.cmte_id
      JOIN person_candidates pc ON ccl.cand_id = pc.cand_id
      WHERE ic.state = $1 
      AND ic.file_year = $2
      AND ic.transaction_amt > 0
      AND ic.city IS NOT NULL
      GROUP BY ic.city
      ORDER BY total_amount DESC
      LIMIT 10
    `;
    
    const citiesResult = await pool.query(topCitiesQuery, [testState, electionYear]);
    console.log('Top cities:', citiesResult.rows.slice(0, 5));
    
    // 3. Get top contributors
    console.log('\n3. Getting top contributors...');
    const topContributorsQuery = `
      SELECT 
        ic.name,
        COUNT(*) as contribution_count,
        SUM(ic.transaction_amt) as total_amount
      FROM individual_contributions ic
      JOIN candidate_committee_linkages ccl ON ic.cmte_id = ccl.cmte_id
      JOIN person_candidates pc ON ccl.cand_id = pc.cand_id
      WHERE ic.state = $1 
      AND ic.file_year = $2
      AND ic.transaction_amt > 0
      AND ic.name IS NOT NULL
      GROUP BY ic.name
      ORDER BY total_amount DESC
      LIMIT 10
    `;
    
    const contributorsResult = await pool.query(topContributorsQuery, [testState, electionYear]);
    console.log('Top contributors:', contributorsResult.rows.slice(0, 5));
    
    // 4. Get party breakdown
    console.log('\n4. Getting party breakdown...');
    const partyBreakdownQuery = `
      SELECT 
        pc.current_party,
        COUNT(*) as candidate_count,
        SUM(cs.ttl_receipts) as total_receipts,
        SUM(cs.ttl_disb) as total_disbursements
      FROM person_candidates pc
      LEFT JOIN candidate_summary cs ON pc.cand_id = cs.cand_id AND pc.election_year = cs.file_year
      WHERE pc.state = $1 
      AND pc.election_year = $2
      GROUP BY pc.current_party
      ORDER BY total_receipts DESC
    `;
    
    const partyResult = await pool.query(partyBreakdownQuery, [testState, electionYear]);
    console.log('Party breakdown:', partyResult.rows);
    
    // 5. Get committee contributions
    console.log('\n5. Getting committee contributions...');
    const committeeQuery = `
      SELECT 
        cm.cmte_nm,
        COUNT(*) as contribution_count,
        SUM(cc.transaction_amt) as total_amount
      FROM committee_candidate_contributions cc
      JOIN committee_master cm ON cc.cmte_id = cm.cmte_id
      JOIN person_candidates pc ON cc.cand_id = pc.cand_id
      WHERE pc.state = $1 
      AND cc.file_year = $2
      AND cc.transaction_amt > 0
      GROUP BY cm.cmte_nm
      ORDER BY total_amount DESC
      LIMIT 10
    `;
    
    const committeeResult = await pool.query(committeeQuery, [testState, electionYear]);
    console.log('Top committees:', committeeResult.rows.slice(0, 5));
    
    console.log('\n✅ State data implementation test completed!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

implementStateData(); 