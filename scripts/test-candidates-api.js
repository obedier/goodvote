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

async function testCandidatesAPI() {
  console.log('🔍 Testing Candidates API\n');
  console.log('=' .repeat(100));
  
  // 1. Test the candidates listing API
  console.log('📊 Testing Candidates Listing API:');
  const candidatesUrl = 'http://localhost:3000/api/candidates';
  
  try {
    const response = await fetch(candidatesUrl);
    
    if (response.ok) {
      const data = await response.json();
      
      if (data.success && data.data) {
        console.log(`   ✅ Success: Found ${data.data.length} candidates`);
        
        // Show first few candidates
        data.data.slice(0, 5).forEach((candidate, index) => {
          console.log(`   ${index + 1}. ${candidate.display_name} (${candidate.state}) - ${candidate.election_year}`);
          console.log(`      FEC ID: ${candidate.cand_id}, Office: ${candidate.current_office}, Party: ${candidate.current_party}`);
          console.log(`      Incumbent: ${candidate.is_current_office_holder ? 'Yes' : 'No'}`);
        });
      } else {
        console.log(`   ❌ API Response Failed:`, data.error || 'Unknown error');
      }
    } else {
      console.log(`   ❌ API Request Failed: ${response.status} ${response.statusText}`);
    }
    
  } catch (error) {
    console.log(`   ❌ API Request Error:`, error.message);
    console.log(`   💡 Make sure the development server is running: npm run dev`);
  }
  
  // 2. Test search functionality
  console.log('\n📊 Testing Candidates Search API:');
  const searchUrl = 'http://localhost:3000/api/candidates?q=Rashida';
  
  try {
    const response = await fetch(searchUrl);
    
    if (response.ok) {
      const data = await response.json();
      
      if (data.success && data.data) {
        console.log(`   ✅ Search Success: Found ${data.data.length} candidates matching "Rashida"`);
        
        data.data.forEach((candidate, index) => {
          console.log(`   ${index + 1}. ${candidate.display_name} (${candidate.state}) - ${candidate.election_year}`);
        });
      } else {
        console.log(`   ❌ Search Failed:`, data.error || 'Unknown error');
      }
    } else {
      console.log(`   ❌ Search Request Failed: ${response.status} ${response.statusText}`);
    }
    
  } catch (error) {
    console.log(`   ❌ Search Request Error:`, error.message);
  }
  
  // 3. Test individual candidate profile API
  console.log('\n📊 Testing Individual Candidate Profile API:');
  const testCandidateId = 'P259F2D0E'; // Rashida Tlaib
  const profileUrl = `http://localhost:3000/api/candidates/${testCandidateId}?election_year=2024`;
  
  try {
    const response = await fetch(profileUrl);
    
    if (response.ok) {
      const data = await response.json();
      
      if (data.success && data.data) {
        const candidate = data.data;
        console.log(`   ✅ Profile Success for ${candidate.display_name}`);
        console.log(`   📊 Candidate Details:`);
        console.log(`      Name: ${candidate.display_name}`);
        console.log(`      State: ${candidate.state}`);
        console.log(`      Office: ${candidate.current_office}`);
        console.log(`      Party: ${candidate.current_party}`);
        console.log(`      FEC ID: ${candidate.cand_id}`);
        console.log(`      Incumbent: ${candidate.is_current_office_holder ? 'Yes' : 'No'}`);
        console.log(`      Available Cycles: ${candidate.available_election_cycles.join(', ')}`);
        console.log(`      Current Election Year: ${candidate.current_election_year}`);
        
        if (candidate.links) {
          console.log(`   🔗 External Links:`);
          if (candidate.links.fec) console.log(`      FEC: ${candidate.links.fec}`);
          if (candidate.links.congress) console.log(`      Congress: ${candidate.links.congress}`);
        }
        
        if (candidate.campaign_finance) {
          console.log(`   💰 Campaign Finance (${candidate.current_election_year}):`);
          console.log(`      Total Receipts: $${candidate.campaign_finance.total_receipts?.toLocaleString() || 0}`);
          console.log(`      Individual Contributions: $${candidate.campaign_finance.total_individual_contributions?.toLocaleString() || 0}`);
          console.log(`      PAC Contributions: $${candidate.campaign_finance.total_pac_contributions?.toLocaleString() || 0}`);
          console.log(`      Total Disbursements: $${candidate.campaign_finance.total_disbursements?.toLocaleString() || 0}`);
          console.log(`      Cash on Hand: $${candidate.campaign_finance.cash_on_hand?.toLocaleString() || 0}`);
          console.log(`      Contribution Count: ${candidate.campaign_finance.contribution_count?.toLocaleString() || 0}`);
        }
        
        if (candidate.career_totals) {
          console.log(`   📈 Career Totals:`);
          console.log(`      Total Receipts: $${candidate.career_totals.career_total_receipts?.toLocaleString() || 0}`);
          console.log(`      Total Disbursements: $${candidate.career_totals.career_total_disbursements?.toLocaleString() || 0}`);
          console.log(`      Election Cycles: ${candidate.career_totals.total_election_cycles || 0}`);
        }
        
        if (candidate.top_contributors && candidate.top_contributors.length > 0) {
          console.log(`   👥 Top Contributors (${candidate.top_contributors.length}):`);
          candidate.top_contributors.slice(0, 3).forEach((contributor, index) => {
            console.log(`      ${index + 1}. ${contributor.name} - $${contributor.amount?.toLocaleString() || 0} (${contributor.type})`);
          });
        }
        
        if (candidate.top_industries && candidate.top_industries.length > 0) {
          console.log(`   🏭 Top Industries (${candidate.top_industries.length}):`);
          candidate.top_industries.slice(0, 3).forEach((industry, index) => {
            console.log(`      ${index + 1}. ${industry.industry} - $${industry.amount?.toLocaleString() || 0} (${industry.percentage?.toFixed(1) || 0}%)`);
          });
        }
        
        if (candidate.election_history && candidate.election_history.length > 0) {
          console.log(`   📅 Election History (${candidate.election_history.length} elections):`);
          candidate.election_history.forEach((election, index) => {
            console.log(`      ${index + 1}. ${election.election_year} - ${election.result} (${election.current_office})`);
          });
        }
        
      } else {
        console.log(`   ❌ Profile Failed:`, data.error || 'Unknown error');
      }
    } else {
      console.log(`   ❌ Profile Request Failed: ${response.status} ${response.statusText}`);
    }
    
  } catch (error) {
    console.log(`   ❌ Profile Request Error:`, error.message);
  }
  
  // 4. Test database functions directly
  console.log('\n🔍 Testing Database Functions Directly:');
  
  const { getAllCandidates, getCandidateProfile, getCandidateCampaignFinance } = require('../src/lib/candidates');
  
  try {
    // Test getAllCandidates
    const allCandidatesResult = await getAllCandidates();
    if (allCandidatesResult.success) {
      console.log(`   ✅ getAllCandidates: Found ${allCandidatesResult.data.length} candidates`);
    } else {
      console.log(`   ❌ getAllCandidates failed:`, allCandidatesResult.error);
    }
    
    // Test getCandidateProfile
    const profileResult = await getCandidateProfile(testCandidateId);
    if (profileResult.success) {
      console.log(`   ✅ getCandidateProfile: Found ${profileResult.data.length} election cycles`);
    } else {
      console.log(`   ❌ getCandidateProfile failed:`, profileResult.error);
    }
    
    // Test getCandidateCampaignFinance
    const financeResult = await getCandidateCampaignFinance(testCandidateId, 2024);
    if (financeResult.success) {
      console.log(`   ✅ getCandidateCampaignFinance: $${financeResult.data.total_receipts?.toLocaleString() || 0} total receipts`);
    } else {
      console.log(`   ❌ getCandidateCampaignFinance failed:`, financeResult.error);
    }
    
  } catch (error) {
    console.log(`   ❌ Database function error:`, error.message);
  }
  
  // Close database connection
  await goodvotePool.end();
  
  console.log('\n✅ Candidates API test completed!');
  console.log('💡 To test the frontend:');
  console.log('   - Visit: http://localhost:3000/candidates');
  console.log('   - Visit: http://localhost:3000/candidates/P259F2D0E');
}

// Run the test
testCandidatesAPI().catch(console.error); 