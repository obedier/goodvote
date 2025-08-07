import { executeQuery } from './database';

export async function testCongressData() {
  try {
    console.log('Testing congressional data access...');
    
    // Test 1: Check cng_district_mapping structure
    const testQuery1 = `
      SELECT * FROM cng_district_mapping 
      WHERE district > 0 
      LIMIT 3
    `;
    
    const result1 = await executeQuery(testQuery1, [], true);
    console.log('cng_district_mapping sample:', result1);
    
    // Test 2: Check cng_legislators_current structure
    const testQuery2 = `
      SELECT * FROM cng_legislators_current 
      LIMIT 3
    `;
    
    const result2 = await executeQuery(testQuery2, [], true);
    console.log('cng_legislators_current sample:', result2);
    
    return { success: true, data: { result1, result2 } };
  } catch (error) {
    console.error('Error in testCongressData:', error);
    return { success: false, error: error.message };
  }
} 