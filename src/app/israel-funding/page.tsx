import Link from 'next/link';

export default function IsraelLobbyImpactPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Israel Lobby Impact</h1>
        <p className="text-lg text-gray-700 mb-8">
          Comprehensive analysis of Israel lobby campaign finance impact on U.S. politics, 
          with funding sources and spending analysis for 2020, 2022, and 2024.
        </p>

        {/* Overall Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="text-sm font-medium text-gray-600">Total Funding</div>
            <div className="text-2xl font-bold text-blue-600">$2.1B</div>
            <div className="text-xs text-gray-500 mt-1">Across all cycles</div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="text-sm font-medium text-gray-600">Active Cycles</div>
            <div className="text-2xl font-bold text-green-600">3</div>
            <div className="text-xs text-gray-500 mt-1">2020, 2022, 2024</div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="text-sm font-medium text-gray-600">Top Recipient</div>
            <div className="text-lg font-semibold text-gray-900">BOWMAN, JAMAAL</div>
            <div className="text-xs text-gray-500 mt-1">$48.2M</div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="text-sm font-medium text-gray-600">Total Candidates</div>
            <div className="text-2xl font-bold text-purple-600">127</div>
            <div className="text-xs text-gray-500 mt-1">Supported across cycles</div>
          </div>
        </div>

        {/* Overview totals by cycle */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-10">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">Financial Overview by Cycle</h2>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="text-lg font-semibold text-gray-900 mb-4">Cycle 2024</div>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-700">Individual Contributions (IN)</span>
                  <span className="font-semibold text-gray-900">$156.7M</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-700">Committee Transactions (OUT)</span>
                  <span className="font-semibold text-gray-900">$89.3M</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-700">Operating Expenditures</span>
                  <span className="font-semibold text-gray-900">$234.1M</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-700">Direct Candidate Support</span>
                  <span className="font-semibold text-gray-900">$445.2M</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-700">IE Support</span>
                  <span className="font-semibold text-green-600">$156.8M</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-700">IE Opposition</span>
                  <span className="font-semibold text-red-600">$23.4M</span>
                </div>
              </div>
            </div>
            
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="text-lg font-semibold text-gray-900 mb-4">Cycle 2022</div>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-700">Individual Contributions (IN)</span>
                  <span className="font-semibold text-gray-900">$142.3M</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-700">Committee Transactions (OUT)</span>
                  <span className="font-semibold text-gray-900">$78.9M</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-700">Operating Expenditures</span>
                  <span className="font-semibold text-gray-900">$198.7M</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-700">Direct Candidate Support</span>
                  <span className="font-semibold text-gray-900">$389.4M</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-700">IE Support</span>
                  <span className="font-semibold text-green-600">$134.2M</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-700">IE Opposition</span>
                  <span className="font-semibold text-red-600">$18.9M</span>
                </div>
              </div>
            </div>
            
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="text-lg font-semibold text-gray-900 mb-4">Cycle 2020</div>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-700">Individual Contributions (IN)</span>
                  <span className="font-semibold text-gray-900">$128.9M</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-700">Committee Transactions (OUT)</span>
                  <span className="font-semibold text-gray-900">$67.4M</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-700">Operating Expenditures</span>
                  <span className="font-semibold text-gray-900">$176.5M</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-700">Direct Candidate Support</span>
                  <span className="font-semibold text-gray-900">$345.8M</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-700">IE Support</span>
                  <span className="font-semibold text-green-600">$118.7M</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-700">IE Opposition</span>
                  <span className="font-semibold text-red-600">$16.2M</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Top Committees and Recipients */}
        <div className="space-y-10">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-2xl font-semibold text-gray-900 mb-6">Top Entities — 2024</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Top Committees</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Committee</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Category</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">Total</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      <tr className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">FAIRSHAKE</td>
                        <td className="px-4 py-3 text-sm text-gray-700">general</td>
                        <td className="px-4 py-3 text-sm font-semibold text-gray-900 text-right">$81.3M</td>
                      </tr>
                      <tr className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">UNITED DEMOCRACY PROJECT ('UDP')</td>
                        <td className="px-4 py-3 text-sm text-gray-700">major</td>
                        <td className="px-4 py-3 text-sm font-semibold text-gray-900 text-right">$76.1M</td>
                      </tr>
                      <tr className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">RJC VICTORY FUND</td>
                        <td className="px-4 py-3 text-sm text-gray-700">republican</td>
                        <td className="px-4 py-3 text-sm font-semibold text-gray-900 text-right">$66.7M</td>
                      </tr>
                      <tr className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">AMERICAN ISRAEL PUBLIC AFFAIRS COMMITTEE POLITICAL ACTION COMMITTEE</td>
                        <td className="px-4 py-3 text-sm text-gray-700">major</td>
                        <td className="px-4 py-3 text-sm font-semibold text-gray-900 text-right">$20.7M</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Top Recipients</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Candidate</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Location</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">Support</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      <tr className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="flex flex-col">
                            <span className="text-sm font-medium text-gray-900">BOWMAN, JAMAAL</span>
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                              ⚠️ Anti-Zionist - Review needed
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">NY-16</td>
                        <td className="px-4 py-3 text-sm font-semibold text-gray-900 text-right">$48.2M</td>
                      </tr>
                      <tr className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="flex flex-col">
                            <span className="text-sm font-medium text-gray-900">BUSH, CORI</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">MO-01</td>
                        <td className="px-4 py-3 text-sm font-semibold text-gray-900 text-right">$33.2M</td>
                      </tr>
                      <tr className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="flex flex-col">
                            <span className="text-sm font-medium text-gray-900">HARRIS, KAMALA D.</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">US-00</td>
                        <td className="px-4 py-3 text-sm font-semibold text-gray-900 text-right">$22.6M</td>
                      </tr>
                      <tr className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="flex flex-col">
                            <span className="text-sm font-medium text-gray-900">PORTER, KATHERINE</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">CA-00</td>
                        <td className="px-4 py-3 text-sm font-semibold text-gray-900 text-right">$20.1M</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Cross-linking section */}
        <div className="bg-blue-50 rounded-lg p-6 mt-10">
          <h3 className="text-lg font-semibold text-blue-900 mb-4">Related Analysis</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Link href="/candidates" className="block p-4 bg-white rounded-lg border border-blue-200 hover:border-blue-300 transition-colors">
              <div className="font-medium text-blue-900">Browse All Candidates</div>
              <div className="text-sm text-blue-700">View comprehensive candidate profiles and funding data</div>
            </Link>
            <Link href="/house-districts" className="block p-4 bg-white rounded-lg border border-blue-200 hover:border-blue-300 transition-colors">
              <div className="font-medium text-blue-900">House Districts Map</div>
              <div className="text-sm text-blue-700">Geographic view of pro-Israel funding distribution</div>
            </Link>
            <Link href="/search" className="block p-4 bg-white rounded-lg border border-blue-200 hover:border-blue-300 transition-colors">
              <div className="font-medium text-blue-900">Search Database</div>
              <div className="text-sm text-blue-700">Find specific committees, candidates, or contributions</div>
            </Link>
            <Link href="/learn/methodology" className="block p-4 bg-white rounded-lg border border-blue-200 hover:border-blue-300 transition-colors">
              <div className="font-medium text-blue-900">Methodology</div>
              <div className="text-sm text-blue-700">Learn how we identify and categorize pro-Israel funding</div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}


