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

async function checkLatimerAllCandidateIds() {
  try {
    console.log('🔍 Checking all candidate IDs for George Latimer...');
    
    // Check all candidate IDs for George Latimer
    const candidateQuery = `
      SELECT cand_id, cand_name, cand_office, cand_office_st, cand_office_district
      FROM candidate_master
      WHERE cand_name ILIKE '%LATIMER%'
      AND cand_name ILIKE '%GEORGE%'
      AND file_year = 2024
      ORDER BY cand_name
    `;
    
    const candidateResult = await fecCompletePool.query(candidateQuery);
    
    console.log('\n📊 George Latimer Candidate Records:');
    console.log('='.repeat(45));
    
    candidateResult.rows.forEach((row, index) => {
      console.log(`${index + 1}. Candidate ID: ${row.cand_id}`);
      console.log(`   Name: ${row.cand_name}`);
      console.log(`   Office: ${row.cand_office}`);
      console.log(`   State: ${row.cand_office_st}`);
      console.log(`   District: ${row.cand_office_district}`);
      console.log('');
    });
    
    // Check UDP spending for each candidate ID
    for (const candidate of candidateResult.rows) {
      const udpQuery = `
        SELECT 
          cc.transaction_tp,
          SUM(CAST(cc.transaction_amt AS NUMERIC)) as total_amount,
          COUNT(*) as transaction_count
        FROM committee_candidate_contributions cc
        WHERE cc.cmte_id = 'C00799031'  -- UDP
        AND cc.file_year = 2024
        AND cc.cand_id = '${candidate.cand_id}'
        AND cc.transaction_tp IN ('24A', '24E')
        GROUP BY cc.transaction_tp
        ORDER BY total_amount DESC
      `;
      
      const udpResult = await fecCompletePool.query(udpQuery);
      
      console.log(`📊 UDP Spending for ${candidate.cand_name} (${candidate.cand_id}):`);
      console.log('='.repeat(60));
      
      if (udpResult.rows.length > 0) {
        let totalFor = 0;
        let totalAgainst = 0;
        
        udpResult.rows.forEach((row) => {
          const amount = parseFloat(row.total_amount);
          const type = row.transaction_tp === '24E' ? 'FOR' : 'AGAINST';
          
          if (row.transaction_tp === '24E') {
            totalFor += amount;
          } else {
            totalAgainst += amount;
          }
          
          console.log(`   ${row.transaction_tp} (${type}): $${amount.toLocaleString()} (${row.transaction_count} transactions)`);
        });
        
        console.log(`   Summary: FOR $${totalFor.toLocaleString()}, AGAINST $${totalAgainst.toLocaleString()}`);
        console.log(`   Net: $${(totalFor - totalAgainst).toLocaleString()}`);
      } else {
        console.log('   No UDP spending found');
      }
      console.log('');
    }
    
    console.log('✅ Analysis complete!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await fecCompletePool.end();
  }
}

checkLatimerAllCandidateIds(); 