const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.FEC_DB_USER,
  host: process.env.FEC_DB_HOST,
  database: process.env.FEC_DB_NAME,
  password: process.env.FEC_DB_PASSWORD,
  port: process.env.FEC_DB_PORT,
});

async function testSchema() {
  try {
    // Test the current table structure
    const result = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'cfg_israel_committee_ids' 
      ORDER BY ordinal_position
    `);
    
    console.log('Current columns in cfg_israel_committee_ids:');
    result.rows.forEach(row => {
      console.log(`- ${row.column_name}: ${row.data_type}`);
    });
    
    // Test a simple select
    const testQuery = await pool.query('SELECT * FROM cfg_israel_committee_ids LIMIT 1');
    console.log('\nSample row:');
    console.log(testQuery.rows[0]);
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

testSchema();
