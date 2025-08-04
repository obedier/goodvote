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

async function debugCandidateData() {
  try {
    console.log('🔍 Debugging Candidate Data...\n');
    
    const personId = 'PCCCCCA83'; // WYDEN, RONALD L.
    const electionYear = 2028;
    
    // 1. Check person_candidates table
    console.log('1. Checking person_candidates table...');
    const personQuery = `
      SELECT * FROM person_candidates 
      WHERE person_id = $1
      ORDER BY election_year DESC
    `;
    const personResult = await pool.query(personQuery, [personId]);
    console.log('Person candidates found:', personResult.rows.length);
    if (personResult.rows.length > 0) {
      console.log('Sample person candidate:', personResult.rows[0]);
    }
    
    // 2. Check candidate_summary table
    console.log('\n2. Checking candidate_summary table...');
    const summaryQuery = `
      SELECT * FROM candidate_summary 
      WHERE cand_id = $1
      ORDER BY file_year DESC
      LIMIT 5
    `;
    const summaryResult = await pool.query(summaryQuery, ['S6OR00110']);
    console.log('Candidate summary records found:', summaryResult.rows.length);
    if (summaryResult.rows.length > 0) {
      console.log('Sample candidate summary:', summaryResult.rows[0]);
    }
    
    // 3. Check candidate_committee_linkages
    console.log('\n3. Checking candidate_committee_linkages...');
    const linkageQuery = `
      SELECT * FROM candidate_committee_linkages 
      WHERE cand_id = $1
      LIMIT 5
    `;
    const linkageResult = await pool.query(linkageQuery, ['S6OR00110']);
    console.log('Committee linkages found:', linkageResult.rows.length);
    if (linkageResult.rows.length > 0) {
      console.log('Sample linkage:', linkageResult.rows[0]);
    }
    
    // 4. Check individual_contributions
    console.log('\n4. Checking individual_contributions...');
    const contribQuery = `
      SELECT COUNT(*) as count, 
             SUM(transaction_amt) as total_amount,
             MIN(ic.file_year) as min_year,
             MAX(ic.file_year) as max_year
      FROM individual_contributions ic
      JOIN candidate_committee_linkages ccl ON ic.cmte_id = ccl.cmte_id
      WHERE ccl.cand_id = $1
    `;
    const contribResult = await pool.query(contribQuery, ['S6OR00110']);
    console.log('Individual contributions:', contribResult.rows[0]);
    
    // 5. Check committee_candidate_contributions
    console.log('\n5. Checking committee_candidate_contributions...');
    const committeeQuery = `
      SELECT COUNT(*) as count,
             SUM(transaction_amt) as total_amount,
             MIN(file_year) as min_year,
             MAX(file_year) as max_year
      FROM committee_candidate_contributions
      WHERE cand_id = $1
    `;
    const committeeResult = await pool.query(committeeQuery, ['S6OR00110']);
    console.log('Committee contributions:', committeeResult.rows[0]);
    
    // 6. Check operating_expenditures
    console.log('\n6. Checking operating_expenditures...');
    const expendQuery = `
      SELECT COUNT(*) as count,
             SUM(transaction_amt) as total_amount,
             MIN(oe.file_year) as min_year,
             MAX(oe.file_year) as max_year
      FROM operating_expenditures oe
      JOIN candidate_committee_linkages ccl ON oe.cmte_id = ccl.cmte_id
      WHERE ccl.cand_id = $1
    `;
    const expendResult = await pool.query(expendQuery, ['S6OR00110']);
    console.log('Operating expenditures:', expendResult.rows[0]);
    
    // 7. Find a candidate with actual data
    console.log('\n7. Finding candidates with actual data...');
    const dataQuery = `
      SELECT 
        pc.person_id,
        pc.display_name,
        pc.cand_id,
        pc.election_year,
        COUNT(cs.*) as summary_records,
        COUNT(DISTINCT ccl.cmte_id) as committee_count
      FROM person_candidates pc
      LEFT JOIN candidate_summary cs ON pc.cand_id = cs.cand_id AND pc.election_year = cs.file_year
      LEFT JOIN candidate_committee_linkages ccl ON pc.cand_id = ccl.cand_id AND pc.election_year = ccl.cand_election_yr
      WHERE pc.election_year = 2024
      GROUP BY pc.person_id, pc.display_name, pc.cand_id, pc.election_year
      HAVING COUNT(cs.*) > 0
      ORDER BY summary_records DESC
      LIMIT 5
    `;
    const dataResult = await pool.query(dataQuery);
    console.log('Candidates with 2024 data:', dataResult.rows);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

debugCandidateData(); 