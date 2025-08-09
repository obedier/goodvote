const { Pool } = require('pg');

const fecConfig = {
  host: process.env.FEC_DB_HOST || 'localhost',
  port: parseInt(process.env.FEC_DB_PORT || '5432'),
  database: process.env.FEC_DB_NAME || 'fec_gold',
  user: process.env.FEC_DB_USER || 'osamabedier',
  password: process.env.FEC_DB_PASSWORD || '',
};

const fecPool = new Pool(fecConfig);

async function setupIsraelConfigTables() {
  try {
    console.log('🔧 Setting up Israel configuration tables...\n');

    // Create cfg_israel_committee_committee_relationship table
    console.log('📋 Creating cfg_israel_committee_committee_relationship table...');
    await fecPool.query(`
      CREATE TABLE IF NOT EXISTS cfg_israel_committee_committee_relationship (
        relationship_id SERIAL PRIMARY KEY,
        committee_id INTEGER NOT NULL REFERENCES cfg_israel_committee_ids(committee_id),
        related_committee_id VARCHAR(9) NOT NULL,
        relationship_type VARCHAR(50) NOT NULL,
        description TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ cfg_israel_committee_committee_relationship table created');

    // Create cfg_israel_keywords table (fixing typo in original name)
    console.log('📋 Creating cfg_israel_keywords table...');
    await fecPool.query(`
      CREATE TABLE IF NOT EXISTS cfg_israel_keywords (
        keyword_id SERIAL PRIMARY KEY,
        keyword VARCHAR(100) NOT NULL UNIQUE,
        category VARCHAR(50) NOT NULL,
        description TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ cfg_israel_keywords table created');

    // Create cfg_israel_transaction_type table
    console.log('📋 Creating cfg_israel_transaction_type table...');
    await fecPool.query(`
      CREATE TABLE IF NOT EXISTS cfg_israel_transaction_type (
        transaction_type_id SERIAL PRIMARY KEY,
        transaction_type_code VARCHAR(10) NOT NULL UNIQUE,
        transaction_type_name VARCHAR(100) NOT NULL,
        description TEXT,
        is_pro_israel BOOLEAN DEFAULT false,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ cfg_israel_transaction_type table created');

    // Insert sample data for keywords
    console.log('📝 Inserting sample keywords...');
    const keywords = [
      { keyword: 'AIPAC', category: 'organization', description: 'American Israel Public Affairs Committee' },
      { keyword: 'NORPAC', category: 'organization', description: 'National Organization for Political Action Committee' },
      { keyword: 'Pro-Israel', category: 'phrase', description: 'Pro-Israel advocacy' },
      { keyword: 'Jewish Coalition', category: 'phrase', description: 'Jewish political organizations' },
      { keyword: 'Israel PAC', category: 'phrase', description: 'Israel-focused Political Action Committees' },
      { keyword: 'ZOA', category: 'organization', description: 'Zionist Organization of America' },
      { keyword: 'United Democracy Project', category: 'organization', description: 'UDP SuperPAC' },
      { keyword: 'DMFI', category: 'organization', description: 'Democratic Majority for Israel' }
    ];

    for (const keyword of keywords) {
      await fecPool.query(`
        INSERT INTO cfg_israel_keywords (keyword, category, description)
        VALUES ($1, $2, $3)
        ON CONFLICT (keyword) DO NOTHING
      `, [keyword.keyword, keyword.category, keyword.description]);
    }
    console.log('✅ Sample keywords inserted');

    // Insert sample data for transaction types
    console.log('📝 Inserting sample transaction types...');
    const transactionTypes = [
      { code: '24A', name: 'Independent Expenditure Against', description: 'Independent expenditure against a candidate', is_pro_israel: false },
      { code: '24E', name: 'Independent Expenditure For', description: 'Independent expenditure for a candidate', is_pro_israel: true },
      { code: '24C', name: 'Coordinated Expenditure', description: 'Coordinated party expenditure', is_pro_israel: true },
      { code: '24N', name: 'Independent Expenditure Against (Non-Contribution)', description: 'Independent expenditure against (non-contribution)', is_pro_israel: false },
      { code: '24K', name: 'Independent Expenditure For (Non-Contribution)', description: 'Independent expenditure for (non-contribution)', is_pro_israel: true }
    ];

    for (const type of transactionTypes) {
      await fecPool.query(`
        INSERT INTO cfg_israel_transaction_type (transaction_type_code, transaction_type_name, description, is_pro_israel)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (transaction_type_code) DO NOTHING
      `, [type.code, type.name, type.description, type.is_pro_israel]);
    }
    console.log('✅ Sample transaction types inserted');

    // Insert sample committee relationships
    console.log('📝 Inserting sample committee relationships...');
    const relationships = [
      { committee_id: 1, related_committee_id: 'C00797670', relationship_type: 'parent', description: 'AIPAC main committee' },
      { committee_id: 2, related_committee_id: 'C00710848', relationship_type: 'parent', description: 'DMFI main committee' },
      { committee_id: 3, related_committee_id: 'C00799031', relationship_type: 'parent', description: 'UDP main committee' }
    ];

    for (const rel of relationships) {
      await fecPool.query(`
        INSERT INTO cfg_israel_committee_committee_relationship (committee_id, related_committee_id, relationship_type, description)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT DO NOTHING
      `, [rel.committee_id, rel.related_committee_id, rel.relationship_type, rel.description]);
    }
    console.log('✅ Sample committee relationships inserted');

    console.log('\n🎉 All Israel configuration tables set up successfully!');

  } catch (error) {
    console.error('Error setting up Israel config tables:', error);
  } finally {
    await fecPool.end();
  }
}

setupIsraelConfigTables();
