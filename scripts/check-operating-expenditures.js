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

const fecPool = new Pool(fecCompleteConfig);

async function checkOperatingExpenditures() {
  try {
    console.log('🔍 Checking Operating Expenditures Data\n');
    console.log('================================================================================');

    // Check total operating expenditures
    const totalQuery = `
      SELECT 
        COUNT(*) as total_transactions,
        SUM(transaction_amt) as total_amount
      FROM operating_expenditures
      WHERE file_year = 2024
    `;

    const totalResult = await fecPool.query(totalQuery);
    console.log('📊 Total Operating Expenditures (2024):');
    console.log(`   Transactions: ${totalResult.rows[0].total_transactions || 0}`);
    console.log(`   Total Amount: $${totalResult.rows[0].total_amount?.toLocaleString() || 0}`);

    // Check transaction types
    const typesQuery = `
      SELECT 
        transaction_tp,
        COUNT(*) as count,
        SUM(transaction_amt) as total_amount
      FROM operating_expenditures
      WHERE file_year = 2024
      GROUP BY transaction_tp
      ORDER BY total_amount DESC
    `;

    const typesResult = await fecPool.query(typesQuery);
    
    if (typesResult.rows.length > 0) {
      console.log('\n📊 Operating Expenditure Transaction Types:');
      typesResult.rows.forEach((row, index) => {
        console.log(`   ${index + 1}. Type ${row.transaction_tp}: $${row.total_amount?.toLocaleString() || 0} (${row.count} transactions)`);
      });
    } else {
      console.log('\n📊 No operating expenditure transaction types found');
    }

    // Check sample data
    const sampleQuery = `
      SELECT 
        transaction_tp,
        transaction_amt,
        payee_nm,
        cmte_id,
        purpose
      FROM operating_expenditures
      WHERE file_year = 2024
      LIMIT 5
    `;

    const sampleResult = await fecPool.query(sampleQuery);
    
    if (sampleResult.rows.length > 0) {
      console.log('\n📊 Sample Operating Expenditures:');
      sampleResult.rows.forEach((row, index) => {
        console.log(`   ${index + 1}. $${row.transaction_amt} - ${row.payee_nm} (Type: ${row.transaction_tp})`);
        if (row.purpose) {
          console.log(`      Purpose: ${row.purpose}`);
        }
      });
    } else {
      console.log('\n📊 No sample operating expenditures found');
    }

    console.log('\n✅ Operating expenditures check completed!');
    
  } catch (error) {
    console.error('❌ Error checking operating expenditures:', error);
  } finally {
    await fecPool.end();
  }
}

checkOperatingExpenditures(); 