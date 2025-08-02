const { Pool } = require('pg');

// Database configurations
const goodvoteConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'goodvote',
  user: process.env.DB_USER || 'osamabedier',
  password: process.env.DB_PASSWORD || '',
  max: 3,
  min: 0,
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 3000,
  acquireTimeoutMillis: 3000,
};

const goodvotePool = new Pool(goodvoteConfig);

async function executeQuery(pool, query, params = []) {
  let client = null;
  try {
    client = await pool.connect();
    const result = await client.query(query, params);
    return { success: true, data: result.rows };
  } catch (error) {
    console.error('Query error:', error.message);
    return { success: false, error: error.message };
  } finally {
    if (client) client.release();
  }
}

async function testAPIWithServer() {
  console.log('🔍 Testing API with Development Server\n');
  console.log('=' .repeat(100));
  
  // Get some test candidates from the database
  const candidatesQuery = `
    SELECT 
      p.person_id,
      p.display_name,
      p.state,
      p.current_office,
      p.current_party
    FROM persons p
    JOIN person_candidates pc ON p.person_id = pc.person_id
    WHERE pc.election_year = 2024
    AND p.current_office IN ('H', 'S')
    LIMIT 5
  `;
  
  const candidatesResult = await executeQuery(goodvotePool, candidatesQuery);
  
  if (!candidatesResult.success || !candidatesResult.data) {
    console.log('❌ Failed to get test candidates from database');
    return;
  }
  
  const testCandidates = candidatesResult.data;
  console.log(`📊 Found ${testCandidates.length} test candidates`);
  
  for (const candidate of testCandidates) {
    console.log(`\n📊 Testing API for ${candidate.display_name} (${candidate.person_id})`);
    console.log(`   State: ${candidate.state}, Office: ${candidate.current_office}, Party: ${candidate.current_party}`);
    
    // Test the API endpoint
    const apiUrl = `http://localhost:3000/api/politicians/${candidate.person_id}`;
    
    try {
      const response = await fetch(apiUrl);
      
      if (!response.ok) {
        console.log(`   ❌ API Request Failed: ${response.status} ${response.statusText}`);
        continue;
      }
      
      const apiData = await response.json();
      
      if (apiData.success && apiData.data) {
        const data = apiData.data;
        console.log(`   ✅ API Response Success`);
        
        // Verify key campaign finance data
        const receipts = data.campaign_finance?.total_receipts || 0;
        const individualContributions = data.campaign_finance?.total_individual_contributions || 0;
        const pacContributions = data.campaign_finance?.total_pac_contributions || 0;
        const outsideSpending = data.campaign_finance?.total_outside_spending || 0;
        const selfFinancing = data.campaign_finance?.self_financing_percentage || 0;
        const debtRatio = data.campaign_finance?.debt_to_receipts_ratio || 0;
        
        console.log(`   📊 Campaign Finance Summary:`);
        console.log(`      Total Receipts: $${receipts.toLocaleString()}`);
        console.log(`      Individual Contributions: $${individualContributions.toLocaleString()}`);
        console.log(`      PAC Contributions: $${pacContributions.toLocaleString()}`);
        console.log(`      Outside Spending: $${outsideSpending.toLocaleString()}`);
        console.log(`      Self-Financing: ${selfFinancing.toFixed(1)}%`);
        console.log(`      Debt Ratio: ${debtRatio.toFixed(1)}%`);
        
        // Check confidence levels
        const confidence = data.campaign_finance?.outside_spending_confidence;
        if (confidence) {
          console.log(`   📊 Confidence Levels:`);
          console.log(`      Bundled Contributions: ${confidence.bundled_contributions || 'LOW'}`);
          console.log(`      Independent Expenditures: ${confidence.independent_expenditures || 'LOW'}`);
          console.log(`      Communication Costs: ${confidence.communication_costs || 'LOW'}`);
          console.log(`      Soft Money: ${confidence.soft_money || 'LOW'}`);
        }
        
        // Data quality assessment
        console.log(`   🔍 Data Quality:`);
        if (receipts > 0) {
          console.log(`      ✅ Receipts data available`);
        } else {
          console.log(`      ⚠️  No receipts data`);
        }
        
        if (individualContributions > 0) {
          console.log(`      ✅ Individual contributions data available`);
        } else {
          console.log(`      ⚠️  No individual contributions data`);
        }
        
        if (outsideSpending > 0) {
          console.log(`      ✅ Outside spending estimates available`);
        } else {
          console.log(`      ⚠️  No outside spending data (expected for most candidates)`);
        }
        
      } else {
        console.log(`   ❌ API Response Failed:`, apiData.error || 'Unknown error');
      }
      
    } catch (error) {
      console.log(`   ❌ API Request Error:`, error.message);
      console.log(`   💡 Make sure the development server is running: npm run dev`);
    }
  }
  
  // Test a specific known candidate (Rashida Tlaib)
  console.log(`\n📊 Testing Known Candidate (Rashida Tlaib):`);
  const rashidaPersonId = 'P259F2D0E';
  const rashidaApiUrl = `http://localhost:3000/api/politicians/${rashidaPersonId}`;
  
  try {
    const response = await fetch(rashidaApiUrl);
    
    if (response.ok) {
      const apiData = await response.json();
      
      if (apiData.success && apiData.data) {
        const data = apiData.data;
        console.log(`   ✅ Rashida Tlaib API Success`);
        
        const receipts = data.campaign_finance?.total_receipts || 0;
        const individualContributions = data.campaign_finance?.total_individual_contributions || 0;
        const pacContributions = data.campaign_finance?.total_pac_contributions || 0;
        const outsideSpending = data.campaign_finance?.total_outside_spending || 0;
        
        console.log(`   📊 Rashida Tlaib Campaign Finance:`);
        console.log(`      Total Receipts: $${receipts.toLocaleString()}`);
        console.log(`      Individual Contributions: $${individualContributions.toLocaleString()}`);
        console.log(`      PAC Contributions: $${pacContributions.toLocaleString()}`);
        console.log(`      Outside Spending: $${outsideSpending.toLocaleString()}`);
        
        // Verify against expected values
        const expectedReceipts = 8473097.48;
        const expectedIndividual = 8097297.14;
        const expectedPAC = 121899;
        
        if (Math.abs(receipts - expectedReceipts) < 1000) {
          console.log(`      ✅ Receipts match expected value`);
        } else {
          console.log(`      ⚠️  Receipts differ from expected value`);
        }
        
        if (Math.abs(individualContributions - expectedIndividual) < 1000) {
          console.log(`      ✅ Individual contributions match expected value`);
        } else {
          console.log(`      ⚠️  Individual contributions differ from expected value`);
        }
        
        if (Math.abs(pacContributions - expectedPAC) < 1000) {
          console.log(`      ✅ PAC contributions match expected value`);
        } else {
          console.log(`      ⚠️  PAC contributions differ from expected value`);
        }
        
      } else {
        console.log(`   ❌ Rashida Tlaib API Failed:`, apiData.error || 'Unknown error');
      }
    } else {
      console.log(`   ❌ Rashida Tlaib API Request Failed: ${response.status} ${response.statusText}`);
    }
    
  } catch (error) {
    console.log(`   ❌ Rashida Tlaib API Error:`, error.message);
  }
  
  // Close database connection
  await goodvotePool.end();
  
  console.log(`\n✅ API with server test completed!`);
  console.log(`💡 To test the frontend, visit: http://localhost:3000/politicians/P259F2D0E`);
}

// Run the test
testAPIWithServer().catch(console.error); 