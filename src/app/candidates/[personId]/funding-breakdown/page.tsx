'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface FundingBreakdown {
  total_amount: number;
  total_count: number;
  contributions: Array<{
    source_table: string;
    contribution_receipt_amount: string;
    contributor_name: string;
    contributor_employer?: string;
    contributor_occupation?: string;
    contribution_receipt_date: string;
    committee_name: string;
    committee_id: string;
    committee_type: string;
  }>;
}

interface Candidate {
  person_id: string;
  name: string;
  party: string;
  election_year: number;
}

export default function FundingBreakdownPage({ 
  params 
}: { 
  params: Promise<{ personId: string }> 
}) {
  const [personId, setPersonId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [fundingBreakdown, setFundingBreakdown] = useState<FundingBreakdown | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const { personId: id } = await params;
        setPersonId(id);
        
        const response = await fetch(`/api/candidates/${id}/funding-breakdown`);
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || 'Failed to load funding breakdown');
        }
        
        setCandidate(data.candidate);
        setFundingBreakdown(data.funding_breakdown);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    }
    
    loadData();
  }, [params]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading funding breakdown...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
          <h2 className="text-xl font-bold text-red-800 mb-2">Error</h2>
          <p className="text-red-600 mb-4">{error}</p>
          <Link href="/congressional-map" className="text-blue-600 hover:text-blue-800">
            ← Back to Map
          </Link>
        </div>
      </div>
    );
  }

  if (!candidate || !fundingBreakdown) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 max-w-md">
          <h2 className="text-xl font-bold text-yellow-800 mb-2">No Data Found</h2>
          <p className="text-yellow-600 mb-4">No funding breakdown available for this candidate.</p>
          <Link href="/congressional-map" className="text-blue-600 hover:text-blue-800">
            ← Back to Map
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Funding Breakdown</h1>
              <p className="text-gray-600">Detailed pro-Israel funding analysis</p>
            </div>
            <Link 
              href="/congressional-map"
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
            >
              ← Back to Map
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Candidate Info */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Candidate Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Name</label>
              <p className="mt-1 text-sm text-gray-900">{candidate.name}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Party</label>
              <p className="mt-1 text-sm text-gray-900">{candidate.party}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Election Year</label>
              <p className="mt-1 text-sm text-gray-900">{candidate.election_year}</p>
            </div>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Funding Summary</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-blue-900">
                ${fundingBreakdown.total_amount.toLocaleString()}
              </div>
              <div className="text-sm text-blue-700">Total Pro-Israel Funding</div>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-green-900">
                {fundingBreakdown.total_count}
              </div>
              <div className="text-sm text-green-700">Total Contributions</div>
            </div>
          </div>
        </div>

        {/* Detailed Contributions */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">Detailed Contributions</h2>
            <p className="text-sm text-gray-600 mt-1">
              Showing all pro-Israel contributions from {fundingBreakdown.total_count} records
            </p>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contributor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Committee
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Source
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {fundingBreakdown.contributions.map((contribution, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      ${parseFloat(contribution.contribution_receipt_amount).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div>
                        <div className="font-medium">{contribution.contributor_name}</div>
                        {contribution.contributor_employer && (
                          <div className="text-xs text-gray-500">{contribution.contributor_employer}</div>
                        )}
                        {contribution.contributor_occupation && (
                          <div className="text-xs text-gray-500">{contribution.contributor_occupation}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div>
                        <div className="font-medium">{contribution.committee_name}</div>
                        <div className="text-xs text-gray-500">{contribution.committee_id}</div>
                        <div className="text-xs text-gray-500">{contribution.committee_type}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(contribution.contribution_receipt_date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        contribution.source_table === 'individual_contributions' 
                          ? 'bg-blue-100 text-blue-800' 
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {contribution.source_table === 'individual_contributions' ? 'Individual' : 'Committee'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
