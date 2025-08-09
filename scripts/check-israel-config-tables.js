const { Pool } = require('pg');

const fecConfig = {
  host: process.env.FEC_DB_HOST || 'localhost',
  port: parseInt(process.env.FEC_DB_PORT || '5432'),
  database: process.env.FEC_DB_NAME || 'fec_gold',
  user: process.env.FEC_DB_USER || 'osamabedier',
  password: process.env.FEC_DB_PASSWORD || '',
};

const fecPool = new Pool(fecConfig);

async function checkIsraelConfigTables() {
  try {
    console.log('🔍 Checking Israel configuration tables...\n');

    // Check if tables exist and get their structure
    const tables = [
      'cfg_israel_committee_ids',
      'cfg_israel_committee_committee_replationship',
      'cfg_israel_keyworkds',
      'cfg_israel_transaction_type'
    ];

    for (const tableName of tables) {
      console.log(`📋 Table: ${tableName}`);
      
      try {
        // Check if table exists
        const existsQuery = `
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = $1
          );
        `;
        
        const existsResult = await fecPool.query(existsQuery, [tableName]);
        
        if (existsResult.rows[0].exists) {
          console.log(`✅ Table exists`);
          
          // Get table structure
          const structureQuery = `
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_name = $1 
            ORDER BY ordinal_position;
          `;
          
          const structureResult = await fecPool.query(structureQuery, [tableName]);
          
          console.log('📊 Structure:');
          structureResult.rows.forEach(col => {
            console.log(`  - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'YES' ? '(nullable)' : '(not null)'} ${col.column_default ? `default: ${col.column_default}` : ''}`);
          });
          
          // Get row count
          const countQuery = `SELECT COUNT(*) as count FROM ${tableName}`;
          const countResult = await fecPool.query(countQuery);
          console.log(`📈 Row count: ${countResult.rows[0].count}`);
          
          // Show sample data
          const sampleQuery = `SELECT * FROM ${tableName} LIMIT 3`;
          const sampleResult = await fecPool.query(sampleQuery);
          
          if (sampleResult.rows.length > 0) {
            console.log('📝 Sample data:');
            sampleResult.rows.forEach((row, index) => {
              console.log(`  Row ${index + 1}:`, row);
            });
          }
          
        } else {
          console.log(`❌ Table does not exist`);
        }
        
      } catch (error) {
        console.log(`❌ Error checking table: ${error.message}`);
      }
      
      console.log(''); // Empty line for readability
    }

  } catch (error) {
    console.error('Error checking Israel config tables:', error);
  } finally {
    await fecPool.end();
  }
}

checkIsraelConfigTables();
