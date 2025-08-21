'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { Search, Users, Building, DollarSign, TrendingUp, Download, Filter } from 'lucide-react';
import Breadcrumbs from '@/components/ui/Breadcrumbs';
import { BreadcrumbItem } from '@/types';
import Link from 'next/link';

interface SearchResult {
  id: string;
  type: 'politician' | 'committee' | 'donor' | 'expenditure';
  name: string;
  description: string;
  amount?: number;
  state?: string;
  party?: string;
  election_year?: number;
}

interface SearchFilters {
  type: string;
  state: string;
  party: string;
  election_year: string;
  min_amount: string;
  max_amount: string;
}

export default function SearchPage() {
  const searchParams = useSearchParams();
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({
    type: '',
    state: '',
    party: '',
    election_year: '',
    min_amount: '',
    max_amount: '',
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
  });

  const searchInputRef = useRef<HTMLInputElement>(null);

  const breadcrumbs: BreadcrumbItem[] = [
    { label: 'Search' },
  ];

  // Popular searches for suggestions
  const popularSearches = [
    'Nancy Pelosi',
    'Mitch McConnell',
    'American Medical Association',
    'California',
    'Democrat',
    'Republican',
    '2024',
    'PAC',
    'Super PAC',
  ];

  useEffect(() => {
    if (searchTerm.length >= 2) {
      fetchSuggestions();
    } else {
      setSuggestions([]);
    }
  }, [searchTerm]);

  // Handle URL parameters on load and when they change
  useEffect(() => {
    const qParam = searchParams.get('q') || '';
    const typeParam = searchParams.get('type') || '';
    if (typeParam) {
      setFilters(prev => ({ ...prev, type: typeParam }));
    }
    if (qParam) {
      setSearchTerm(qParam);
      // Trigger initial search based on URL
      // Delay to ensure state updates before fetch
      setTimeout(() => performSearch(qParam), 0);
    }
  }, [searchParams]);

  const fetchSuggestions = async () => {
    try {
      const response = await fetch(`/api/search/suggestions?q=${encodeURIComponent(searchTerm)}`);
      const data = await response.json();
      if (data.success) {
        setSuggestions(data.data || []);
      }
    } catch (err) {
      // Fallback to popular searches
      setSuggestions(popularSearches.filter(s => s.toLowerCase().includes(searchTerm.toLowerCase())));
    }
  };

  const performSearch = async (term: string = searchTerm) => {
    if (!term.trim()) {
      setResults([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      params.append('q', term);
      params.append('page', pagination.page.toString());
      params.append('limit', pagination.limit.toString());
      
      if (filters.type) params.append('type', filters.type);
      if (filters.state) params.append('state', filters.state);
      if (filters.party) params.append('party', filters.party);
      if (filters.election_year) params.append('election_year', filters.election_year);
      if (filters.min_amount) params.append('min_amount', filters.min_amount);
      if (filters.max_amount) params.append('max_amount', filters.max_amount);

      const response = await fetch(`/api/search?${params.toString()}`);
      const data = await response.json();

      if (data.success) {
        setResults(data.data || []);
        setPagination(prev => ({
          ...prev,
          total: data.pagination?.total || 0,
          totalPages: data.pagination?.totalPages || 0,
        }));
      } else {
        setError(data.error || 'Search failed');
      }
    } catch (err) {
      setError('Search failed');
    } finally {
      setLoading(false);
      setShowSuggestions(false);
    }
  };

  const handleSearch = () => {
    setPagination(prev => ({ ...prev, page: 1 }));
    performSearch();
  };

  const handleSuggestionClick = (suggestion: string) => {
    setSearchTerm(suggestion);
    setShowSuggestions(false);
    performSearch(suggestion);
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

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'politician':
        return <Users className="h-4 w-4 text-blue-600" />;
      case 'committee':
        return <Building className="h-4 w-4 text-green-600" />;
      case 'donor':
        return <DollarSign className="h-4 w-4 text-purple-600" />;
      case 'expenditure':
        return <TrendingUp className="h-4 w-4 text-orange-600" />;
      default:
        return <Search className="h-4 w-4 text-gray-600" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'politician':
        return 'Politician';
      case 'committee':
        return 'Committee';
      case 'donor':
        return 'Donor';
      case 'expenditure':
        return 'Expenditure';
      default:
        return 'Other';
    }
  };

  const getDetailPageUrl = (result: SearchResult) => {
    switch (result.type) {
      case 'politician':
        // Politicians are candidates who won their last race
        const electionYear = result.election_year || 2024;
        return `/candidates/${result.id}?election_year=${electionYear}`;
      case 'committee':
        // Committees link to PACs page or committee detail
        return `/lobbying/pacs?committee=${result.id}`;
      case 'donor':
        // Donors link to contributors page
        return `/contributors?donor=${result.id}`;
      case 'expenditure':
        // Expenditures link to expenditures page
        return `/expenditures?expenditure=${result.id}`;
      default:
        return '#';
    }
  };

  const resetFilters = () => {
    setFilters({
      type: '',
      state: '',
      party: '',
      election_year: '',
      min_amount: '',
      max_amount: '',
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Breadcrumbs items={breadcrumbs} />
      
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Global Search
        </h1>
        <p className="text-gray-600">
          Search across all campaign finance data including politicians, committees, donors, and expenditures.
        </p>
      </div>

      {/* Search Bar */}
      <div className="mb-8">
        <div className="relative max-w-2xl">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search politicians, committees, donors, expenditures..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setShowSuggestions(true);
              }}
              onKeyPress={handleKeyPress}
              onFocus={() => setShowSuggestions(true)}
              className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            />
            <button
              onClick={handleSearch}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-blue-600 text-white px-4 py-1 rounded-md hover:bg-blue-700"
            >
              Search
            </button>
          </div>

          {/* Suggestions Dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
              {suggestions.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="w-full text-left px-4 py-2 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Popular Searches */}
        <div className="mt-4">
          <p className="text-sm text-gray-600 mb-2">Popular searches:</p>
          <div className="flex flex-wrap gap-2">
            {popularSearches.map((search, index) => (
              <button
                key={index}
                onClick={() => handleSuggestionClick(search)}
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Type
            </label>
            <select
              value={filters.type}
              onChange={(e) => setFilters({ ...filters, type: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Types</option>
              <option value="politician">Politicians</option>
              <option value="committee">Committees</option>
              <option value="donor">Donors</option>
              <option value="expenditure">Expenditures</option>
            </select>
          </div>

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
              Party
            </label>
            <select
              value={filters.party}
              onChange={(e) => setFilters({ ...filters, party: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Parties</option>
              <option value="DEM">Democrat</option>
              <option value="REP">Republican</option>
              <option value="IND">Independent</option>
            </select>
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
            <p className="mt-4 text-gray-600">Searching...</p>
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

        {!loading && !error && results.length > 0 && (
          <>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {pagination.total} results found
              </h3>
              <button className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
                <Download className="h-4 w-4 mr-2" />
                Export Results
              </button>
            </div>

            <div className="space-y-4">
              {results.map((result) => {
                const detailUrl = getDetailPageUrl(result);
                const isClickable = detailUrl !== '#';
                
                const resultContent = (
                  <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 transition-shadow ${
                    isClickable ? 'hover:shadow-md cursor-pointer' : ''
                  }`}>
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-4">
                        <div className="flex-shrink-0">
                          {getTypeIcon(result.type)}
                        </div>
                        <div>
                          <h4 className="text-lg font-semibold text-gray-900 mb-1">
                            {result.name}
                          </h4>
                          <p className="text-sm text-gray-600 mb-2">{result.description}</p>
                          <div className="flex items-center space-x-4 text-sm text-gray-500">
                            <span className="inline-block px-2 py-1 rounded-full bg-blue-100 text-blue-800 text-xs font-medium">
                              {getTypeLabel(result.type)}
                            </span>
                            {result.state && (
                              <span>{result.state}</span>
                            )}
                            {result.party && (
                              <span>{result.party}</span>
                            )}
                            {result.election_year && (
                              <span>{result.election_year}</span>
                            )}
                          </div>
                          {isClickable && (
                            <div className="mt-2">
                              <p className="text-xs text-blue-600 font-medium">
                                Click to view details →
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                      {result.amount && (
                        <div className="text-right">
                          <p className="text-lg font-semibold text-gray-900">
                            {formatCurrency(result.amount)}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                );

                if (isClickable) {
                  return (
                    <Link key={result.id} href={detailUrl} className="block">
                      {resultContent}
                    </Link>
                  );
                }

                return (
                  <div key={result.id}>
                    {resultContent}
                  </div>
                );
              })}
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

        {!loading && !error && results.length === 0 && searchTerm && (
          <div className="text-center py-8">
            <p className="text-gray-500">No results found for "{searchTerm}"</p>
            <p className="text-sm text-gray-400 mt-2">Try adjusting your search terms or filters</p>
          </div>
        )}
      </div>

      {/* Data Source Note */}
      <div className="mt-8 p-4 bg-gray-50 rounded-lg">
        <h3 className="text-sm font-medium text-gray-800 mb-2">Data Source</h3>
        <p className="text-sm text-gray-600">
          Search results come from Federal Election Commission filings and other public sources. 
          Data is updated regularly and provides comprehensive coverage of campaign finance activities 
          across all federal elections.
        </p>
      </div>
    </div>
  );
} 