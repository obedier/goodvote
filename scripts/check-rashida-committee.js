const { Pool } = require('pg');

const fecCompleteConfig = {
  host: process.env.FEC_DB_HOST || process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.FEC_DB_PORT || process.env.DB_PORT || '5432'),
  database: process.env.FEC_DB_NAME || 'fec_gold',
  user: process.env.FEC_DB_USER || process.env.DB_USER || 'osamabedier',
  password: process.env.FEC_DB_PASSWORD || process.env.DB_PASSWORD || '',
  max: 3,
  min: 0,
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 3000,
  acquireTimeoutMillis: 3000,
};

const fecCompletePool = new Pool(fecCompleteConfig);

async function checkRashidaCommittee() {
  try {
    console.log('🔍 Checking Rashida Tlaib Committee and Operating Expenditures\n');
    console.log('================================================================================');

    // Get Rashida's committees
    const committeeQuery = `
      SELECT DISTINCT ccl.cmte_id, cm.cmte_nm, cm.cmte_tp
      FROM candidate_committee_linkages ccl
      LEFT JOIN committee_master cm ON ccl.cmte_id = cm.cmte_id
      WHERE ccl.cand_id = 'H8MI13250' 
      AND ccl.cand_election_yr = 2024
      ORDER BY cm.cmte_nm
    `;
    
    const committeeResult = await fecCompletePool.query(committeeQuery);
    console.log('📊 Rashida Tlaib Committees (2024):');
    committeeResult.rows.forEach((row, index) => {
      console.log(`   ${index + 1}. Committee: ${row.cmte_nm || 'Unknown'} (${row.cmte_id})`);
      console.log(`      Type: ${row.cmte_tp}`);
    });

    // Check operating expenditures for each committee
    console.log('\n📊 Operating Expenditures by Committee:');
    for (const committee of committeeResult.rows) {
      const cmteId = committee.cmte_id;
      const expendituresQuery = `
        SELECT 
          file_year,
          SUM(transaction_amt) as total_amount,
          COUNT(*) as transaction_count,
          COUNT(DISTINCT purpose) as unique_purposes
        FROM operating_expenditures 
        WHERE cmte_id = $1 
        AND file_year = 2024
        GROUP BY file_year
        ORDER BY file_year DESC
      `;
      
      const expendituresResult = await fecCompletePool.query(expendituresQuery, [cmteId]);
      
      if (expendituresResult.rows.length > 0) {
        console.log(`\n   Committee: ${committee.cmte_nm} (${cmteId})`);
        expendituresResult.rows.forEach(row => {
          console.log(`      Year: ${row.file_year}`);
          console.log(`      Total: $${parseFloat(row.total_amount).toLocaleString()}`);
          console.log(`      Transactions: ${row.transaction_count}`);
          console.log(`      Unique Purposes: ${row.unique_purposes}`);
        });
      }
    }

    // Check specific committee mentioned by user (C00668608)
    console.log('\n📊 Specific Committee C00668608 (User Query):');
    const specificQuery = `
      SELECT 
        file_year, 
        SUM(transaction_amt) as total_amount,
        COUNT(*) as transaction_count
      FROM operating_expenditures 
      WHERE cmte_id = 'C00668608' 
      AND file_year = 2024
      GROUP BY file_year 
      ORDER BY file_year DESC
    `;
    
    const specificResult = await fecCompletePool.query(specificQuery);
    if (specificResult.rows.length > 0) {
      specificResult.rows.forEach(row => {
        console.log(`   Year: ${row.file_year}`);
        console.log(`   Total: $${parseFloat(row.total_amount).toLocaleString()}`);
        console.log(`   Transactions: ${row.transaction_count}`);
      });
    } else {
      console.log('   ❌ No data found for committee C00668608 in 2024');
    }

    // Check committee master for this committee
    const cmteQuery = `
      SELECT * FROM committee_master WHERE cmte_id = 'C00668608'
    `;
    const cmteResult = await fecCompletePool.query(cmteQuery);
    if (cmteResult.rows.length > 0) {
      console.log(`\n   Committee Info: ${cmteResult.rows[0].cmte_nm}`);
      console.log(`   Type: ${cmteResult.rows[0].cmte_tp}`);
    }

    // Check if this committee is linked to Rashida
    const linkQuery = `
      SELECT * FROM candidate_committee_linkages 
      WHERE cmte_id = 'C00668608' AND cand_id = 'H8MI13250'
    `;
    const linkResult = await fecCompletePool.query(linkQuery);
    if (linkResult.rows.length > 0) {
      console.log('   ✅ Committee C00668608 is linked to Rashida Tlaib');
    } else {
      console.log('   ❌ Committee C00668608 is NOT linked to Rashida Tlaib');
    }

    console.log('\n✅ Committee check completed!');
    
  } catch (error) {
    console.error('❌ Error checking committee data:', error);
  } finally {
    await fecCompletePool.end();
  }
}

checkRashidaCommittee(); 