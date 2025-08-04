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

async function debugPersonCandidates() {
  try {
    console.log('🔍 Debugging person_candidates mapping...');
    
    // Check person_candidates table for Rashida Tlaib
    const personQuery = `
      SELECT person_id, cand_id, display_name, election_year
      FROM person_candidates
      WHERE person_id = 'P259F2D0E'
      ORDER BY election_year DESC
    `;
    
    const personResult = await fecCompletePool.query(personQuery);
    console.log('\n📋 Person-Candidate mappings for P259F2D0E:');
    personResult.rows.forEach((row, index) => {
      console.log(`  ${index + 1}. Person ID: ${row.person_id}, Candidate ID: ${row.cand_id}, Name: ${row.display_name}, Year: ${row.election_year}`);
    });

    // Check if the candidate ID from person_candidates matches the one in committee_candidate_contributions
    const candidateQuery = `
      SELECT DISTINCT cand_id, COUNT(*) as contribution_count
      FROM committee_candidate_contributions
      WHERE cand_id IN (
        SELECT cand_id FROM person_candidates WHERE person_id = 'P259F2D0E'
      )
      AND file_year = 2024
      GROUP BY cand_id
      ORDER BY contribution_count DESC
    `;
    
    const candidateResult = await fecCompletePool.query(candidateQuery);
    console.log('\n📊 Candidate IDs with contributions in 2024:');
    candidateResult.rows.forEach((row, index) => {
      console.log(`  ${index + 1}. Candidate ID: ${row.cand_id}, Contributions: ${row.contribution_count}`);
    });

  } catch (error) {
    console.error('❌ Error debugging person_candidates:', error);
  } finally {
    await fecCompletePool.end();
  }
}

debugPersonCandidates(); 