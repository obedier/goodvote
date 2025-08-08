export async function testFunctionCall() {
  console.log('=== FUNCTION CALL TEST ===');
  console.log('This function is being called successfully');
  
  return { 
    success: true, 
    data: [
      {
        state: "AL",
        district_name: "AL District 1",
        incumbent_person_id: "TEST123",
        incumbent_name: "Barry Moore",
        incumbent_party: "REP",
        first_elected_year: 2020,
        incumbent_cash_on_hand: 100000,
        incumbent_israel_score: 5,
        challenger_count: 1,
        top_challenger_name: "Test Challenger",
        top_challenger_person_id: "CHALLENGE123",
        top_challenger_party: "DEM",
        top_challenger_cash_on_hand: 50000,
        top_challenger_israel_score: 3,
        status: "FILLED",
        voting: true
      }
    ]
  };
} 