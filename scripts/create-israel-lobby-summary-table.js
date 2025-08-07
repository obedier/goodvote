const { Pool } = require('pg');

// Pro-Israel PAC identifiers
const PRO_ISRAEL_PACS = [
  'C00797670', // AIPAC PAC
  'C00247403', // NORPAC
  'C00741792', // Pro-Israel America PAC
  'C00142299', // Republican Jewish Coalition PAC
  'C00127811', // U.S. Israel PAC (USI PAC)
  'C00799031', // United Democracy Project (UDP) - pro-Israel SuperPAC
];

// Pro-Israel committee names/keywords for identification
const PRO_ISRAEL_KEYWORDS = [
  'AIPAC',
  'NORPAC',
  'Pro-Israel America',
  'Republican Jewish Coalition',
  'U.S. Israel PAC',
  'USI PAC',
  'JACPAC',
  'ZOA',
  'Zionist Organization of America',
  'Israel PAC',
  'Jewish PAC',
  'American Israel',
  'Israel America',
  'United Democracy Project',
  'UDP'
];

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'fec_gold',
  user: 'osamabedier',
  password: '',
});

async function createIsraelLobbySummaryTable() {
  const client = await pool.connect();
  
  try {
    console.log('Creating Israel lobby summary table...');
    
    // Create the summary table
    await client.query(`
      CREATE TABLE IF NOT EXISTS israel_lobby_summary (
        person_id VARCHAR(20) PRIMARY KEY,
        humanity_score INTEGER NOT NULL,
        total_pro_israel_contributions NUMERIC NOT NULL DEFAULT 0,
        lobby_grade CHAR(1) NOT NULL,
        lobby_category VARCHAR(20) NOT NULL,
        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    console.log('Table created successfully');
    
    // Get all unique person IDs
    const personIdsResult = await client.query(`
      SELECT DISTINCT person_id 
      FROM person_candidates 
      WHERE person_id IS NOT NULL
    `);
    
    console.log(`Found ${personIdsResult.rows.length} unique persons`);
    
    let processed = 0;
    let errors = 0;
    
    for (const row of personIdsResult.rows) {
      const personId = row.person_id;
      
      try {
        // Get historical Israel lobby data
        const historicalResult = await client.query(`
          SELECT DISTINCT cc.file_year, 
                 SUM(CAST(cc.transaction_amt AS NUMERIC)) as total_amount
          FROM committee_candidate_contributions cc
          JOIN committee_master cm ON cc.cmte_id = cm.cmte_id
          JOIN person_candidates pc ON cc.cand_id = pc.cand_id
          WHERE pc.person_id = $1
          AND cc.transaction_amt > 0
          AND cc.transaction_tp IN ('24A', '24E', '24C', '24N', '24K')
          AND (
            cc.cmte_id = ANY($2) OR
            (cm.cmte_nm ILIKE '%AIPAC%' OR cm.cmte_nm ILIKE '%NORPAC%' OR cm.cmte_nm ILIKE '%Pro-Israel America%' OR cm.cmte_nm ILIKE '%Republican Jewish Coalition%' OR cm.cmte_nm ILIKE '%U.S. Israel PAC%' OR cm.cmte_nm ILIKE '%USI PAC%' OR cm.cmte_nm ILIKE '%JACPAC%' OR cm.cmte_nm ILIKE '%ZOA%' OR cm.cmte_nm ILIKE '%Zionist Organization of America%' OR cm.cmte_nm ILIKE '%Israel PAC%' OR cm.cmte_nm ILIKE '%Jewish PAC%' OR cm.cmte_nm ILIKE '%American Israel%' OR cm.cmte_nm ILIKE '%Israel America%' OR cm.cmte_nm ILIKE '%United Democracy Project%' OR cm.cmte_nm ILIKE '%UDP%')
          )
          GROUP BY cc.file_year
          ORDER BY cc.file_year DESC
        `, [personId, PRO_ISRAEL_PACS]);
        
        const historicalData = historicalResult.rows;
        const hasEverReceivedFunding = historicalData.length > 0;
        const electionYearsWithFunding = historicalData.map(row => row.file_year);
        const mostRecentElectionYear = electionYearsWithFunding.length > 0 ? Math.max(...electionYearsWithFunding) : 0;
        
        // Calculate humanity score
        let humanityScore = 5; // Default to best score
        
        if (hasEverReceivedFunding) {
          // Rule 1: If candidate has ever received funding from Israel, score is at most 4
          humanityScore = Math.min(humanityScore, 4);
          
          // For simplicity, we'll use a basic scoring system
          // In a full implementation, you'd check election wins
          if (electionYearsWithFunding.length > 1) {
            humanityScore = Math.min(humanityScore, 2);
          }
          
          // Rule 5: If candidate has received funding in the most recent election cycle they are a 0
          if (mostRecentElectionYear > 0) {
            humanityScore = 0;
          }
        }
        
        // Get total pro-Israel contributions
        const totalResult = await client.query(`
          SELECT COALESCE(SUM(CAST(ABS(cc.transaction_amt) AS NUMERIC)), 0) as total_pro_israel_contributions
          FROM committee_candidate_contributions cc
          JOIN committee_master cm ON cc.cmte_id = cm.cmte_id
          JOIN person_candidates pc ON cc.cand_id = pc.cand_id
          WHERE pc.person_id = $1
          AND cc.transaction_amt != 0
          AND cc.transaction_tp IN ('24A', '24E', '24C', '24N', '24K')
          AND (
            cc.cmte_id = ANY($2) OR
            (cm.cmte_nm ILIKE '%AIPAC%' OR cm.cmte_nm ILIKE '%NORPAC%' OR cm.cmte_nm ILIKE '%Pro-Israel America%' OR cm.cmte_nm ILIKE '%Republican Jewish Coalition%' OR cm.cmte_nm ILIKE '%U.S. Israel PAC%' OR cm.cmte_nm ILIKE '%USI PAC%' OR cm.cmte_nm ILIKE '%JACPAC%' OR cm.cmte_nm ILIKE '%ZOA%' OR cm.cmte_nm ILIKE '%Zionist Organization of America%' OR cm.cmte_nm ILIKE '%Israel PAC%' OR cm.cmte_nm ILIKE '%Jewish PAC%' OR cm.cmte_nm ILIKE '%American Israel%' OR cm.cmte_nm ILIKE '%Israel America%' OR cm.cmte_nm ILIKE '%United Democracy Project%' OR cm.cmte_nm ILIKE '%UDP%')
          )
        `, [personId, PRO_ISRAEL_PACS]);
        
        const totalProIsraelAmount = parseFloat(totalResult.rows[0]?.total_pro_israel_contributions || 0);
        
        // Calculate lobby grade and category
        let lobbyGrade = 'F';
        let lobbyCategory = 'No Support';
        
        if (totalProIsraelAmount >= 10000000) { // $10M+
          lobbyGrade = 'A';
          lobbyCategory = 'High Support';
        } else if (totalProIsraelAmount >= 1000000) { // $1M+
          lobbyGrade = 'B';
          lobbyCategory = 'Moderate Support';
        } else if (totalProIsraelAmount >= 100000) { // $100K+
          lobbyGrade = 'C';
          lobbyCategory = 'Low Support';
        } else if (totalProIsraelAmount > 0) {
          lobbyGrade = 'D';
          lobbyCategory = 'Low Support';
        }
        
        // Insert or update the summary data
        await client.query(`
          INSERT INTO israel_lobby_summary (person_id, humanity_score, total_pro_israel_contributions, lobby_grade, lobby_category)
          VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT (person_id) 
          DO UPDATE SET 
            humanity_score = EXCLUDED.humanity_score,
            total_pro_israel_contributions = EXCLUDED.total_pro_israel_contributions,
            lobby_grade = EXCLUDED.lobby_grade,
            lobby_category = EXCLUDED.lobby_category,
            last_updated = CURRENT_TIMESTAMP
        `, [personId, humanityScore, totalProIsraelAmount, lobbyGrade, lobbyCategory]);
        
        processed++;
        if (processed % 100 === 0) {
          console.log(`Processed ${processed} persons...`);
        }
        
      } catch (error) {
        console.error(`Error processing person ${personId}:`, error.message);
        errors++;
      }
    }
    
    console.log(`\nSummary table creation complete!`);
    console.log(`Processed: ${processed} persons`);
    console.log(`Errors: ${errors} persons`);
    
    // Show some sample data
    const sampleResult = await client.query(`
      SELECT * FROM israel_lobby_summary 
      WHERE total_pro_israel_contributions > 0 
      ORDER BY total_pro_israel_contributions DESC 
      LIMIT 5
    `);
    
    console.log('\nTop 5 by pro-Israel contributions:');
    sampleResult.rows.forEach(row => {
      console.log(`${row.person_id}: $${row.total_pro_israel_contributions.toLocaleString()} (Score: ${row.humanity_score}, Grade: ${row.lobby_grade})`);
    });
    
  } catch (error) {
    console.error('Error creating summary table:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

createIsraelLobbySummaryTable(); 