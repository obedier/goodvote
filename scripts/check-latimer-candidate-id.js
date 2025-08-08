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

async function checkLatimerCandidateId() {
  try {
    console.log('🔍 Checking George Latimer\'s candidate ID...');
    
    // Check person_candidates for Latimer
    const personQuery = `
      SELECT person_id, cand_id, display_name, election_year
      FROM person_candidates
      WHERE display_name ILIKE '%LATIMER%'
      AND election_year = 2024
      ORDER BY display_name
    `;
    
    const personResult = await fecCompletePool.query(personQuery);
    
    console.log('\n📊 George Latimer Person Candidates:');
    console.log('='.repeat(45));
    
    personResult.rows.forEach((row, index) => {
      console.log(`${index + 1}. Person ID: ${row.person_id}`);
      console.log(`   Candidate ID: ${row.cand_id}`);
      console.log(`   Name: ${row.display_name}`);
      console.log(`   Year: ${row.election_year}`);
      console.log('');
    });
    
    // Check UDP spending for Latimer using the candidate ID from the previous script
    const udpQuery = `
      SELECT 
        cc.transaction_tp,
        cc.transaction_amt,
        cc.transaction_dt,
        cc.name,
        cc.memo_text
      FROM committee_candidate_contributions cc
      WHERE cc.cmte_id = 'C00799031'  -- UDP
      AND cc.file_year = 2024
      AND cc.cand_id = 'H0NY16144'  -- George Latimer's candidate ID
      AND cc.transaction_tp IN ('24A', '24E')
      ORDER BY cc.transaction_amt DESC
    `;
    
    const udpResult = await fecCompletePool.query(udpQuery);
    
    console.log('\n📊 UDP Spending for George Latimer (H0NY16144):');
    console.log('='.repeat(55));
    
    if (udpResult.rows.length > 0) {
      let totalFor = 0;
      let totalAgainst = 0;
      
      udpResult.rows.forEach((row, index) => {
        const amount = parseFloat(row.transaction_amt);
        const type = row.transaction_tp === '24E' ? 'FOR' : 'AGAINST';
        
        if (row.transaction_tp === '24E') {
          totalFor += amount;
        } else {
          totalAgainst += amount;
        }
        
        console.log(`${index + 1}. Amount: $${amount.toLocaleString()}`);
        console.log(`   Type: ${row.transaction_tp} (${type})`);
        console.log(`   Date: ${row.transaction_dt}`);
        console.log(`   Name: ${row.name}`);
        console.log(`   Memo: ${row.memo_text || 'N/A'}`);
        console.log('');
      });
      
      console.log(`📊 Summary for Latimer:`);
      console.log(`   Total FOR: $${totalFor.toLocaleString()}`);
      console.log(`   Total AGAINST: $${totalAgainst.toLocaleString()}`);
      console.log(`   Net: $${(totalFor - totalAgainst).toLocaleString()}`);
    } else {
      console.log('No UDP spending found for Latimer');
    }
    
    console.log('✅ Analysis complete!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await fecCompletePool.end();
  }
}

checkLatimerCandidateId(); 