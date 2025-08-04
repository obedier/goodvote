'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft,
  Search,
  Filter,
  Download,
  Users,
  Building,
  MapPin,
  DollarSign
} from 'lucide-react';
import Breadcrumbs from '@/components/ui/Breadcrumbs';
import { BreadcrumbItem } from '@/types';

interface Contributor {
  name: string;
  location: string;
  employer: string;
  occupation: string;
  amount: number;
  count: number;
  type: string;
  committee_name?: string;
  committee_type?: string;
  committee_id?: string;
}

interface CandidateInfo {
  person_id: string;
  display_name: string;
  state: string;
  current_office: string;
  current_district: string;
  current_party: string;
  cand_id: string;
}

export default function ContributorsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const candidateId = searchParams.get('candidate');
  const electionYear = searchParams.get('election_year') ? parseInt(searchParams.get('election_year')!) : 2024;
  
  const [contributors, setContributors] = useState<Contributor[]>([]);
  const [candidateInfo, setCandidateInfo] = useState<CandidateInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'individual' | 'committee'>('all');
  const [sortBy, setSortBy] = useState<'amount' | 'count' | 'name'>('amount');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  console.log('Component rendered with:', { candidateId, electionYear, loading, error });

  const breadcrumbs: BreadcrumbItem[] = [
    { label: 'Candidates', href: '/candidates' },
    { label: candidateInfo?.display_name || 'Loading...', href: candidateInfo ? `/candidates/${candidateInfo.person_id}` : '#' },
    { label: 'Contributors' },
  ];

  useEffect(() => {
    console.log('useEffect triggered with candidateId:', candidateId, 'electionYear:', electionYear);
    if (candidateId) {
      console.log('Starting to fetch data...');
      fetchContributors();
      fetchCandidateInfo();
    }
  }, [candidateId, electionYear]);

  const fetchCandidateInfo = async () => {
    try {
      console.log('Fetching candidate info for:', candidateId);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      const response = await fetch(`/api/candidates/${candidateId}`, {
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      if (response.ok) {
        const data = await response.json();
        console.log('Candidate info response:', data);
        if (data.success) {
          setCandidateInfo(data.data);
        }
      }
    } catch (error) {
      console.error('Error fetching candidate info:', error);
    } finally {
      console.log('Candidate info fetch completed');
    }
  };

  const fetchContributors = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const url = `/api/contributors?candidate=${candidateId}&election_year=${electionYear}`;
      console.log('Fetching contributors from:', url);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
      
      const response = await fetch(url, {
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch contributors: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Contributors API response:', data);
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch contributors');
      }
      
      if (!data.data || !Array.isArray(data.data)) {
        throw new Error('Invalid data format received');
      }
      
      console.log('Setting contributors:', data.data.length);
      setContributors(data.data);
    } catch (err) {
      console.error('Error fetching contributors:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch contributors');
    } finally {
      console.log('Setting loading to false');
      setLoading(false);
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

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
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

  // Filter and sort contributors
  const filteredContributors = contributors
    .filter(contributor => {
      const matchesSearch = contributor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           contributor.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           contributor.employer?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesType = filterType === 'all' || 
                         (filterType === 'individual' && contributor.type === 'Individual') ||
                         (filterType === 'committee' && contributor.type === 'Committee');
      
      return matchesSearch && matchesType;
    })
    .sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'amount':
          comparison = b.amount - a.amount;
          break;
        case 'count':
          comparison = b.count - a.count;
          break;
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
      }
      
      return sortOrder === 'desc' ? comparison : -comparison;
    });

  if (loading) {
    console.log('Rendering loading state...');
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading contributors...</p>
            <p className="mt-2 text-sm text-gray-500">Debug: {candidateId} - {electionYear}</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !candidateInfo) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <p className="text-red-600">Error: {error || 'Candidate not found'}</p>
            <button
              onClick={fetchContributors}
              className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Breadcrumbs items={breadcrumbs} />
        
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-2">
                <Link
                  href={`/candidates/${candidateInfo.person_id}`}
                  className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
                >
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  Back to Candidate
                </Link>
              </div>
              
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Contributors for {candidateInfo.display_name}
              </h1>
              
              <div className="flex items-center space-x-4 text-gray-600 mb-4">
                <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getPartyBgColor(candidateInfo.current_party)} ${getPartyColor(candidateInfo.current_party)}`}>
                  {candidateInfo.current_party === 'DEM' ? 'Democrat' : candidateInfo.current_party === 'REP' ? 'Republican' : candidateInfo.current_party}
                </span>
                <span className="flex items-center">
                  <MapPin className="h-4 w-4 mr-1" />
                  {candidateInfo.state} - {getOfficeLabel(candidateInfo.current_office)} {candidateInfo.current_district}
                </span>
                <span className="flex items-center">
                  <Building className="h-4 w-4 mr-1" />
                  FEC ID: {candidateInfo.cand_id}
                </span>
                <span className="flex items-center">
                  <DollarSign className="h-4 w-4 mr-1" />
                  {electionYear} Election
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search contributors by name, location, or employer..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            
            <div className="flex gap-4">
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as 'all' | 'individual' | 'committee')}
                className="px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Types</option>
                <option value="individual">Individuals</option>
                <option value="committee">Committees</option>
              </select>
              
              <select
                value={`${sortBy}-${sortOrder}`}
                onChange={(e) => {
                  const [field, order] = e.target.value.split('-');
                  setSortBy(field as 'amount' | 'count' | 'name');
                  setSortOrder(order as 'asc' | 'desc');
                }}
                className="px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="amount-desc">Amount (High to Low)</option>
                <option value="amount-asc">Amount (Low to High)</option>
                <option value="count-desc">Count (High to Low)</option>
                <option value="count-asc">Count (Low to High)</option>
                <option value="name-asc">Name (A-Z)</option>
                <option value="name-desc">Name (Z-A)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Results Summary */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium text-gray-900">
              Contributors ({formatNumber(filteredContributors.length)} of {formatNumber(contributors.length)})
            </h2>
            <button className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded text-blue-700 bg-blue-100 hover:bg-blue-200">
              <Download className="h-4 w-4 mr-1" />
              Export CSV
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {formatCurrency(filteredContributors.reduce((sum, c) => sum + c.amount, 0))}
              </div>
              <div className="text-sm text-gray-600">Total Amount</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {formatNumber(filteredContributors.reduce((sum, c) => sum + c.count, 0))}
              </div>
              <div className="text-sm text-gray-600">Total Contributions</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">
                {formatNumber(filteredContributors.length)}
              </div>
              <div className="text-sm text-gray-600">Unique Contributors</div>
            </div>
          </div>
        </div>

        {/* Contributors Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/3">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Count</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredContributors.map((contributor, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    <div className="max-w-xs truncate" title={contributor.name}>
                      {contributor.name}
                    </div>
                    {contributor.type === 'Committee' && contributor.committee_type && (
                      <div className="text-xs text-gray-500 mt-1">
                        {contributor.committee_type} • {contributor.committee_id}
                      </div>
                    )}
                    {contributor.type === 'Individual' && contributor.employer && (
                      <div className="text-xs text-gray-500 mt-1">
                        {contributor.employer}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {contributor.location}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      contributor.type === 'Individual' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                    }`}>
                      {contributor.type}
                    </span>
                    {contributor.type === 'Committee' && contributor.committee_id && (
                      <div className="mt-1">
                        <a
                          href={`https://www.fec.gov/data/committee/${contributor.committee_id}/`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:text-blue-800"
                        >
                          View on FEC →
                        </a>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                    {formatCurrency(contributor.amount)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                    {contributor.count}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {filteredContributors.length === 0 && (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No contributors found matching your criteria.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 