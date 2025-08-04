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

async function addCandidateIndexes() {
  try {
    console.log('🔧 Adding Candidate-Specific Performance Indexes...\n');
    
    const indexes = [
      // Person candidates indexes for fast candidate lookup
      {
        name: 'idx_person_candidates_person_id',
        query: `CREATE INDEX IF NOT EXISTS idx_person_candidates_person_id 
                ON person_candidates(person_id)`
      },
      {
        name: 'idx_person_candidates_person_id_year',
        query: `CREATE INDEX IF NOT EXISTS idx_person_candidates_person_id_year 
                ON person_candidates(person_id, election_year DESC)`
      },
      {
        name: 'idx_person_candidates_cand_id',
        query: `CREATE INDEX IF NOT EXISTS idx_person_candidates_cand_id 
                ON person_candidates(cand_id)`
      },
      
      // Candidate summary indexes for campaign finance
      {
        name: 'idx_candidate_summary_cand_id_year',
        query: `CREATE INDEX IF NOT EXISTS idx_candidate_summary_cand_id_year 
                ON candidate_summary(cand_id, file_year)`
      },
      {
        name: 'idx_candidate_summary_file_year',
        query: `CREATE INDEX IF NOT EXISTS idx_candidate_summary_file_year 
                ON candidate_summary(file_year)`
      },
      
      // Individual contributions indexes for candidate queries
      {
        name: 'idx_individual_contributions_cmte_id_year',
        query: `CREATE INDEX IF NOT EXISTS idx_individual_contributions_cmte_id_year 
                ON individual_contributions(cmte_id, file_year)`
      },
      {
        name: 'idx_individual_contributions_name_amount',
        query: `CREATE INDEX IF NOT EXISTS idx_individual_contributions_name_amount 
                ON individual_contributions(name, transaction_amt DESC)`
      },
      
      // Committee candidate linkages indexes
      {
        name: 'idx_candidate_committee_linkages_cand_id',
        query: `CREATE INDEX IF NOT EXISTS idx_candidate_committee_linkages_cand_id 
                ON candidate_committee_linkages(cand_id)`
      },
      {
        name: 'idx_candidate_committee_linkages_cand_id_year',
        query: `CREATE INDEX IF NOT EXISTS idx_candidate_committee_linkages_cand_id_year 
                ON candidate_committee_linkages(cand_id, cand_election_yr)`
      },
      {
        name: 'idx_candidate_committee_linkages_cmte_id',
        query: `CREATE INDEX IF NOT EXISTS idx_candidate_committee_linkages_cmte_id 
                ON candidate_committee_linkages(cmte_id)`
      },
      
      // Committee candidate contributions indexes
      {
        name: 'idx_committee_candidate_contributions_cand_id',
        query: `CREATE INDEX IF NOT EXISTS idx_committee_candidate_contributions_cand_id 
                ON committee_candidate_contributions(cand_id)`
      },
      {
        name: 'idx_committee_candidate_contributions_cand_id_year',
        query: `CREATE INDEX IF NOT EXISTS idx_committee_candidate_contributions_cand_id_year 
                ON committee_candidate_contributions(cand_id, file_year)`
      },
      {
        name: 'idx_committee_candidate_contributions_amount',
        query: `CREATE INDEX IF NOT EXISTS idx_committee_candidate_contributions_amount 
                ON committee_candidate_contributions(transaction_amt DESC)`
      },
      
      // Operating expenditures indexes for outside spending
      {
        name: 'idx_operating_expenditures_cmte_id_year',
        query: `CREATE INDEX IF NOT EXISTS idx_operating_expenditures_cmte_id_year 
                ON operating_expenditures(cmte_id, file_year)`
      },
      {
        name: 'idx_operating_expenditures_purpose',
        query: `CREATE INDEX IF NOT EXISTS idx_operating_expenditures_purpose 
                ON operating_expenditures USING gin(to_tsvector('english', purpose))`
      },
      
      // House senate current campaigns indexes
      {
        name: 'idx_house_senate_current_campaigns_cand_id',
        query: `CREATE INDEX IF NOT EXISTS idx_house_senate_current_campaigns_cand_id 
                ON house_senate_current_campaigns(cand_id)`
      },
      {
        name: 'idx_house_senate_current_campaigns_name',
        query: `CREATE INDEX IF NOT EXISTS idx_house_senate_current_campaigns_name 
                ON house_senate_current_campaigns(cand_name)`
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
    
    // Create materialized views for common candidate queries
    console.log('\n📋 Creating candidate summary materialized views...');
    
    try {
      await pool.query(`
        CREATE MATERIALIZED VIEW IF NOT EXISTS candidate_campaign_summary AS
        SELECT 
          pc.person_id,
          pc.cand_id,
          pc.election_year,
          pc.display_name,
          pc.state,
          pc.current_office,
          pc.current_district,
          pc.current_party,
          cs.ttl_receipts,
          cs.ttl_indiv_contrib,
          cs.other_pol_cmte_contrib,
          cs.pol_pty_contrib,
          cs.trans_from_auth,
          cs.ttl_disb,
          cs.cand_contrib,
          cs.cand_loans,
          cs.other_loans,
          cs.debts_owed_by
        FROM person_candidates pc
        LEFT JOIN candidate_summary cs ON pc.cand_id = cs.cand_id AND pc.election_year = cs.file_year
        WHERE pc.election_year >= 2018
        ORDER BY pc.person_id, pc.election_year DESC
      `);
      console.log('✅ Successfully created candidate_campaign_summary view');
    } catch (error) {
      console.log(`ℹ️  Candidate campaign summary view already exists or failed: ${error.message}`);
    }
    
    try {
      await pool.query(`
        CREATE MATERIALIZED VIEW IF NOT EXISTS candidate_contributor_summary AS
        SELECT 
          pc.person_id,
          pc.cand_id,
          pc.election_year,
          ic.name,
          ic.city,
          ic.state,
          ic.employer,
          ic.occupation,
          SUM(ic.transaction_amt) as total_amount,
          COUNT(*) as contribution_count
        FROM person_candidates pc
        JOIN candidate_committee_linkages ccl ON pc.cand_id = ccl.cand_id AND pc.election_year = ccl.cand_election_yr
        JOIN individual_contributions ic ON ccl.cmte_id = ic.cmte_id AND ic.file_year = pc.election_year
        WHERE ic.transaction_amt > 0
        GROUP BY pc.person_id, pc.cand_id, pc.election_year, ic.name, ic.city, ic.state, ic.employer, ic.occupation
        ORDER BY pc.person_id, pc.election_year DESC, total_amount DESC
      `);
      console.log('✅ Successfully created candidate_contributor_summary view');
    } catch (error) {
      console.log(`ℹ️  Candidate contributor summary view already exists or failed: ${error.message}`);
    }
    
    console.log('\n🎉 Candidate performance indexes added successfully!');
    
  } catch (error) {
    console.error('❌ Failed to add candidate indexes:', error.message);
  } finally {
    await pool.end();
  }
}

addCandidateIndexes(); 