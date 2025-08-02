'use client';

import { useState, useEffect } from 'react';
import { Search, DollarSign, MapPin, Calendar, Filter, Download, TrendingUp } from 'lucide-react';
import Breadcrumbs from '@/components/ui/Breadcrumbs';
import { BreadcrumbItem } from '@/types';

interface Donor {
  id: string;
  name: string;
  state: string;
  occupation: string;
  employer: string;
  total_contributions: number;
  contribution_count: number;
  top_recipients: Array<{
    committee_name: string;
    amount: number;
    election_year: number;
  }>;
  recent_contributions: Array<{
    date: string;
    amount: number;
    committee_name: string;
    election_year: number;
  }>;
}

interface DonorFilters {
  state: string;
  occupation: string;
  employer: string;
  min_amount: string;
  max_amount: string;
  election_year: string;
}

export default function DonorsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [donors, setDonors] = useState<Donor[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<DonorFilters>({
    state: '',
    occupation: '',
    employer: '',
    min_amount: '',
    max_amount: '',
    election_year: '',
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
  });

  const breadcrumbs: BreadcrumbItem[] = [
    { label: 'Donors' },
  ];

  // Popular donor searches
  const popularDonors = [
    'George Soros',
    'Sheldon Adelson',
    'Tom Steyer',
    'Michael Bloomberg',
    'Charles Koch',
    'California',
    'New York',
    'Texas',
    'Florida',
  ];

  const fetchDonors = async () => {
    if (!searchTerm.trim()) {
      setDonors([]);
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
      if (filters.min_amount) params.append('min_amount', filters.min_amount);
      if (filters.max_amount) params.append('max_amount', filters.max_amount);
      if (filters.election_year) params.append('election_year', filters.election_year);

      const response = await fetch(`/api/donors?${params.toString()}`);
      const data = await response.json();

      if (data.success) {
        setDonors(data.data || []);
        setPagination(prev => ({
          ...prev,
          total: data.pagination?.total || 0,
          totalPages: data.pagination?.totalPages || 0,
        }));
      } else {
        setError(data.error || 'Failed to fetch donors');
      }
    } catch (err) {
      setError('Failed to fetch donors');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setPagination(prev => ({ ...prev, page: 1 }));
    fetchDonors();
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

  const resetFilters = () => {
    setFilters({
      state: '',
      occupation: '',
      employer: '',
      min_amount: '',
      max_amount: '',
      election_year: '',
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Breadcrumbs items={breadcrumbs} />
      
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Donor Lookup
        </h1>
        <p className="text-gray-600">
          Search and analyze individual campaign contributions and donor patterns.
        </p>
      </div>

      {/* Search Bar */}
      <div className="mb-8">
        <div className="relative max-w-2xl">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search donors by name, occupation, or employer..."
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
          <p className="text-sm text-gray-600 mb-2">Popular donor searches:</p>
          <div className="flex flex-wrap gap-2">
            {popularDonors.map((donor, index) => (
              <button
                key={index}
                onClick={() => {
                  setSearchTerm(donor);
                  fetchDonors();
                }}
                className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200"
              >
                {donor}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Filters</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
            <p className="mt-4 text-gray-600">Searching donors...</p>
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

        {!loading && !error && donors.length > 0 && (
          <>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {pagination.total} donors found
              </h3>
              <button className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
                <Download className="h-4 w-4 mr-2" />
                Export Results
              </button>
            </div>

            <div className="space-y-6">
              {donors.map((donor) => (
                <div key={donor.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h4 className="text-xl font-semibold text-gray-900 mb-2">
                        {donor.name}
                      </h4>
                      <div className="flex items-center space-x-4 text-sm text-gray-600">
                        {donor.state && (
                          <div className="flex items-center">
                            <MapPin className="h-4 w-4 mr-1" />
                            {donor.state}
                          </div>
                        )}
                        {donor.occupation && (
                          <span>{donor.occupation}</span>
                        )}
                        {donor.employer && (
                          <span>at {donor.employer}</span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-green-600">
                        {formatCurrency(donor.total_contributions)}
                      </p>
                      <p className="text-sm text-gray-500">
                        {donor.contribution_count} contributions
                      </p>
                    </div>
                  </div>

                  {/* Top Recipients */}
                  {donor.top_recipients && donor.top_recipients.length > 0 && (
                    <div className="mb-4">
                      <h5 className="text-sm font-medium text-gray-900 mb-2">Top Recipients</h5>
                      <div className="space-y-2">
                        {donor.top_recipients.slice(0, 3).map((recipient, index) => (
                          <div key={index} className="flex justify-between items-center text-sm">
                            <span className="text-gray-700">{recipient.committee_name}</span>
                            <span className="text-gray-900 font-medium">
                              {formatCurrency(recipient.amount)} ({recipient.election_year})
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Recent Contributions */}
                  {donor.recent_contributions && donor.recent_contributions.length > 0 && (
                    <div>
                      <h5 className="text-sm font-medium text-gray-900 mb-2">Recent Contributions</h5>
                      <div className="space-y-2">
                        {donor.recent_contributions.slice(0, 3).map((contribution, index) => (
                          <div key={index} className="flex justify-between items-center text-sm">
                            <div>
                              <span className="text-gray-700">{contribution.committee_name}</span>
                              <span className="text-gray-500 ml-2">{contribution.date}</span>
                            </div>
                            <span className="text-gray-900 font-medium">
                              {formatCurrency(contribution.amount)} ({contribution.election_year})
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
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

        {!loading && !error && donors.length === 0 && searchTerm && (
          <div className="text-center py-8">
            <p className="text-gray-500">No donors found for "{searchTerm}"</p>
            <p className="text-sm text-gray-400 mt-2">Try adjusting your search terms or filters</p>
          </div>
        )}
      </div>

      {/* Data Source Note */}
      <div className="mt-8 p-4 bg-gray-50 rounded-lg">
        <h3 className="text-sm font-medium text-gray-800 mb-2">Data Source</h3>
        <p className="text-sm text-gray-600">
          Donor information comes from Federal Election Commission individual contribution filings. 
          Data includes contributor names, addresses, occupations, employers, and contribution amounts 
          for all federal elections.
        </p>
      </div>
    </div>
  );
} 