'use client';

import { useState, useEffect } from 'react';
import { Search, DollarSign, Calendar, Filter, Download, TrendingUp, Building, MapPin } from 'lucide-react';
import Breadcrumbs from '@/components/ui/Breadcrumbs';
import { BreadcrumbItem } from '@/types';

interface Expenditure {
  id: string;
  committee_name: string;
  committee_type: string;
  payee_name: string;
  payee_state: string;
  amount: number;
  date: string;
  purpose: string;
  category: string;
  election_year: number;
  transaction_type: string;
}

interface ExpenditureFilters {
  committee_type: string;
  payee_state: string;
  category: string;
  min_amount: string;
  max_amount: string;
  election_year: string;
  transaction_type: string;
}

export default function ExpendituresPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [expenditures, setExpenditures] = useState<Expenditure[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<ExpenditureFilters>({
    committee_type: '',
    payee_state: '',
    category: '',
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
    { label: 'Expenditures' },
  ];

  // Popular expenditure searches
  const popularSearches = [
    'California',
    'New York',
    'Texas',
    'Florida',
    'Media',
    'Consulting',
    'Advertising',
    'Travel',
    '2024',
    '2022',
  ];

  const fetchExpenditures = async () => {
    if (!searchTerm.trim()) {
      setExpenditures([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      params.append('q', searchTerm);
      params.append('page', pagination.page.toString());
      params.append('limit', pagination.limit.toString());
      
      if (filters.committee_type) params.append('committee_type', filters.committee_type);
      if (filters.payee_state) params.append('payee_state', filters.payee_state);
      if (filters.category) params.append('category', filters.category);
      if (filters.min_amount) params.append('min_amount', filters.min_amount);
      if (filters.max_amount) params.append('max_amount', filters.max_amount);
      if (filters.election_year) params.append('election_year', filters.election_year);
      if (filters.transaction_type) params.append('transaction_type', filters.transaction_type);

      const response = await fetch(`/api/expenditures?${params.toString()}`);
      const data = await response.json();

      if (data.success) {
        setExpenditures(data.data || []);
        setPagination(prev => ({
          ...prev,
          total: data.pagination?.total || 0,
          totalPages: data.pagination?.totalPages || 0,
        }));
      } else {
        setError(data.error || 'Failed to fetch expenditures');
      }
    } catch (err) {
      setError('Failed to fetch expenditures');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setPagination(prev => ({ ...prev, page: 1 }));
    fetchExpenditures();
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
      committee_type: '',
      payee_state: '',
      category: '',
      min_amount: '',
      max_amount: '',
      election_year: '',
      transaction_type: '',
    });
  };

  const getCommitteeTypeIcon = (type: string) => {
    switch (type) {
      case 'H':
        return <Building className="h-4 w-4 text-blue-600" />;
      case 'S':
        return <Building className="h-4 w-4 text-green-600" />;
      case 'P':
        return <Building className="h-4 w-4 text-purple-600" />;
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

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'MEDIA':
        return 'Media & Advertising';
      case 'CONSULTING':
        return 'Consulting Services';
      case 'TRAVEL':
        return 'Travel & Events';
      case 'ADMIN':
        return 'Administrative';
      case 'FUNDRAISING':
        return 'Fundraising';
      default:
        return category || 'Other';
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Breadcrumbs items={breadcrumbs} />
      
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Expenditure Tracking
        </h1>
        <p className="text-gray-600">
          Track and analyze campaign spending patterns and committee expenditures.
        </p>
      </div>

      {/* Search Bar */}
      <div className="mb-8">
        <div className="relative max-w-2xl">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search expenditures by committee, payee, or purpose..."
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
          <p className="text-sm text-gray-600 mb-2">Popular expenditure searches:</p>
          <div className="flex flex-wrap gap-2">
            {popularSearches.map((search, index) => (
              <button
                key={index}
                onClick={() => {
                  setSearchTerm(search);
                  fetchExpenditures();
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
              Payee State
            </label>
            <input
              type="text"
              placeholder="State..."
              value={filters.payee_state}
              onChange={(e) => setFilters({ ...filters, payee_state: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category
            </label>
            <select
              value={filters.category}
              onChange={(e) => setFilters({ ...filters, category: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Categories</option>
              <option value="MEDIA">Media & Advertising</option>
              <option value="CONSULTING">Consulting Services</option>
              <option value="TRAVEL">Travel & Events</option>
              <option value="ADMIN">Administrative</option>
              <option value="FUNDRAISING">Fundraising</option>
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
              <option value="10">Operating Expenditure</option>
              <option value="11">Independent Expenditure</option>
              <option value="12">Coordinated Expenditure</option>
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
            <p className="mt-4 text-gray-600">Searching expenditures...</p>
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

        {!loading && !error && expenditures.length > 0 && (
          <>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {pagination.total} expenditures found
              </h3>
              <button className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
                <Download className="h-4 w-4 mr-2" />
                Export Results
              </button>
            </div>

            <div className="space-y-4">
              {expenditures.map((expenditure) => (
                <div key={expenditure.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        {getCommitteeTypeIcon(expenditure.committee_type)}
                        <h4 className="text-lg font-semibold text-gray-900">
                          {expenditure.committee_name}
                        </h4>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">
                        {getCommitteeTypeLabel(expenditure.committee_type)}
                      </p>
                      <div className="flex items-center space-x-4 text-sm text-gray-600 mb-2">
                        <div className="flex items-center">
                          <MapPin className="h-4 w-4 mr-1" />
                          <span>{expenditure.payee_state}</span>
                        </div>
                        <span>•</span>
                        <span>{getCategoryLabel(expenditure.category)}</span>
                      </div>
                      <div className="flex items-center space-x-2 text-sm text-gray-500">
                        <Calendar className="h-4 w-4" />
                        <span>{formatDate(expenditure.date)}</span>
                        <span>•</span>
                        <span>{expenditure.election_year}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-red-600">
                        {formatCurrency(expenditure.amount)}
                      </p>
                    </div>
                  </div>

                  <div className="border-t border-gray-200 pt-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">
                          {expenditure.payee_name}
                        </p>
                        <p className="text-sm text-gray-600 mt-1">
                          {expenditure.purpose}
                        </p>
                      </div>
                      <div className="text-right text-sm text-gray-500">
                        <p>Type: {expenditure.transaction_type}</p>
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

        {!loading && !error && expenditures.length === 0 && searchTerm && (
          <div className="text-center py-8">
            <p className="text-gray-500">No expenditures found for "{searchTerm}"</p>
            <p className="text-sm text-gray-400 mt-2">Try adjusting your search terms or filters</p>
          </div>
        )}
      </div>

      {/* Data Source Note */}
      <div className="mt-8 p-4 bg-gray-50 rounded-lg">
        <h3 className="text-sm font-medium text-gray-800 mb-2">Data Source</h3>
        <p className="text-sm text-gray-600">
          Expenditure data comes from Federal Election Commission operating expenditure filings. 
          Data includes committee spending, payee information, amounts, and purposes for all 
          federal elections.
        </p>
      </div>
    </div>
  );
} 