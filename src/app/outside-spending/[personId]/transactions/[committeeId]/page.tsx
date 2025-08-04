'use client';

import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ExternalLink, Calendar, MapPin, Building2 } from 'lucide-react';

interface Transaction {
  transaction_id: string;
  transaction_dt: string;
  transaction_amt: number;
  name: string;
  transaction_tp: string;
  purpose?: string;
  memo_text?: string;
}

interface CommitteeInfo {
  cmte_id: string;
  cmte_nm: string;
  cmte_tp: string;
  cmte_st: string;
}

interface CandidateInfo {
  person_id: string;
  display_name: string;
  state: string;
  current_office: string;
  current_district: string;
  current_party: string;
  election_year: number;
}

export default function TransactionsDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const personId = params.personId as string;
  const committeeId = params.committeeId as string;
  const electionYear = parseInt(searchParams.get('election_year') || '2024');
  const spendingType = searchParams.get('type') || 'for';

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [committeeInfo, setCommitteeInfo] = useState<CommitteeInfo | null>(null);
  const [candidateInfo, setCandidateInfo] = useState<CandidateInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        setLoading(true);
        const response = await fetch(
          `/api/outside-spending/${personId}/transactions/${committeeId}?election_year=${electionYear}&type=${spendingType}`
        );
        
        if (!response.ok) {
          throw new Error('Failed to fetch transactions');
        }

        const data = await response.json();
        
        if (data.success) {
          setTransactions(data.transactions || []);
          setCommitteeInfo(data.committee_info);
          setCandidateInfo(data.candidate_info);
        } else {
          setError(data.error || 'Failed to fetch transactions');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, [personId, committeeId, electionYear, spendingType]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    
    // Handle different date formats
    let date: Date;
    if (dateString.includes('/')) {
      // Format: MM/DD/YYYY
      const [month, day, year] = dateString.split('/');
      date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    } else {
      // Format: YYYYMMDD
      const year = dateString.substring(0, 4);
      const month = dateString.substring(4, 6);
      const day = dateString.substring(6, 8);
      date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    }
    
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getPartyColor = (party: string) => {
    switch (party) {
      case 'DEM':
        return 'text-blue-600 dark:text-blue-400';
      case 'REP':
        return 'text-red-600 dark:text-red-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  const getPartyBgColor = (party: string) => {
    switch (party) {
      case 'DEM':
        return 'bg-blue-100 dark:bg-blue-900';
      case 'REP':
        return 'bg-red-100 dark:bg-red-900';
      default:
        return 'bg-gray-100 dark:bg-gray-700';
    }
  };

  const getOfficeLabel = (office: string) => {
    switch (office) {
      case 'H':
        return 'House';
      case 'S':
        return 'Senate';
      case 'P':
        return 'President';
      default:
        return office;
    }
  };

  const getSpendingTypeLabel = () => {
    return spendingType === 'for' ? 'FOR' : 'AGAINST';
  };

  const getTransactionTypeLabel = (type: string) => {
    const typeLabels: { [key: string]: string } = {
      '24A': 'Independent Expenditure',
      '24E': 'Coordinated Expenditure',
      '24C': 'Communication Cost',
      '24N': 'Electioneering Communication',
      '24K': 'In-Kind Contribution',
    };
    return typeLabels[type] || type;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">Loading transactions...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <p className="text-red-600 dark:text-red-400">{error}</p>
            <Link
              href={`/outside-spending/${personId}?election_year=${electionYear}&type=${spendingType}`}
              className="mt-4 inline-flex items-center text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to Outside Spending
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!committeeInfo || !candidateInfo) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <p className="text-gray-600 dark:text-gray-400">Committee or candidate information not found.</p>
          </div>
        </div>
      </div>
    );
  }

  const totalAmount = transactions.reduce((sum, transaction) => sum + transaction.transaction_amt, 0);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <Link
              href={`/outside-spending/${personId}?election_year=${electionYear}&type=${spendingType}`}
              className="inline-flex items-center text-sm text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to Outside Spending
            </Link>
          </div>
          
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Transaction Details
          </h1>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Committee Info */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center">
                <Building2 className="h-5 w-5 mr-2" />
                Committee Information
              </h2>
              <div className="space-y-2">
                <div>
                  <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Committee:</span>
                  <div className="text-sm text-gray-900 dark:text-white">{committeeInfo.cmte_nm}</div>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-500 dark:text-gray-400">ID:</span>
                  <div className="text-sm text-gray-900 dark:text-white">{committeeInfo.cmte_id}</div>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Type:</span>
                  <div className="text-sm text-gray-900 dark:text-white">{committeeInfo.cmte_tp}</div>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-500 dark:text-gray-400">State:</span>
                  <div className="text-sm text-gray-900 dark:text-white">{committeeInfo.cmte_st}</div>
                </div>
              </div>
            </div>

            {/* Candidate Info */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center">
                <MapPin className="h-5 w-5 mr-2" />
                Candidate Information
              </h2>
              <div className="space-y-2">
                <div>
                  <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Candidate:</span>
                  <div className="text-sm text-gray-900 dark:text-white">{candidateInfo.display_name}</div>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Party:</span>
                  <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${getPartyBgColor(candidateInfo.current_party)} ${getPartyColor(candidateInfo.current_party)}`}>
                    {candidateInfo.current_party === 'DEM' ? 'Democrat' : candidateInfo.current_party === 'REP' ? 'Republican' : candidateInfo.current_party}
                  </span>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Office:</span>
                  <div className="text-sm text-gray-900 dark:text-white">
                    {getOfficeLabel(candidateInfo.current_office)} {candidateInfo.current_district}
                  </div>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Election Year:</span>
                  <div className="text-sm text-gray-900 dark:text-white">{candidateInfo.election_year}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(totalAmount)}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Total Amount</div>
            </div>
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">{transactions.length}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Transactions</div>
            </div>
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">{getSpendingTypeLabel()}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Spending Type</div>
            </div>
          </div>
        </div>

        {/* Transactions Table */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white">
              Individual Transactions
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Detailed list of all transactions from {committeeInfo.cmte_nm}
            </p>
          </div>

          {transactions.length === 0 ? (
            <div className="p-6 text-center">
              <p className="text-gray-500 dark:text-gray-400">No transactions found for this committee.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Recipient/Purpose
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Memo
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {transactions.map((transaction, index) => (
                    <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {formatDate(transaction.transaction_dt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {formatCurrency(transaction.transaction_amt)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                          {getTransactionTypeLabel(transaction.transaction_tp)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 dark:text-white">
                          {transaction.name || transaction.purpose || 'N/A'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {transaction.memo_text || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 