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

async function analyzeCommitteeContributions() {
  try {
    console.log('🔍 Analyzing Committee Candidate Contributions Transaction Types\n');
    console.log('================================================================================');

    // Get all transaction types and their amounts
    const transactionTypesQuery = `
      SELECT 
        transaction_tp,
        COUNT(*) as transaction_count,
        SUM(transaction_amt) as total_amount,
        AVG(transaction_amt) as avg_amount
      FROM committee_candidate_contributions
      WHERE file_year = 2024
      GROUP BY transaction_tp
      ORDER BY total_amount DESC
    `;

    const transactionTypesResult = await fecPool.query(transactionTypesQuery);
    
    console.log('📊 Committee Candidate Contributions Transaction Types:');
    transactionTypesResult.rows.forEach((row, index) => {
      console.log(`   ${index + 1}. Type ${row.transaction_tp}: $${row.total_amount?.toLocaleString() || 0} (${row.transaction_count} transactions, avg: $${Math.round(row.avg_amount || 0)})`);
    });

    // Get sample data for each transaction type
    console.log('\n📊 Sample Data by Transaction Type:');
    for (const row of transactionTypesResult.rows) {
      const sampleQuery = `
        SELECT 
          cc.transaction_tp,
          cc.transaction_amt,
          cc.name,
          cc.cmte_id,
          cm.cmte_nm,
          cm.cmte_tp
        FROM committee_candidate_contributions cc
        LEFT JOIN committee_master cm ON cc.cmte_id = cm.cmte_id
        WHERE cc.transaction_tp = $1
        AND cc.file_year = 2024
        LIMIT 3
      `;
      
      const sampleResult = await fecPool.query(sampleQuery, [row.transaction_tp]);
      
      console.log(`\n   Type ${row.transaction_tp} ($${row.total_amount?.toLocaleString() || 0}):`);
      sampleResult.rows.forEach((sample, i) => {
        console.log(`     ${i + 1}. $${sample.transaction_amt} - ${sample.cmte_nm || sample.name} (${sample.cmte_tp})`);
      });
    }

    // Check for independent expenditure indicators
    console.log('\n📊 Independent Expenditure Analysis:');
    const independentExpenditureQuery = `
      SELECT 
        transaction_tp,
        COUNT(*) as count,
        SUM(transaction_amt) as total_amount
      FROM committee_candidate_contributions
      WHERE file_year = 2024
      AND transaction_tp IN ('24K', '24A', '24N', '24R')
      GROUP BY transaction_tp
    `;
    
    const independentResult = await fecPool.query(independentExpenditureQuery);
    
    if (independentResult.rows.length > 0) {
      console.log('   Found potential independent expenditure transaction types:');
      independentResult.rows.forEach(row => {
        console.log(`     Type ${row.transaction_tp}: $${row.total_amount?.toLocaleString() || 0} (${row.count} transactions)`);
      });
    } else {
      console.log('   No independent expenditure transaction types found');
    }

    // Check for communication costs
    console.log('\n📊 Communication Costs Analysis:');
    const communicationCostsQuery = `
      SELECT 
        transaction_tp,
        COUNT(*) as count,
        SUM(transaction_amt) as total_amount
      FROM committee_candidate_contributions
      WHERE file_year = 2024
      AND transaction_tp IN ('22K', '22A', '22N', '22R')
      GROUP BY transaction_tp
    `;
    
    const communicationResult = await fecPool.query(communicationCostsQuery);
    
    if (communicationResult.rows.length > 0) {
      console.log('   Found potential communication cost transaction types:');
      communicationResult.rows.forEach(row => {
        console.log(`     Type ${row.transaction_tp}: $${row.total_amount?.toLocaleString() || 0} (${row.count} transactions)`);
      });
    } else {
      console.log('   No communication cost transaction types found');
    }

    console.log('\n✅ Committee contributions analysis completed!');
    
  } catch (error) {
    console.error('❌ Error analyzing committee contributions:', error);
  } finally {
    await fecPool.end();
  }
}

analyzeCommitteeContributions(); 