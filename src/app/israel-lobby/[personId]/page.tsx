'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Contribution {
  source_table: string;
  unique_identifier?: string;
  image_num?: string;
  fec_document_url?: string;
  election_cycle_year?: number;
  transaction_type?: string;
  transaction_type_code?: string;
  category?: string;
  contribution_receipt_amount: string;
  contributor_name?: string;
  contributor_employer?: string;
  contributor_occupation?: string;
  contribution_receipt_date: string;
  committee_name: string;
  committee_id: string;
  committee_type: string;
  committee_designation: string;
  other_committee_id?: string;
  link_id?: string;
  sub_id?: string;
  file_num?: string;
  transaction_id?: string;
  memo_code?: string;
  memo_text?: string;
  entity_type?: string;
}

interface FundingBreakdown {
  total_amount: number;
  total_count: number;
  totals_by_category: Record<string, { count: number; amount: number }>;
  contributions: Contribution[];
}

interface SummaryGroup {
  committee_name: string;
  committee_id: string;
  transaction_type: string;
  election_cycle_year: number;
  total_amount: number;
  record_count: number;
}

interface DebugInfo {
  sql: string;
  person_id: string;
  cycle_param: string;
  total_records: number;
  note?: string;
}

interface Candidate {
  person_id: string;
  fec_id: string;
  name: string;
  party: string;
  election_year: number;
}

export default function IsraelLobbyPage({ 
  params 
}: { 
  params: Promise<{ personId: string }> 
}) {
  const [personId, setPersonId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [fundingBreakdown, setFundingBreakdown] = useState<FundingBreakdown | null>(null);
  const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null);
  const [activeTab, setActiveTab] = useState<'summary' | 'detailed'>('summary');
  const [filteredContributions, setFilteredContributions] = useState<Contribution[]>([]);
  const [showFiltered, setShowFiltered] = useState(false);
  const [selectedCycle, setSelectedCycle] = useState('2024');

    useEffect(() => {
    async function loadData() {
      try {
        const { personId: id } = await params;
        setPersonId(id);
        
        const response = await fetch(`/api/israel-lobby/${id}?cycle=${selectedCycle}`);
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || 'Failed to load Israel lobby funding');
        }

        setCandidate(data.candidate);
        setFundingBreakdown(data.funding_breakdown);
        setDebugInfo(data.debug);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [params, selectedCycle]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-800">Loading Israel lobby funding data...</p>
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
          <p className="text-yellow-600 mb-4">No Israel lobby funding data available for this candidate.</p>
          <Link href="/congressional-map" className="text-blue-600 hover:text-blue-800">
            ← Back to Map
          </Link>
        </div>
      </div>
    );
  }

  const categoryColors = {
    'Individual': 'bg-blue-100 text-blue-800',
    'PAC': 'bg-green-100 text-green-800',
    'Super PAC': 'bg-purple-100 text-purple-800',
    'Other Committee': 'bg-gray-100 text-gray-800',
    'Party': 'bg-red-100 text-red-800',
    'Other Candidate': 'bg-orange-100 text-orange-800'
  };

  // Function to export contributions to CSV
  const exportToCSV = (contributions: Contribution[], filename: string) => {
    const headers = [
      'Record #',
      'Amount',
      'Election Cycle',
      'Transaction Type',
      'Transaction Type Code',
      'Committee Name',
      'Committee ID',
      'Committee Type',
      'Committee Designation',
      'Date',
      'Sub ID',
      'Image Num',
      'FEC Document URL',
      'Source Table'
    ];

    const csvContent = [
      headers.join(','),
      ...contributions.map((contribution, index) => [
        index + 1,
        parseFloat(contribution.contribution_receipt_amount).toFixed(2),
        contribution.election_cycle_year || 'N/A',
        `"${contribution.transaction_type || contribution.category || 'N/A'}"`,
        contribution.transaction_type_code || 'N/A',
        `"${contribution.committee_name}"`,
        contribution.committee_id,
        contribution.committee_type,
        contribution.committee_designation,
        contribution.contribution_receipt_date || 'N/A',
        contribution.unique_identifier || 'N/A',
        contribution.image_num || 'N/A',
        contribution.fec_document_url || 'N/A',
        contribution.source_table
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Function to filter contributions by summary group
  const filterBySummaryGroup = (committeeName: string, transactionType: string, electionCycle: number) => {
    const filtered = fundingBreakdown.contributions.filter(contribution => 
      contribution.committee_name === committeeName &&
      contribution.transaction_type === transactionType &&
      contribution.election_cycle_year === electionCycle
    );
    setFilteredContributions(filtered);
    setShowFiltered(true);
    setActiveTab('detailed');
  };

  // Create summary data grouped by committee, transaction type, and cycle
  const summaryData: SummaryGroup[] = fundingBreakdown.contributions.reduce((acc: SummaryGroup[], contribution) => {
    const key = `${contribution.committee_name}-${contribution.transaction_type}-${contribution.election_cycle_year}`;
    const existing = acc.find(item => 
      item.committee_name === contribution.committee_name &&
      item.transaction_type === contribution.transaction_type &&
      item.election_cycle_year === contribution.election_cycle_year
    );
    
    if (existing) {
      existing.total_amount += parseFloat(contribution.contribution_receipt_amount);
      existing.record_count += 1;
    } else {
      acc.push({
        committee_name: contribution.committee_name,
        committee_id: contribution.committee_id,
        transaction_type: contribution.transaction_type || 'Unknown',
        election_cycle_year: contribution.election_cycle_year || 0,
        total_amount: parseFloat(contribution.contribution_receipt_amount),
        record_count: 1
      });
    }
    
    return acc;
  }, []).sort((a, b) => b.total_amount - a.total_amount);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Israel Lobby Funding</h1>
              <p className="text-gray-800">Detailed pro-Israel funding analysis</p>
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
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">Candidate Information</h2>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">Election Cycle:</label>
              <select 
                value={selectedCycle} 
                onChange={(e) => setSelectedCycle(e.target.value)}
                className="border border-gray-300 rounded px-3 py-1 text-sm"
              >
                <option value="2020">2020</option>
                <option value="2022">2022</option>
                <option value="2024">2024</option>
                <option value="2026">2026</option>
                <option value="last3">Last 3 Cycles (2020-2024)</option>
                <option value="all">All Cycles</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Name</label>
              <p className="mt-1 text-sm text-gray-900">{candidate.name}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">FEC ID</label>
              <p className="mt-1 text-sm text-gray-900 font-mono">{candidate.fec_id}</p>
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
          
          {/* Data Source Information */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <h3 className="text-lg font-semibold text-yellow-800 mb-2">Data Source Information</h3>
            <p className="text-sm text-yellow-700 mb-2">
              <strong>Total Amount:</strong> ${fundingBreakdown.total_amount.toLocaleString()} 
              (calculated from <code className="bg-yellow-100 px-1 rounded">committee_candidate_contributions</code> table)
            </p>
            <p className="text-sm text-yellow-700 mb-2">
              <strong>Breakdown:</strong> Real individual contribution records with unique identifiers (<code className="bg-yellow-100 px-1 rounded">sub_id</code>), 
              election cycle years, and transaction types. Each record includes the source table name, committee details, and links to FEC documents.
            </p>
            <p className="text-sm text-yellow-700">
              <strong>Note:</strong> This total matches the amount shown in the congressional map and admin pages.
              Showing all records with unique identifiers to ensure data quality.
            </p>
          </div>

          {/* Debug Information */}
          {debugInfo && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Debug Information</h3>
              <div className="space-y-2 text-sm text-gray-900">
                <p><strong>Total Records:</strong> {debugInfo.total_records}</p>
                <p><strong>Person ID:</strong> {debugInfo.person_id}</p>
                <p><strong>Cycle:</strong> {debugInfo.cycle_param}</p>
                {debugInfo.note && <p><strong>Note:</strong> {debugInfo.note}</p>}
                <details className="mt-2">
                  <summary className="cursor-pointer text-blue-600 hover:text-blue-800 font-medium">
                    View SQL Query
                  </summary>
                  <textarea 
                    className="mt-2 p-3 bg-white border border-gray-300 rounded text-xs w-full min-h-[120px] font-mono text-gray-900"
                    readOnly
                    value={debugInfo.sql}
                    rows={5}
                  />
                </details>
              </div>
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-blue-900">
                ${fundingBreakdown.total_amount.toLocaleString()}
              </div>
              <div className="text-sm text-blue-700">Total Israel Lobby Funding</div>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-green-900">
                {fundingBreakdown.total_count}
              </div>
              <div className="text-sm text-green-700">Total Contributions</div>
            </div>
          </div>

          {/* Category Breakdown */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {fundingBreakdown.totals_by_category && Object.entries(fundingBreakdown.totals_by_category).map(([category, data]) => (
              <div key={category} className="bg-gray-50 rounded-lg p-4">
                <div className="text-lg font-bold text-gray-900">
                  ${data.amount?.toLocaleString() || '0'}
                </div>
                <div className="text-sm text-gray-800">{category}</div>
                <div className="text-xs text-gray-500">{data.count || 0} contributions</div>
              </div>
            ))}
          </div>
        </div>

        {/* Contributions Tabs */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              <button
                onClick={() => setActiveTab('summary')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'summary'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Summary View
              </button>
              <button
                onClick={() => setActiveTab('detailed')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'detailed'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Detailed Contributions ({fundingBreakdown.total_count} records)
              </button>
            </nav>
          </div>

          {/* Summary Tab Content */}
          {activeTab === 'summary' && (
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Summary by Committee, Transaction Type, and Cycle</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Committee
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Transaction Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Election Cycle
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Total Amount
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Record Count
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {summaryData.map((group, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div>
                            <div className="font-medium">{group.committee_name}</div>
                            <div className="text-gray-500">{group.committee_id}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {group.transaction_type}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {group.election_cycle_year}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          ${group.total_amount.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <button
                            onClick={() => filterBySummaryGroup(group.committee_name, group.transaction_type, group.election_cycle_year)}
                            className="text-blue-600 hover:text-blue-800 underline cursor-pointer"
                          >
                            {group.record_count} records
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Detailed Tab Content */}
          {activeTab === 'detailed' && (
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                                  <div>
                    <h2 className="text-xl font-bold text-gray-900">
                      {showFiltered ? 'Filtered' : 'Detailed'} Contributions
                    </h2>
                    <p className="text-sm text-gray-800 mt-1">
                      {showFiltered 
                        ? `Showing ${filteredContributions.length} filtered records from ${fundingBreakdown.total_count} total records`
                        : `Showing all pro-Israel contributions from ${fundingBreakdown.total_count} records`
                      }
                    </p>
                  </div>
                <div className="flex space-x-2">
                  {showFiltered && (
                    <button
                      onClick={() => {
                        setShowFiltered(false);
                        setFilteredContributions([]);
                      }}
                      className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                    >
                      Clear Filter
                    </button>
                  )}
                  <button
                    onClick={() => exportToCSV(
                      showFiltered ? filteredContributions : fundingBreakdown.contributions,
                      `israel-lobby-${candidate.name.replace(/\s+/g, '-')}-${showFiltered ? 'filtered' : 'all'}.csv`
                    )}
                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                  >
                    Export to CSV
                  </button>
                </div>
              </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    #
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Election Cycle
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Transaction Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Committee
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Sub ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      FEC Document
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Source Table
                    </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {(showFiltered ? filteredContributions : fundingBreakdown.contributions).map((contribution, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono font-bold">
                      #{index + 1}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      ${parseFloat(contribution.contribution_receipt_amount).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {contribution.election_cycle_year || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div>
                        <div className="font-medium">{contribution.transaction_type || contribution.category}</div>
                        {contribution.transaction_type_code && (
                          <div className="text-xs text-gray-500">Code: {contribution.transaction_type_code}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div>
                        <div className="font-medium">{contribution.committee_name}</div>
                        <div className="text-xs text-gray-500">{contribution.committee_id}</div>
                        <div className="text-xs text-gray-500">Type: {contribution.committee_type}+{contribution.committee_designation}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {contribution.contribution_receipt_date ? new Date(contribution.contribution_receipt_date).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono text-xs">
                      {contribution.unique_identifier || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {contribution.fec_document_url ? (
                        <a 
                          href={contribution.fec_document_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 underline"
                        >
                          View Document
                        </a>
                      ) : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono text-xs">
                      {contribution.source_table}
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
  );
} 