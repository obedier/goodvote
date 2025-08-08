const { executeQuery } = require('../src/lib/database');

async function checkCacheStatus() {
  try {
    console.log('Checking Israel lobby cache status...\n');
    
    // Check if cache table exists and get stats
    const statsQuery = `
      SELECT 
        COUNT(*) as total_cached,
        COUNT(CASE WHEN last_calculated > NOW() - INTERVAL '30 days' THEN 1 END) as recent_cached,
        COUNT(CASE WHEN last_calculated <= NOW() - INTERVAL '30 days' THEN 1 END) as stale_cached,
        AVG(humanity_score) as avg_humanity_score,
        SUM(total_israel_funding) as total_funding,
        MIN(last_calculated) as oldest_calculation,
        MAX(last_calculated) as newest_calculation
      FROM israel_lobby_cache
    `;
    
    const statsResult = await executeQuery(statsQuery, [], true);
    
    if (statsResult.success && statsResult.data.length > 0) {
      const stats = statsResult.data[0];
      console.log('📊 Cache Statistics:');
      console.log(`  Total cached entries: ${stats.total_cached}`);
      console.log(`  Recent entries (< 30 days): ${stats.recent_cached}`);
      console.log(`  Stale entries (≥ 30 days): ${stats.stale_cached}`);
      console.log(`  Average humanity score: ${stats.avg_humanity_score ? stats.avg_humanity_score.toFixed(2) : 'N/A'}`);
      console.log(`  Total Israel funding: $${stats.total_funding ? stats.total_funding.toLocaleString() : '0'}`);
      console.log(`  Oldest calculation: ${stats.oldest_calculation || 'N/A'}`);
      console.log(`  Newest calculation: ${stats.newest_calculation || 'N/A'}`);
    } else {
      console.log('❌ Cache table not found or empty');
    }
    
    // Get some sample entries
    const sampleQuery = `
      SELECT 
        person_id,
        humanity_score,
        total_israel_funding,
        lobby_grade,
        last_calculated
      FROM israel_lobby_cache
      ORDER BY last_calculated DESC
      LIMIT 10
    `;
    
    const sampleResult = await executeQuery(sampleQuery, [], true);
    
    if (sampleResult.success && sampleResult.data.length > 0) {
      console.log('\n📋 Recent Cache Entries:');
      sampleResult.data.forEach((entry, index) => {
        const daysAgo = Math.round((new Date() - new Date(entry.last_calculated)) / (1000 * 60 * 60 * 24));
        console.log(`  ${index + 1}. ${entry.person_id} - Score: ${entry.humanity_score}, Funding: $${entry.total_israel_funding.toLocaleString()}, Grade: ${entry.lobby_grade} (${daysAgo} days ago)`);
      });
    }
    
    // Check how many representatives we should have
    const totalRepsQuery = `
      SELECT COUNT(DISTINCT (term->>'state') || '-' || (term->>'district')) as total_reps
      FROM cng_legislators_current,
           jsonb_array_elements(terms) as term
      WHERE term->>'type' = 'rep'
        AND term->>'end' > '2024-01-01'
    `;
    
    const totalRepsResult = await executeQuery(totalRepsQuery, [], true);
    
    if (totalRepsResult.success && totalRepsResult.data.length > 0) {
      const totalReps = totalRepsResult.data[0].total_reps;
      const cachedCount = statsResult.success ? statsResult.data[0].total_cached : 0;
      const coverage = totalReps > 0 ? ((cachedCount / totalReps) * 100).toFixed(1) : 0;
      
      console.log(`\n📈 Coverage: ${cachedCount}/${totalReps} representatives (${coverage}%)`);
      
      if (coverage < 90) {
        console.log('⚠️  Low cache coverage detected. Consider running the population script.');
      } else {
        console.log('✅ Good cache coverage!');
      }
    }
    
  } catch (error) {
    console.error('Error checking cache status:', error);
  }
}

// Run the status check
if (require.main === module) {
  checkCacheStatus()
    .then(() => {
      console.log('\nCache status check completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Cache status check failed:', error);
      process.exit(1);
    });
}

module.exports = { checkCacheStatus }; 