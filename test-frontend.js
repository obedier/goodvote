const fetch = require('node-fetch');

async function testFrontendData() {
  try {
    console.log('Testing frontend data...');
    
    // Test the API directly
    const apiResponse = await fetch('http://localhost:3000/api/politicians/P259F2D0E');
    const apiData = await apiResponse.json();
    
    console.log('API Response:');
    console.log('Success:', apiData.success);
    console.log('Top Contributors Count:', apiData.data?.top_contributors?.length || 0);
    console.log('First Contributor:', apiData.data?.top_contributors?.[0]);
    console.log('Campaign Finance:', apiData.data?.campaign_finance);
    
    // Test the frontend page
    const pageResponse = await fetch('http://localhost:3000/politicians/P259F2D0E');
    const pageHtml = await pageResponse.text();
    
    console.log('\nFrontend Page:');
    console.log('Contains MALAS:', pageHtml.includes('MALAS'));
    console.log('Contains 9300:', pageHtml.includes('9300'));
    console.log('Contains contributor data:', pageHtml.includes('Top Contributors'));
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testFrontendData(); 