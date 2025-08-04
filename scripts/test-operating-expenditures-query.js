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

async function testOperatingExpendituresQuery() {
  try {
    console.log('🔍 Testing Operating Expenditures Query for Rashida Tlaib\n');
    console.log('================================================================================');

    const candId = 'H8MI13250';
    const electionYear = 2024;

    // Test the exact query from the candidates.ts file
    const outsideSpendingQuery = `
      SELECT 
        -- Total operating expenditures (this is the main outside spending)
        COALESCE(SUM(oe.transaction_amt), 0) as total_operating_expenditures,
        COUNT(oe.transaction_amt) as operating_expenditure_count,
        COUNT(DISTINCT oe.cmte_id) as unique_committees,
        
        -- Categorize by purpose for breakdown
        COALESCE(SUM(CASE WHEN LOWER(oe.purpose) LIKE '%tv%' OR LOWER(oe.purpose) LIKE '%radio%' OR LOWER(oe.purpose) LIKE '%advertising%' THEN oe.transaction_amt ELSE 0 END), 0) as media_advertising,
        COALESCE(SUM(CASE WHEN LOWER(oe.purpose) LIKE '%digital%' OR LOWER(oe.purpose) LIKE '%online%' THEN oe.transaction_amt ELSE 0 END), 0) as digital_advertising,
        COALESCE(SUM(CASE WHEN LOWER(oe.purpose) LIKE '%polling%' OR LOWER(oe.purpose) LIKE '%survey%' THEN oe.transaction_amt ELSE 0 END), 0) as polling_research,
        COALESCE(SUM(CASE WHEN LOWER(oe.purpose) LIKE '%printing%' OR LOWER(oe.purpose) LIKE '%production%' THEN oe.transaction_amt ELSE 0 END), 0) as printing_production,
        COALESCE(SUM(CASE WHEN LOWER(oe.purpose) LIKE '%consulting%' OR LOWER(oe.purpose) LIKE '%fundraising%' THEN oe.transaction_amt ELSE 0 END), 0) as consulting_services,
        COALESCE(SUM(CASE WHEN LOWER(oe.purpose) LIKE '%payroll%' OR LOWER(oe.purpose) LIKE '%salary%' THEN oe.transaction_amt ELSE 0 END), 0) as staff_payroll,
        
        -- Also get committee_candidate_contributions for comparison
        COALESCE(SUM(ccc.transaction_amt), 0) as committee_contributions,
        COUNT(ccc.transaction_amt) as committee_contribution_count
      FROM candidate_committee_linkages ccl
      LEFT JOIN operating_expenditures oe ON ccl.cmte_id = oe.cmte_id AND oe.file_year = $2
      LEFT JOIN committee_candidate_contributions ccc ON ccl.cmte_id = ccc.cmte_id AND ccc.file_year = $2 AND ccc.cand_id = $1
      WHERE ccl.cand_id = $1 AND ccl.cand_election_yr = $2
    `;
    
    const result = await fecCompletePool.query(outsideSpendingQuery, [candId, electionYear]);
    console.log('📊 Query Result:');
    if (result.rows.length > 0) {
      const row = result.rows[0];
      console.log(`   Total Operating Expenditures: $${parseFloat(row.total_operating_expenditures).toLocaleString()}`);
      console.log(`   Operating Expenditure Count: ${row.operating_expenditure_count}`);
      console.log(`   Unique Committees: ${row.unique_committees}`);
      console.log(`   Media Advertising: $${parseFloat(row.media_advertising).toLocaleString()}`);
      console.log(`   Digital Advertising: $${parseFloat(row.digital_advertising).toLocaleString()}`);
      console.log(`   Polling Research: $${parseFloat(row.polling_research).toLocaleString()}`);
      console.log(`   Printing Production: $${parseFloat(row.printing_production).toLocaleString()}`);
      console.log(`   Consulting Services: $${parseFloat(row.consulting_services).toLocaleString()}`);
      console.log(`   Staff Payroll: $${parseFloat(row.staff_payroll).toLocaleString()}`);
      console.log(`   Committee Contributions: $${parseFloat(row.committee_contributions).toLocaleString()}`);
      console.log(`   Committee Contribution Count: ${row.committee_contribution_count}`);
    } else {
      console.log('   ❌ No results found');
    }

    // Test individual parts of the query
    console.log('\n📊 Testing Individual Query Parts:');
    
    // Test candidate_committee_linkages
    const cclQuery = `
      SELECT * FROM candidate_committee_linkages 
      WHERE cand_id = $1 AND cand_election_yr = $2
    `;
    const cclResult = await fecCompletePool.query(cclQuery, [candId, electionYear]);
    console.log(`   Candidate Committee Linkages: ${cclResult.rows.length} records`);
    cclResult.rows.forEach((row, index) => {
      console.log(`     ${index + 1}. Committee: ${row.cmte_id}, Election Year: ${row.cand_election_yr}`);
    });

    // Test operating_expenditures directly
    const oeQuery = `
      SELECT COUNT(*) as count, SUM(transaction_amt) as total
      FROM operating_expenditures 
      WHERE cmte_id = 'C00668608' AND file_year = $1
    `;
    const oeResult = await fecCompletePool.query(oeQuery, [electionYear]);
    console.log(`   Operating Expenditures for C00668608: ${oeResult.rows[0].count} records, $${parseFloat(oeResult.rows[0].total).toLocaleString()}`);

    console.log('\n✅ Operating expenditures query test completed!');
    
  } catch (error) {
    console.error('❌ Error testing operating expenditures query:', error);
  } finally {
    await fecCompletePool.end();
  }
}

testOperatingExpendituresQuery(); 