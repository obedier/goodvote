'use client';

import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, TrendingUp, TrendingDown, DollarSign, Users, Calendar, MapPin, Building, Tag } from 'lucide-react';

interface IsraelLobbyScore {
  candidate_id: string;
  person_id: string;
  candidate_name: string;
  state: string;
  district?: string;
  office: string;
  party: string;
  election_year: number;
  
  total_pro_israel_contributions: number;
  pro_israel_pac_count: number;
  pro_israel_contribution_amount: number;
  pro_israel_superpac_amount: number;
  
  lobby_score: number;
  lobby_grade: 'A' | 'B' | 'C' | 'D' | 'F';
  lobby_category: 'High Support' | 'Moderate Support' | 'Low Support' | 'No Support' | 'Unknown';
  humanity_score: number; // 0-5 scale
  
  pac_contributions: Array<{
    pac_id: string;
    pac_name: string;
    amount: number;
    contribution_date: string;
  }>;
  
  superpac_expenditures: Array<{
    committee_id: string;
    committee_name: string;
    amount: number;
    support_oppose: 'SUPPORT' | 'OPPOSE';
    expenditure_date: string;
  }>;
  
  operating_expenditures: Array<{
    committee_id: string;
    committee_name: string;
    amount: number;
    purpose: string;
    category: string;
    category_desc: string;
    expenditure_date: string;
  }>;
  
  other_transactions: Array<{
    committee_id: string;
    committee_name: string;
    amount: number;
    transaction_type: string;
    transaction_date: string;
  }>;
}

interface BreadcrumbItem {
  label: string;
  href: string;
}

export default function IsraelLobbyPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const personId = params.personId as string;
  const electionYear = searchParams.get('election_year') ? parseInt(searchParams.get('election_year')!) : 2024;
  
  const [israelLobbyData, setIsraelLobbyData] = useState<IsraelLobbyScore | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const breadcrumbs: BreadcrumbItem[] = [
    { label: 'Candidates', href: '/candidates' },
    { label: 'Israel Lobby Analysis', href: '/israel-lobby' },
    { label: israelLobbyData?.candidate_name || 'Candidate', href: '#' }
  ];

  const fetchIsraelLobbyData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const url = `/api/israel-lobby/${personId}?election_year=${electionYear}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error('Failed to fetch Israel lobby data');
      }
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch Israel lobby data');
      }
      
      setIsraelLobbyData(data.data);
    } catch (err) {
      console.error('Error fetching Israel lobby data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch Israel lobby data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (personId) {
      fetchIsraelLobbyData();
    }
  }, [personId, electionYear]);

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'A': return 'bg-red-100 text-red-800 border-red-200';
      case 'B': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'C': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'D': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'F': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'High Support': return 'bg-red-100 text-red-800';
      case 'Moderate Support': return 'bg-orange-100 text-orange-800';
      case 'Low Support': return 'bg-yellow-100 text-yellow-800';
      case 'No Support': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getHumanityScoreColor = (score: number) => {
    // Color gradient: 0=red (worst), 5=green (best)
    switch (score) {
      case 0: return 'bg-red-500 text-white';
      case 1: return 'bg-orange-500 text-white';
      case 2: return 'bg-yellow-500 text-white';
      case 3: return 'bg-blue-500 text-white';
      case 4: return 'bg-green-500 text-white';
      case 5: return 'bg-green-600 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading Israel lobby analysis...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <div className="text-red-600 text-xl font-semibold mb-4">Error</div>
            <p className="text-gray-600">{error}</p>
            <button
              onClick={fetchIsraelLobbyData}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!israelLobbyData) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <p className="text-gray-600">No Israel lobby data found</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Breadcrumbs */}
          <nav className="flex mb-4" aria-label="Breadcrumb">
            <ol className="flex items-center space-x-4">
              {breadcrumbs.map((item, index) => (
                <li key={index}>
                  {index === breadcrumbs.length - 1 ? (
                    <span className="text-gray-500">{item.label}</span>
                  ) : (
                    <Link href={item.href} className="text-blue-600 hover:text-blue-800">
                      {item.label}
                    </Link>
                  )}
                  {index < breadcrumbs.length - 1 && (
                    <span className="mx-2 text-gray-400">/</span>
                  )}
                </li>
              ))}
            </ol>
          </nav>

          {/* Title */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Israel Lobby Analysis
              </h1>
              <p className="mt-2 text-gray-600">
                {israelLobbyData.candidate_name} • {israelLobbyData.state}
                {israelLobbyData.district && ` • District ${israelLobbyData.district}`}
              </p>
            </div>
            <Link
              href={`/candidates/${personId}?election_year=${electionYear}`}
              className="flex items-center text-blue-600 hover:text-blue-800"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Candidate
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Score Summary */}
        <div className="bg-white rounded-lg shadow mb-8">
          <div className="px-6 py-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {/* Humanity Score - Prominent Display */}
              <div className="text-center">
                <div className={`text-5xl font-bold mb-2 inline-flex items-center justify-center w-20 h-20 rounded-full ${getHumanityScoreColor(israelLobbyData.humanity_score)}`}>
                  {israelLobbyData.humanity_score}
                </div>
                <div className="text-lg font-semibold text-gray-900 mb-1">Humanity Score</div>
                <div className="text-sm text-gray-600">0=Worst, 5=Best</div>
                <div className="mt-2 text-sm text-gray-500">
                  {israelLobbyData.humanity_score === 0 ? 'High Pro-Israel Support' :
                   israelLobbyData.humanity_score === 5 ? 'No Pro-Israel Support' :
                   `${5 - israelLobbyData.humanity_score}/5 Pro-Israel Support`}
                </div>
              </div>

              {/* Lobby Score */}
              <div className="text-center">
                <div className="text-4xl font-bold text-gray-900 mb-2">
                  {israelLobbyData.lobby_score}
                </div>
                <div className="text-sm text-gray-600">Lobby Score (0-100)</div>
                <div className={`mt-2 inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getGradeColor(israelLobbyData.lobby_grade)}`}>
                  Grade {israelLobbyData.lobby_grade}
                </div>
              </div>

              {/* Category */}
              <div className="text-center">
                <div className="text-2xl font-semibold text-gray-900 mb-2">
                  {israelLobbyData.lobby_category}
                </div>
                <div className="text-sm text-gray-600">Support Level</div>
                <div className={`mt-2 inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getCategoryColor(israelLobbyData.lobby_category)}`}>
                  {israelLobbyData.lobby_category}
                </div>
              </div>

              {/* Total Contributions */}
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900 mb-2">
                  {formatCurrency(israelLobbyData.total_pro_israel_contributions)}
                </div>
                <div className="text-sm text-gray-600">Total Pro-Israel Contributions</div>
                <div className="mt-2 text-sm text-gray-500">
                  {israelLobbyData.pro_israel_pac_count} PACs
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Detailed Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* PAC Contributions */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <DollarSign className="w-5 h-5 mr-2" />
                PAC Contributions
              </h3>
            </div>
            <div className="p-6">
              {israelLobbyData.pac_contributions.length > 0 ? (
                <div className="space-y-4">
                  {israelLobbyData.pac_contributions.map((pac, index) => (
                    <div key={index} className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                      <div>
                        <div className="font-medium text-gray-900">{pac.pac_name}</div>
                        <div className="text-sm text-gray-500">{pac.contribution_date}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-gray-900">
                          {formatCurrency(pac.amount)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No PAC contributions found
                </div>
              )}
            </div>
          </div>

          {/* SuperPAC Expenditures */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <TrendingUp className="w-5 h-5 mr-2" />
                SuperPAC Expenditures
              </h3>
            </div>
            <div className="p-6">
              {israelLobbyData.superpac_expenditures.length > 0 ? (
                <div className="space-y-4">
                  {israelLobbyData.superpac_expenditures.map((exp, index) => (
                    <div key={index} className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                      <div>
                        <div className="font-medium text-gray-900">{exp.committee_name}</div>
                        <div className="text-sm text-gray-500">{exp.expenditure_date}</div>
                        <div className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                          exp.support_oppose === 'SUPPORT' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {exp.support_oppose}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-gray-900">
                          {formatCurrency(exp.amount)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No SuperPAC expenditures found
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Additional Spending Details */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
          {/* Operating Expenditures */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <Building className="w-5 h-5 mr-2" />
                Operating Expenditures
              </h3>
            </div>
            <div className="p-6">
              {israelLobbyData.operating_expenditures && israelLobbyData.operating_expenditures.length > 0 ? (
                <div className="space-y-4">
                  {israelLobbyData.operating_expenditures.map((exp, index) => (
                    <div key={index} className="flex justify-between items-start p-4 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{exp.committee_name}</div>
                        <div className="text-sm text-gray-600 mt-1">{exp.purpose}</div>
                        <div className="text-xs text-gray-500 mt-1">{exp.category_desc}</div>
                        <div className="text-xs text-gray-400 mt-1">{exp.expenditure_date}</div>
                      </div>
                      <div className="text-right ml-4">
                        <div className="font-semibold text-gray-900">
                          {formatCurrency(exp.amount)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No operating expenditures found
                </div>
              )}
            </div>
          </div>

          {/* Other Transactions */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <Tag className="w-5 h-5 mr-2" />
                Other Transactions
              </h3>
            </div>
            <div className="p-6">
              {israelLobbyData.other_transactions && israelLobbyData.other_transactions.length > 0 ? (
                <div className="space-y-4">
                  {israelLobbyData.other_transactions.map((trans, index) => (
                    <div key={index} className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                      <div>
                        <div className="font-medium text-gray-900">{trans.committee_name}</div>
                        <div className="text-sm text-gray-500">Type: {trans.transaction_type}</div>
                        <div className="text-xs text-gray-400">{trans.transaction_date}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-gray-900">
                          {formatCurrency(trans.amount)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No other transactions found
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Methodology */}
        <div className="mt-8 bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Methodology</h3>
          </div>
          <div className="p-6">
            <div className="prose max-w-none">
              <p className="text-gray-600 mb-4">
                This analysis tracks contributions from pro-Israel organizations including:
              </p>
              <ul className="list-disc list-inside text-gray-600 mb-4">
                <li>AIPAC PAC and affiliated organizations</li>
                <li>United Democracy Project (UDP)</li>
                <li>DMFI PAC and other pro-Israel committees</li>
                <li>Republican Jewish Coalition PAC</li>
                <li>NORPAC and other Jewish community PACs</li>
              </ul>
              <p className="text-gray-600">
                <strong>Scoring:</strong> Higher scores indicate more pro-Israel support. 
                Grade A (80-100): High Support, Grade F (0): No Support.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 