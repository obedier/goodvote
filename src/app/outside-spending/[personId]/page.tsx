'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, 
  DollarSign, 
  TrendingUp, 
  Building, 
  Calendar,
  ExternalLink,
  MapPin,
  Users,
  FileText
} from 'lucide-react';
import Breadcrumbs from '@/components/ui/Breadcrumbs';
import { BreadcrumbItem } from '@/types';

interface OutsideSpendingDetail {
  cmte_id: string;
  committee_name: string;
  committee_type: string;
  state: string;
  total_amount: string;
  contribution_count: string;
  first_contribution_date: string;
  last_contribution_date: string;
  support_oppose: 'SUPPORT' | 'OPPOSE';
  transaction_types: string;
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

export default function OutsideSpendingPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const personId = params.personId as string;
  const electionYear = parseInt(searchParams.get('election_year') || '2024');
  const spendingType = searchParams.get('type') || 'for';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [candidateInfo, setCandidateInfo] = useState<CandidateInfo | null>(null);
  const [spendingDetails, setSpendingDetails] = useState<OutsideSpendingDetail[]>([]);
  const [totalAmount, setTotalAmount] = useState(0);
  const [totalContributions, setTotalContributions] = useState(0);
  const [committeeCount, setCommitteeCount] = useState(0);

  const breadcrumbs: BreadcrumbItem[] = [
    { label: 'Candidates', href: '/candidates' },
    { label: candidateInfo?.display_name || 'Loading...', href: `/candidates/${personId}` },
    { label: 'Outside Spending Details', href: '#' },
  ];

  const fetchOutsideSpendingDetails = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('Fetching outside spending details for:', personId, electionYear, spendingType);

      const response = await fetch(`/api/outside-spending/${personId}?election_year=${electionYear}&type=${spendingType}`);

      if (!response.ok) {
        throw new Error('Failed to fetch outside spending details');
      }

      const data = await response.json();
      console.log('API response:', data);

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch outside spending details');
      }
      
      setCandidateInfo(data.candidate_info);
      setSpendingDetails(data.spending_details || []);
      setTotalAmount(data.total_amount || 0);
      setTotalContributions(data.total_contributions || 0);
      setCommitteeCount(data.committee_count || 0);
      
      console.log('State updated successfully');
    } catch (err) {
      console.error('Error fetching outside spending details:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch outside spending details');
    } finally {
      setLoading(false);
    }
  }, [personId, electionYear, spendingType]);

  useEffect(() => {
    fetchOutsideSpendingDetails();
  }, [fetchOutsideSpendingDetails]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    try {
      // Handle FEC date format (MMDDYYYY)
      if (dateString && dateString.length === 8) {
        const month = dateString.substring(0, 2);
        const day = dateString.substring(2, 4);
        const year = dateString.substring(4, 8);
        const date = new Date(`${year}-${month}-${day}`);
        return date.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        });
      }
      // Fallback to standard date parsing
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (error) {
      console.error('Error formatting date:', dateString, error);
      return dateString; // Return original string if parsing fails
    }
  };

  const getPartyColor = (party: string) => {
    return party === 'DEM' ? 'text-blue-600' : party === 'REP' ? 'text-red-600' : 'text-gray-600';
  };

  const getPartyBgColor = (party: string) => {
    return party === 'DEM' ? 'bg-blue-100' : party === 'REP' ? 'bg-red-100' : 'bg-gray-100';
  };

  const getOfficeLabel = (office: string) => {
    return office === 'S' ? 'Senate' : office === 'H' ? 'House' : office;
  };

  const getSpendingTypeLabel = () => {
    return spendingType === 'for' ? 'FOR' : 'AGAINST';
  };

  const getSpendingTypeColor = () => {
    return spendingType === 'for' ? 'green' : 'red';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-700 dark:text-gray-300">Loading outside spending details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !candidateInfo) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <p className="text-red-600 dark:text-red-400">Error: {error || 'Candidate not found'}</p>
            <button
              onClick={fetchOutsideSpendingDetails}
              className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Breadcrumbs items={breadcrumbs} />
        
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-8">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <Link
                  href={`/candidates/${personId}`}
                  className="inline-flex items-center text-sm text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                >
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  Back to Candidate Profile
                </Link>
              </div>
              
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                Outside Spending {getSpendingTypeLabel()} {candidateInfo.display_name}
              </h1>
              
              <div className="flex items-center space-x-4 text-gray-700 dark:text-gray-300 mb-4">
                <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getPartyBgColor(candidateInfo.current_party)} ${getPartyColor(candidateInfo.current_party)}`}>
                  {candidateInfo.current_party === 'DEM' ? 'Democrat' : candidateInfo.current_party === 'REP' ? 'Republican' : candidateInfo.current_party}
                </span>
                <span className="flex items-center">
                  <MapPin className="h-4 w-4 mr-1" />
                  {candidateInfo.state} - {getOfficeLabel(candidateInfo.current_office)} {candidateInfo.current_district}
                </span>
                <span className="flex items-center">
                  <Calendar className="h-4 w-4 mr-1" />
                  {candidateInfo.election_year}
                </span>
              </div>

              {/* Summary Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(totalAmount)}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Total Spending {getSpendingTypeLabel()}</div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">{committeeCount}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Committees</div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">{totalContributions}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Total Transactions</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Spending Details */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white">
              Committee Spending Details
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Detailed breakdown of outside spending {getSpendingTypeLabel().toLowerCase()} {candidateInfo.display_name}
            </p>
          </div>

          {spendingDetails.length === 0 ? (
            <div className="p-6 text-center">
              <p className="text-gray-500 dark:text-gray-400">No outside spending details found for this period.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Committee
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Total Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Contributions
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Date Range
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {spendingDetails.map((detail, index) => (
                    <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {detail.committee_name}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {detail.cmte_id}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-600 text-gray-800 dark:text-gray-200">
                          {detail.committee_type}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {formatCurrency(parseFloat(detail.total_amount))}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Link
                          href={`/outside-spending/${personId}/transactions/${detail.cmte_id}?election_year=${electionYear}&type=${spendingType}`}
                          className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 cursor-pointer"
                        >
                          {detail.contribution_count}
                        </Link>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        <div>
                          <div>From: {formatDate(detail.first_contribution_date)}</div>
                          <div>To: {formatDate(detail.last_contribution_date)}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <a
                          href={`https://www.fec.gov/data/committee/${detail.cmte_id}/`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
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