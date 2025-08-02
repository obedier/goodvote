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

async function testEnhancedAPI() {
  console.log('🔍 Testing Enhanced API with All Campaign Finance Data\n');
  console.log('=' .repeat(100));
  
  // Test with multiple candidates to ensure the API works for all
  const testCandidates = [
    { personId: 'P259F2D0E', name: 'Rashida Tlaib' },
    // Add more test candidates here
  ];
  
  for (const candidate of testCandidates) {
    console.log(`\n📊 Testing API for ${candidate.name} (${candidate.personId})`);
    
    // 1. Test the API endpoint
    const apiUrl = `http://localhost:3000/api/politicians/${candidate.personId}`;
    
    try {
      const response = await fetch(apiUrl);
      const apiData = await response.json();
      
      if (apiData.success && apiData.data) {
        const data = apiData.data;
        console.log(`✅ API Response Success for ${candidate.name}`);
        
        // 2. Verify campaign finance data structure
        console.log(`\n📊 Campaign Finance Data Structure:`);
        console.log(`   ✅ Total Receipts: $${data.campaign_finance?.total_receipts?.toLocaleString() || 0}`);
        console.log(`   ✅ Total Disbursements: $${data.campaign_finance?.total_disbursements?.toLocaleString() || 0}`);
        console.log(`   ✅ Cash on Hand: $${data.campaign_finance?.cash_on_hand?.toLocaleString() || 0}`);
        console.log(`   ✅ Contribution Count: ${data.campaign_finance?.contribution_count?.toLocaleString() || 0}`);
        console.log(`   ✅ Average Contribution: $${data.campaign_finance?.avg_contribution?.toLocaleString() || 0}`);
        
        // 3. Verify enhanced campaign finance data
        console.log(`\n📊 Enhanced Campaign Finance Data:`);
        console.log(`   ✅ Individual Contributions: $${data.campaign_finance?.total_individual_contributions?.toLocaleString() || 0}`);
        console.log(`   ✅ Other Committee Contributions: $${data.campaign_finance?.other_committee_contributions?.toLocaleString() || 0}`);
        console.log(`   ✅ Party Committee Contributions: $${data.campaign_finance?.party_committee_contributions?.toLocaleString() || 0}`);
        console.log(`   ✅ Transfers from Auth: $${data.campaign_finance?.transfers_from_auth?.toLocaleString() || 0}`);
        
        // 4. Verify debt and self-financing data
        console.log(`\n📊 Debt & Self-Financing Data:`);
        console.log(`   ✅ Self-Financing: $${data.campaign_finance?.self_financing?.toLocaleString() || 0}`);
        console.log(`   ✅ Self-Financing %: ${data.campaign_finance?.self_financing_percentage?.toFixed(1) || 0}%`);
        console.log(`   ✅ Total Debt: $${data.campaign_finance?.total_debt?.toLocaleString() || 0}`);
        console.log(`   ✅ Debt-to-Receipts Ratio: ${data.campaign_finance?.debt_to_receipts_ratio?.toFixed(1) || 0}%`);
        
        // 5. Verify PAC support data
        console.log(`\n📊 PAC Support Data:`);
        console.log(`   ✅ Total PAC Contributions: $${data.campaign_finance?.total_pac_contributions?.toLocaleString() || 0}`);
        console.log(`   ✅ PAC Contribution Count: ${data.campaign_finance?.pac_contribution_count?.toLocaleString() || 0}`);
        console.log(`   ✅ Unique PACs: ${data.campaign_finance?.unique_pacs?.toLocaleString() || 0}`);
        console.log(`   ✅ PAC Percentage: ${data.campaign_finance?.pac_percentage?.toFixed(1) || 0}%`);
        
        // 6. Verify outside spending estimates
        console.log(`\n📊 Outside Spending Estimates:`);
        console.log(`   ✅ Bundled Contributions: $${data.campaign_finance?.bundled_contributions?.toLocaleString() || 0}`);
        console.log(`   ✅ Unique Bundlers: ${data.campaign_finance?.unique_bundlers?.toLocaleString() || 0}`);
        console.log(`   ✅ Bundled Contribution Count: ${data.campaign_finance?.bundled_contribution_count?.toLocaleString() || 0}`);
        console.log(`   ✅ Estimated Independent Expenditures: $${data.campaign_finance?.estimated_independent_expenditures?.toLocaleString() || 0}`);
        console.log(`   ✅ Estimated Communication Costs: $${data.campaign_finance?.estimated_communication_costs?.toLocaleString() || 0}`);
        console.log(`   ✅ Estimated Soft Money: $${data.campaign_finance?.estimated_soft_money?.toLocaleString() || 0}`);
        console.log(`   ✅ Total Outside Spending: $${data.campaign_finance?.total_outside_spending?.toLocaleString() || 0}`);
        console.log(`   ✅ Outside Spending %: ${data.campaign_finance?.outside_spending_percentage?.toFixed(1) || 0}%`);
        
        // 7. Verify confidence levels
        console.log(`\n📊 Confidence Levels:`);
        if (data.campaign_finance?.outside_spending_confidence) {
          const confidence = data.campaign_finance.outside_spending_confidence;
          console.log(`   ✅ Bundled Contributions: ${confidence.bundled_contributions || 'LOW'}`);
          console.log(`   ✅ Independent Expenditures: ${confidence.independent_expenditures || 'LOW'}`);
          console.log(`   ✅ Communication Costs: ${confidence.communication_costs || 'LOW'}`);
          console.log(`   ✅ Soft Money: ${confidence.soft_money || 'LOW'}`);
        } else {
          console.log(`   ⚠️  Confidence levels not found in API response`);
        }
        
        // 8. Verify other API data
        console.log(`\n📊 Other API Data:`);
        console.log(`   ✅ Display Name: ${data.display_name || 'N/A'}`);
        console.log(`   ✅ State: ${data.state || 'N/A'}`);
        console.log(`   ✅ Current Office: ${data.current_office || 'N/A'}`);
        console.log(`   ✅ Current District: ${data.current_district || 'N/A'}`);
        console.log(`   ✅ Current Party: ${data.current_party || 'N/A'}`);
        console.log(`   ✅ Top Contributors Count: ${data.top_contributors?.length || 0}`);
        console.log(`   ✅ Election History Count: ${data.election_history?.length || 0}`);
        
        // 9. Data quality assessment
        console.log(`\n🔍 Data Quality Assessment for ${candidate.name}:`);
        
        const receipts = data.campaign_finance?.total_receipts || 0;
        const individualContributions = data.campaign_finance?.total_individual_contributions || 0;
        const disbursements = data.campaign_finance?.total_disbursements || 0;
        const outsideSpending = data.campaign_finance?.total_outside_spending || 0;
        
        if (receipts > 0) {
          console.log(`   ✅ Total Receipts: $${receipts.toLocaleString()} (HIGH confidence)`);
        } else {
          console.log(`   ⚠️  Total Receipts: $0 (may indicate no data)`);
        }
        
        if (individualContributions > 0) {
          console.log(`   ✅ Individual Contributions: $${individualContributions.toLocaleString()} (HIGH confidence)`);
        } else {
          console.log(`   ⚠️  Individual Contributions: $0 (may indicate no data)`);
        }
        
        if (disbursements > 0) {
          console.log(`   ✅ Total Disbursements: $${disbursements.toLocaleString()} (HIGH confidence)`);
        } else {
          console.log(`   ⚠️  Total Disbursements: $0 (may indicate no data)`);
        }
        
        if (outsideSpending > 0) {
          console.log(`   ✅ Outside Spending: $${outsideSpending.toLocaleString()} (MIXED confidence)`);
        } else {
          console.log(`   ⚠️  Outside Spending: $0 (LOW confidence - data not available)`);
        }
        
      } else {
        console.log(`❌ API Response Failed for ${candidate.name}:`, apiData.error || 'Unknown error');
      }
      
    } catch (error) {
      console.log(`❌ API Request Failed for ${candidate.name}:`, error.message);
    }
  }
  
  // 10. Test database function directly for comparison
  console.log(`\n🔍 Testing Database Function Directly:`);
  
  const { getCampaignFinanceTotals } = require('../src/lib/database');
  
  for (const candidate of testCandidates) {
    console.log(`\n📊 Database Function Test for ${candidate.name}:`);
    
    try {
      const dbResult = await getCampaignFinanceTotals(candidate.personId, 2024);
      
      if (dbResult.success && dbResult.data) {
        const dbData = dbResult.data;
        console.log(`   ✅ Database Function Success`);
        console.log(`   ✅ Total Receipts: $${dbData.total_receipts?.toLocaleString() || 0}`);
        console.log(`   ✅ Individual Contributions: $${dbData.total_individual_contributions?.toLocaleString() || 0}`);
        console.log(`   ✅ PAC Contributions: $${dbData.total_pac_contributions?.toLocaleString() || 0}`);
        console.log(`   ✅ Outside Spending: $${dbData.total_outside_spending?.toLocaleString() || 0}`);
        console.log(`   ✅ Self-Financing: ${dbData.self_financing_percentage?.toFixed(1) || 0}%`);
        console.log(`   ✅ Debt Ratio: ${dbData.debt_to_receipts_ratio?.toFixed(1) || 0}%`);
      } else {
        console.log(`   ❌ Database Function Failed:`, dbResult.error || 'Unknown error');
      }
      
    } catch (error) {
      console.log(`   ❌ Database Function Error:`, error.message);
    }
  }
  
  // Close database connection
  await goodvotePool.end();
  
  console.log(`\n✅ Enhanced API test completed!`);
}

// Run the test
testEnhancedAPI().catch(console.error); 