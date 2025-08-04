#!/usr/bin/env node

const { Pool } = require('pg');
require('dotenv').config();

const fecConfig = {
  host: process.env.FEC_DB_HOST || 'localhost',
  port: parseInt(process.env.FEC_DB_PORT || '5432'),
  database: process.env.FEC_DB_NAME || 'fec_gold',
  user: process.env.FEC_DB_USER || 'osamabedier',
  password: process.env.FEC_DB_PASSWORD || '',
};

const pool = new Pool(fecConfig);

async function addPerformanceIndexes() {
  try {
    console.log('🔧 Adding Performance Indexes...\n');
    
    const indexes = [
      // State data API indexes
      {
        name: 'idx_individual_contributions_state_year',
        query: `CREATE INDEX IF NOT EXISTS idx_individual_contributions_state_year 
                ON individual_contributions(state, file_year)`
      },
      {
        name: 'idx_individual_contributions_state_year_amount',
        query: `CREATE INDEX IF NOT EXISTS idx_individual_contributions_state_year_amount 
                ON individual_contributions(state, file_year, transaction_amt DESC)`
      },
      {
        name: 'idx_individual_contributions_cmte_id',
        query: `CREATE INDEX IF NOT EXISTS idx_individual_contributions_cmte_id 
                ON individual_contributions(cmte_id)`
      },
      {
        name: 'idx_individual_contributions_name',
        query: `CREATE INDEX IF NOT EXISTS idx_individual_contributions_name 
                ON individual_contributions(name)`
      },
      {
        name: 'idx_individual_contributions_city',
        query: `CREATE INDEX IF NOT EXISTS idx_individual_contributions_city 
                ON individual_contributions(city)`
      },
      
      // Committee master indexes
      {
        name: 'idx_committee_master_cmte_id',
        query: `CREATE INDEX IF NOT EXISTS idx_committee_master_cmte_id 
                ON committee_master(cmte_id)`
      },
      {
        name: 'idx_committee_master_cmte_nm',
        query: `CREATE INDEX IF NOT EXISTS idx_committee_master_cmte_nm 
                ON committee_master(cmte_nm)`
      },
      
      // Operating expenditures indexes
      {
        name: 'idx_operating_expenditures_cmte_id',
        query: `CREATE INDEX IF NOT EXISTS idx_operating_expenditures_cmte_id 
                ON operating_expenditures(cmte_id)`
      },
      {
        name: 'idx_operating_expenditures_name',
        query: `CREATE INDEX IF NOT EXISTS idx_operating_expenditures_name 
                ON operating_expenditures(name)`
      },
      {
        name: 'idx_operating_expenditures_state',
        query: `CREATE INDEX IF NOT EXISTS idx_operating_expenditures_state 
                ON operating_expenditures(state)`
      },
      
      // Search optimization indexes
      {
        name: 'idx_committee_master_search',
        query: `CREATE INDEX IF NOT EXISTS idx_committee_master_search 
                ON committee_master USING gin(to_tsvector('english', cmte_nm))`
      },
      {
        name: 'idx_individual_contributions_search',
        query: `CREATE INDEX IF NOT EXISTS idx_individual_contributions_search 
                ON individual_contributions USING gin(to_tsvector('english', name))`
      }
    ];
    
    for (const index of indexes) {
      try {
        console.log(`📋 Creating index: ${index.name}`);
        await pool.query(index.query);
        console.log(`✅ Successfully created: ${index.name}`);
      } catch (error) {
        if (error.message.includes('already exists')) {
          console.log(`ℹ️  Index already exists: ${index.name}`);
        } else {
          console.log(`❌ Failed to create ${index.name}: ${error.message}`);
        }
      }
    }
    
    // Create a materialized view for state summaries
    console.log('\n📋 Creating state summary materialized view...');
    try {
      await pool.query(`
        CREATE MATERIALIZED VIEW IF NOT EXISTS state_contributions_summary AS
        SELECT 
          state,
          file_year,
          COUNT(*) as contribution_count,
          SUM(transaction_amt) as total_amount,
          COUNT(DISTINCT cmte_id) as unique_committees,
          COUNT(DISTINCT name) as unique_contributors,
          AVG(transaction_amt) as avg_amount
        FROM individual_contributions 
        WHERE state IS NOT NULL AND file_year IS NOT NULL
        GROUP BY state, file_year
        ORDER BY state, file_year DESC
      `);
      console.log('✅ Successfully created state_contributions_summary view');
    } catch (error) {
      console.log(`ℹ️  State summary view already exists or failed: ${error.message}`);
    }
    
    console.log('\n🎉 Performance indexes added successfully!');
    
  } catch (error) {
    console.error('❌ Failed to add indexes:', error.message);
  } finally {
    await pool.end();
  }
}

addPerformanceIndexes(); 