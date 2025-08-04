'use client';

import { useState, useEffect } from 'react';
import { Search, DollarSign, Calendar, Filter, Download, TrendingUp, Users, Building } from 'lucide-react';
import Breadcrumbs from '@/components/ui/Breadcrumbs';
import { BreadcrumbItem } from '@/types';

interface Contribution {
  id: string;
  contributor_name: string;
  contributor_state: string;
  contributor_occupation: string;
  contributor_employer: string;
  amount: number;
  date: string;
  committee_name: string;
  committee_type: string;
  election_year: number;
  transaction_type: string;
}

interface ContributionFilters {
  state: string;
  occupation: string;
  employer: string;
  committee_type: string;
  min_amount: string;
  max_amount: string;
  election_year: string;
  transaction_type: string;
}

export default function ContributionsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<ContributionFilters>({
    state: '',
    occupation: '',
    employer: '',
    committee_type: '',
    min_amount: '',
    max_amount: '',
    election_year: '',
    transaction_type: '',
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
  });

  const breadcrumbs: BreadcrumbItem[] = [
    { label: 'Contributions' },
  ];

  // Popular contribution searches
  const popularSearches = [
    'California',
    'New York',
    'Texas',
    'Florida',
    'Healthcare',
    'Technology',
    'Finance',
    'Education',
    '2024',
    '2022',
  ];

  const fetchContributions = async () => {
    if (!searchTerm.trim()) {
      setContributions([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      params.append('q', searchTerm);
      params.append('page', pagination.page.toString());
      params.append('limit', pagination.limit.toString());
      
      if (filters.state) params.append('state', filters.state);
      if (filters.occupation) params.append('occupation', filters.occupation);
      if (filters.employer) params.append('employer', filters.employer);
      if (filters.committee_type) params.append('committee_type', filters.committee_type);
      if (filters.min_amount) params.append('min_amount', filters.min_amount);
      if (filters.max_amount) params.append('max_amount', filters.max_amount);
      if (filters.election_year) params.append('election_year', filters.election_year);
      if (filters.transaction_type) params.append('transaction_type', filters.transaction_type);

      const response = await fetch(`/api/contributions?${params.toString()}`);
      const data = await response.json();

      if (data.success) {
        setContributions(data.data || []);
        setPagination(prev => ({
          ...prev,
          total: data.pagination?.total || 0,
          totalPages: data.pagination?.totalPages || 0,
        }));
      } else {
        setError(data.error || 'Failed to fetch contributions');
      }
    } catch (err) {
      setError('Failed to fetch contributions');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setPagination(prev => ({ ...prev, page: 1 }));
    fetchContributions();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const resetFilters = () => {
    setFilters({
      state: '',
      occupation: '',
      employer: '',
      committee_type: '',
      min_amount: '',
      max_amount: '',
      election_year: '',
      transaction_type: '',
    });
  };

  const getCommitteeTypeIcon = (type: string) => {
    switch (type) {
      case 'H':
        return <Users className="h-4 w-4 text-blue-600" />;
      case 'S':
        return <Users className="h-4 w-4 text-green-600" />;
      case 'P':
        return <Users className="h-4 w-4 text-purple-600" />;
      case 'N':
        return <Building className="h-4 w-4 text-orange-600" />;
      default:
        return <Building className="h-4 w-4 text-gray-600" />;
    }
  };

  const getCommitteeTypeLabel = (type: string) => {
    switch (type) {
      case 'H':
        return 'House Campaign';
      case 'S':
        return 'Senate Campaign';
      case 'P':
        return 'Presidential Campaign';
      case 'N':
        return 'PAC';
      default:
        return 'Other';
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Breadcrumbs items={breadcrumbs} />
      
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Contribution Search
        </h1>
        <p className="text-gray-600">
          Search and analyze individual campaign contributions with detailed filtering options.
        </p>
      </div>

      {/* Search Bar */}
      <div className="mb-8">
        <div className="relative max-w-2xl">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search contributions by donor name, occupation, or employer..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={handleKeyPress}
              className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            />
            <button
              onClick={handleSearch}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-blue-600 text-white px-4 py-1 rounded-md hover:bg-blue-700"
            >
              Search
            </button>
          </div>
        </div>

        {/* Popular Searches */}
        <div className="mt-4">
          <p className="text-sm text-gray-600 mb-2">Popular contribution searches:</p>
          <div className="flex flex-wrap gap-2">
            {popularSearches.map((search, index) => (
              <button
                key={index}
                onClick={() => {
                  setSearchTerm(search);
                  fetchContributions();
                }}
                className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200"
              >
                {search}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Filters</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              State
            </label>
            <input
              type="text"
              placeholder="State..."
              value={filters.state}
              onChange={(e) => setFilters({ ...filters, state: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Occupation
            </label>
            <input
              type="text"
              placeholder="Occupation..."
              value={filters.occupation}
              onChange={(e) => setFilters({ ...filters, occupation: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Employer
            </label>
            <input
              type="text"
              placeholder="Employer..."
              value={filters.employer}
              onChange={(e) => setFilters({ ...filters, employer: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Committee Type
            </label>
            <select
              value={filters.committee_type}
              onChange={(e) => setFilters({ ...filters, committee_type: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Types</option>
              <option value="H">House Campaign</option>
              <option value="S">Senate Campaign</option>
              <option value="P">Presidential Campaign</option>
              <option value="N">PAC</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Min Amount
            </label>
            <input
              type="number"
              placeholder="Min amount..."
              value={filters.min_amount}
              onChange={(e) => setFilters({ ...filters, min_amount: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Max Amount
            </label>
            <input
              type="number"
              placeholder="Max amount..."
              value={filters.max_amount}
              onChange={(e) => setFilters({ ...filters, max_amount: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Election Year
            </label>
            <select
              value={filters.election_year}
              onChange={(e) => setFilters({ ...filters, election_year: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Years</option>
              <option value="2024">2024</option>
              <option value="2022">2022</option>
              <option value="2020">2020</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Transaction Type
            </label>
            <select
              value={filters.transaction_type}
              onChange={(e) => setFilters({ ...filters, transaction_type: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Types</option>
              <option value="15">Individual Contribution</option>
              <option value="16">Individual Contribution to Candidate</option>
              <option value="17">Individual Contribution to PAC</option>
            </select>
          </div>
        </div>

        <div className="flex justify-between items-center mt-4">
          <button
            onClick={resetFilters}
            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
          >
            Reset Filters
          </button>
          <button
            onClick={handleSearch}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            Apply Filters
          </button>
        </div>
      </div>

      {/* Results */}
      <div className="mb-8">
        {loading && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Searching contributions...</p>
          </div>
        )}

        {error && (
          <div className="text-center py-8">
            <p className="text-red-600">Error: {error}</p>
            <button
              onClick={handleSearch}
              className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
            >
              Try Again
            </button>
          </div>
        )}

        {!loading && !error && contributions.length > 0 && (
          <>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {pagination.total} contributions found
              </h3>
              <button className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
                <Download className="h-4 w-4 mr-2" />
                Export Results
              </button>
            </div>

            <div className="space-y-4">
              {contributions.map((contribution) => (
                <div key={contribution.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h4 className="text-lg font-semibold text-gray-900 mb-2">
                        {contribution.contributor_name}
                      </h4>
                      <div className="flex items-center space-x-4 text-sm text-gray-600 mb-2">
                        {contribution.contributor_state && (
                          <span>{contribution.contributor_state}</span>
                        )}
                        {contribution.contributor_occupation && (
                          <span>{contribution.contributor_occupation}</span>
                        )}
                        {contribution.contributor_employer && (
                          <span>at {contribution.contributor_employer}</span>
                        )}
                      </div>
                      <div className="flex items-center space-x-2 text-sm text-gray-500">
                        <Calendar className="h-4 w-4" />
                        <span>{formatDate(contribution.date)}</span>
                        <span>•</span>
                        <span>{contribution.election_year}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-green-600">
                        {formatCurrency(contribution.amount)}
                      </p>
                    </div>
                  </div>

                  <div className="border-t border-gray-200 pt-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        {getCommitteeTypeIcon(contribution.committee_type)}
                        <div>
                          <p className="font-medium text-gray-900">
                            {contribution.committee_name}
                          </p>
                          <p className="text-sm text-gray-500">
                            {getCommitteeTypeLabel(contribution.committee_type)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right text-sm text-gray-500">
                        <p>Transaction: {contribution.transaction_type}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="mt-6 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                    disabled={pagination.page <= 1}
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <span className="text-sm text-gray-700">
                    Page {pagination.page} of {pagination.totalPages}
                  </span>
                  <button
                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                    disabled={pagination.page >= pagination.totalPages}
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {!loading && !error && contributions.length === 0 && searchTerm && (
          <div className="text-center py-8">
            <p className="text-gray-500">No contributions found for "{searchTerm}"</p>
            <p className="text-sm text-gray-400 mt-2">Try adjusting your search terms or filters</p>
          </div>
        )}
      </div>

      {/* Data Source Note */}
      <div className="mt-8 p-4 bg-gray-50 rounded-lg">
        <h3 className="text-sm font-medium text-gray-800 mb-2">Data Source</h3>
        <p className="text-sm text-gray-600">
          Contribution data comes from Federal Election Commission individual contribution filings. 
          Data includes contributor information, amounts, dates, and recipient committees for all 
          federal elections.
        </p>
      </div>
    </div>
  );
} 