import { getIsraelLobbyScore } from '@/lib/israel-lobby';

interface DebugPageProps {
  params: {
    personId: string;
  };
}

export default async function DebugPage({ params }: DebugPageProps) {
  const { personId } = params;
  
  // Get the Israel lobby data with debug info
  const israelLobbyResult = await getIsraelLobbyScore(personId);
  
  // Get candidate basic info from the Israel lobby result
  const candidateResult = israelLobbyResult.success && israelLobbyResult.data ? {
    person_id: israelLobbyResult.data.person_id,
    candidate_name: israelLobbyResult.data.candidate_name,
    state: israelLobbyResult.data.state,
    district: israelLobbyResult.data.district,
    office: israelLobbyResult.data.office,
    party: israelLobbyResult.data.party,
    election_year: israelLobbyResult.data.election_year
  } : null;
  
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow-lg rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h1 className="text-2xl font-bold text-gray-900">
              Debug: Israel Lobby Analysis
            </h1>
            <p className="text-gray-600 mt-2">
              Person ID: {personId}
            </p>
          </div>
          
          <div className="p-6">
            {/* Candidate Info */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Candidate Information
              </h2>
              <div className="bg-gray-50 p-4 rounded-lg">
                <pre className="text-sm text-gray-800 whitespace-pre-wrap">
                  {JSON.stringify(candidateResult, null, 2)}
                </pre>
              </div>
            </div>
            
            {/* Israel Lobby Results */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Israel Lobby Analysis Results
              </h2>
              <div className="bg-gray-50 p-4 rounded-lg">
                <pre className="text-sm text-gray-800 whitespace-pre-wrap">
                  {JSON.stringify(israelLobbyResult, null, 2)}
                </pre>
              </div>
            </div>
            
            {/* Key Metrics Summary */}
            {israelLobbyResult.success && israelLobbyResult.data && (
              <div className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  Key Metrics Summary
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h3 className="font-medium text-blue-900">Humanity Score</h3>
                    <p className="text-2xl font-bold text-blue-600">
                      {israelLobbyResult.data.humanity_score}/5
                    </p>
                    <p className="text-sm text-blue-700">
                      {israelLobbyResult.data.humanity_score === 0 ? 'Worst' : 
                       israelLobbyResult.data.humanity_score === 5 ? 'Best' : 
                       `${israelLobbyResult.data.humanity_score === 1 ? 'Very Poor' :
                         israelLobbyResult.data.humanity_score === 2 ? 'Poor' :
                         israelLobbyResult.data.humanity_score === 3 ? 'Fair' : 'Good'}`}
                    </p>
                  </div>
                  
                  <div className="bg-green-50 p-4 rounded-lg">
                    <h3 className="font-medium text-green-900">Lobby Grade</h3>
                    <p className="text-2xl font-bold text-green-600">
                      {israelLobbyResult.data.lobby_grade}
                    </p>
                    <p className="text-sm text-green-700">
                      {israelLobbyResult.data.lobby_category}
                    </p>
                  </div>
                  
                  <div className="bg-yellow-50 p-4 rounded-lg">
                    <h3 className="font-medium text-yellow-900">Total Contributions</h3>
                    <p className="text-2xl font-bold text-yellow-600">
                      ${israelLobbyResult.data.total_pro_israel_contributions.toLocaleString()}
                    </p>
                    <p className="text-sm text-yellow-700">
                      Net amount (support - oppose)
                    </p>
                  </div>
                  
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <h3 className="font-medium text-purple-900">PAC Count</h3>
                    <p className="text-2xl font-bold text-purple-600">
                      {israelLobbyResult.data.pro_israel_pac_count}
                    </p>
                    <p className="text-sm text-purple-700">
                      Pro-Israel PACs involved
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            {/* Cycle Breakdown */}
            {israelLobbyResult.success && israelLobbyResult.data?.cycle_breakdown && (
              <div className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  Election Cycle Breakdown
                </h2>
                <div className="space-y-4">
                  {israelLobbyResult.data.cycle_breakdown.map((cycle, index) => (
                    <div key={index} className="bg-gray-50 p-4 rounded-lg">
                      <h3 className="font-medium text-gray-900 mb-2">
                        {cycle.election_year} Election
                      </h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="font-medium">Support:</span>
                          <span className={`ml-2 ${cycle.total_support > 0 ? 'text-green-600' : 'text-gray-500'}`}>
                            ${cycle.total_support.toLocaleString()}
                          </span>
                        </div>
                        <div>
                          <span className="font-medium">Oppose:</span>
                          <span className={`ml-2 ${cycle.total_oppose > 0 ? 'text-red-600' : 'text-gray-500'}`}>
                            ${cycle.total_oppose.toLocaleString()}
                          </span>
                        </div>
                        <div>
                          <span className="font-medium">Net:</span>
                          <span className={`ml-2 ${cycle.net_amount > 0 ? 'text-green-600' : cycle.net_amount < 0 ? 'text-red-600' : 'text-gray-500'}`}>
                            ${cycle.net_amount.toLocaleString()}
                          </span>
                        </div>
                        <div>
                          <span className="font-medium">PACs:</span>
                          <span className="ml-2 text-gray-600">{cycle.pac_count}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* PAC Contributions */}
            {israelLobbyResult.success && israelLobbyResult.data?.pac_contributions && (
              <div className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  PAC Contributions Detail
                </h2>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          PAC Name
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Amount
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Support/Oppose
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Date
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {israelLobbyResult.data.pac_contributions.map((pac, index) => (
                        <tr key={index}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {pac.pac_name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            ${pac.amount.toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              pac.support_oppose === 'SUPPORT' 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {pac.support_oppose}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {pac.contribution_date}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 