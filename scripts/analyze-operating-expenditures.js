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

async function analyzeOperatingExpenditures() {
  try {
    console.log('🔍 Analyzing Operating Expenditures for Rashida Tlaib\n');
    console.log('================================================================================');

    // Check operating expenditures structure
    const structureQuery = `
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'operating_expenditures'
      ORDER BY ordinal_position
    `;
    
    const structureResult = await fecCompletePool.query(structureQuery);
    console.log('📊 Operating Expenditures Table Structure:');
    structureResult.rows.forEach((row, index) => {
      console.log(`   ${index + 1}. ${row.column_name} (${row.data_type}, nullable: ${row.is_nullable})`);
    });

    // Get sample operating expenditures for Rashida's committee
    const sampleQuery = `
      SELECT 
        cmte_id,
        transaction_amt,
        purpose,
        category,
        transaction_dt,
        file_year,
        image_num
      FROM operating_expenditures 
      WHERE cmte_id = 'C00668608' 
      AND file_year = 2024
      ORDER BY transaction_amt DESC
      LIMIT 20
    `;
    
    const sampleResult = await fecCompletePool.query(sampleQuery);
    console.log('\n📊 Sample Operating Expenditures (Top 20 by Amount):');
    sampleResult.rows.forEach((row, index) => {
      console.log(`   ${index + 1}. Amount: $${parseFloat(row.transaction_amt).toLocaleString()}`);
      console.log(`      Purpose: ${row.purpose}`);
      console.log(`      Category: ${row.category}`);
      console.log(`      Date: ${row.transaction_dt}`);
    });

    // Analyze by category
    const categoryQuery = `
      SELECT 
        category,
        SUM(transaction_amt) as total_amount,
        COUNT(*) as transaction_count
      FROM operating_expenditures 
      WHERE cmte_id = 'C00668608' 
      AND file_year = 2024
      GROUP BY category
      ORDER BY total_amount DESC
    `;
    
    const categoryResult = await fecCompletePool.query(categoryQuery);
    console.log('\n📊 Operating Expenditures by Category:');
    categoryResult.rows.forEach((row, index) => {
      console.log(`   ${index + 1}. Category: ${row.category || 'Unknown'}`);
      console.log(`      Total: $${parseFloat(row.total_amount).toLocaleString()}`);
      console.log(`      Transactions: ${row.transaction_count}`);
    });

    // Check for independent expenditure indicators in purpose/category
    const independentQuery = `
      SELECT 
        purpose,
        category,
        SUM(transaction_amt) as total_amount,
        COUNT(*) as transaction_count
      FROM operating_expenditures 
      WHERE cmte_id = 'C00668608' 
      AND file_year = 2024
      AND (
        LOWER(purpose) LIKE '%independent%' 
        OR LOWER(purpose) LIKE '%expenditure%'
        OR LOWER(category) LIKE '%independent%'
        OR LOWER(category) LIKE '%expenditure%'
        OR LOWER(purpose) LIKE '%communication%'
        OR LOWER(category) LIKE '%communication%'
      )
      GROUP BY purpose, category
      ORDER BY total_amount DESC
    `;
    
    const independentResult = await fecCompletePool.query(independentQuery);
    console.log('\n📊 Potential Independent Expenditures (by purpose/category keywords):');
    if (independentResult.rows.length > 0) {
      independentResult.rows.forEach((row, index) => {
        console.log(`   ${index + 1}. Purpose: ${row.purpose}`);
        console.log(`      Category: ${row.category}`);
        console.log(`      Total: $${parseFloat(row.total_amount).toLocaleString()}`);
        console.log(`      Transactions: ${row.transaction_count}`);
      });
    } else {
      console.log('   ❌ No independent expenditure indicators found in purpose/category');
    }

    // Check total operating expenditures vs committee_candidate_contributions
    const totalQuery = `
      SELECT 
        'operating_expenditures' as source,
        SUM(transaction_amt) as total_amount,
        COUNT(*) as transaction_count
      FROM operating_expenditures 
      WHERE cmte_id = 'C00668608' 
      AND file_year = 2024
      
      UNION ALL
      
      SELECT 
        'committee_candidate_contributions' as source,
        SUM(transaction_amt) as total_amount,
        COUNT(*) as transaction_count
      FROM committee_candidate_contributions 
      WHERE cmte_id = 'C00668608' 
      AND file_year = 2024
    `;
    
    const totalResult = await fecCompletePool.query(totalQuery);
    console.log('\n📊 Comparison: Operating Expenditures vs Committee Candidate Contributions:');
    totalResult.rows.forEach(row => {
      console.log(`   ${row.source}: $${parseFloat(row.total_amount).toLocaleString()} (${row.transaction_count} transactions)`);
    });

    console.log('\n✅ Operating expenditures analysis completed!');
    
  } catch (error) {
    console.error('❌ Error analyzing operating expenditures:', error);
  } finally {
    await fecCompletePool.end();
  }
}

analyzeOperatingExpenditures(); 