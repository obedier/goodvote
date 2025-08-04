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

async function debugPersonMapping() {
  try {
    console.log('🔍 Debugging person_id to cand_id mapping...');
    
    // Check person_id PFBE2320B (the one I was using)
    const personQuery = `
      SELECT person_id, cand_id, display_name, election_year
      FROM person_candidates
      WHERE person_id = 'PFBE2320B'
      ORDER BY election_year DESC
    `;
    
    const personResult = await fecCompletePool.query(personQuery);
    
    console.log('\n📊 Person ID PFBE2320B mapping:');
    console.log('='.repeat(40));
    
    if (personResult.rows.length > 0) {
      personResult.rows.forEach((row, index) => {
        console.log(`${index + 1}. Person ID: ${row.person_id}`);
        console.log(`   Candidate ID: ${row.cand_id}`);
        console.log(`   Name: ${row.display_name}`);
        console.log(`   Year: ${row.election_year}`);
        console.log('');
      });
    } else {
      console.log('No mapping found for PFBE2320B');
    }
    
    // Check if this candidate ID has UDP contributions
    if (personResult.rows.length > 0) {
      const candId = personResult.rows[0].cand_id;
      const udpQuery = `
        SELECT 
          cc.transaction_tp,
          SUM(CAST(cc.transaction_amt AS NUMERIC)) as total_amount,
          COUNT(*) as transaction_count
        FROM committee_candidate_contributions cc
        WHERE cc.cmte_id = 'C00799031'  -- UDP
        AND cc.file_year = 2024
        AND cc.cand_id = '${candId}'
        AND cc.transaction_tp IN ('24A', '24E')
        GROUP BY cc.transaction_tp
        ORDER BY total_amount DESC
      `;
      
      const udpResult = await fecCompletePool.query(udpQuery);
      
      console.log(`📊 UDP Spending for candidate ID ${candId}:`);
      console.log('='.repeat(50));
      
      if (udpResult.rows.length > 0) {
        udpResult.rows.forEach((row) => {
          const type = row.transaction_tp === '24E' ? 'FOR' : 'AGAINST';
          console.log(`   ${row.transaction_tp} (${type}): $${parseInt(row.total_amount).toLocaleString()} (${row.transaction_count} transactions)`);
        });
      } else {
        console.log('   No UDP spending found');
      }
    }
    
    // Check all George Latimer person IDs
    const allLatimerQuery = `
      SELECT person_id, cand_id, display_name, election_year
      FROM person_candidates
      WHERE display_name ILIKE '%LATIMER%'
      AND display_name ILIKE '%GEORGE%'
      AND election_year = 2024
      ORDER BY person_id
    `;
    
    const allLatimerResult = await fecCompletePool.query(allLatimerQuery);
    
    console.log('\n📊 All George Latimer Person IDs:');
    console.log('='.repeat(40));
    
    allLatimerResult.rows.forEach((row, index) => {
      console.log(`${index + 1}. Person ID: ${row.person_id}`);
      console.log(`   Candidate ID: ${row.cand_id}`);
      console.log(`   Name: ${row.display_name}`);
      console.log(`   Year: ${row.election_year}`);
      console.log('');
    });
    
    console.log('✅ Analysis complete!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await fecCompletePool.end();
  }
}

debugPersonMapping(); 