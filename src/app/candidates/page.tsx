'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Search, 
  MapPin, 
  Building, 
  Calendar,
  ExternalLink,
  User,
  Award,
  TrendingUp,
  Clock
} from 'lucide-react';
import Breadcrumbs from '@/components/ui/Breadcrumbs';
import { BreadcrumbItem } from '@/types';

interface Candidate {
  person_id: string;
  display_name: string;
  state: string;
  current_office: string;
  current_district: string;
  current_party: string;
  cand_id: string;
  election_year: number;
  is_current_office_holder: boolean;
  member_id?: string;
  bio_id?: string;
}

interface RecentSearch {
  query: string;
  timestamp: number;
  type: 'name' | 'state' | 'party' | 'office';
}

export default function CandidatesPage() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredCandidates, setFilteredCandidates] = useState<Candidate[]>([]);
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  const breadcrumbs: BreadcrumbItem[] = [
    { label: 'Candidates', href: '/candidates' },
  ];

  // Load recent searches from localStorage on component mount
  useEffect(() => {
    const saved = localStorage.getItem('candidate-recent-searches');
    if (saved) {
      try {
        const searches = JSON.parse(saved);
        setRecentSearches(searches);
      } catch (e) {
        console.error('Error loading recent searches:', e);
      }
    }
  }, []);

  // Save recent searches to localStorage whenever they change
  useEffect(() => {
    if (recentSearches.length > 0) {
      localStorage.setItem('candidate-recent-searches', JSON.stringify(recentSearches));
    }
  }, [recentSearches]);

  useEffect(() => {
    // Filter candidates based on search query
    if (searchQuery.trim() === '') {
      setFilteredCandidates([]);
      setHasSearched(false);
    } else {
      setHasSearched(true);
      const filtered = candidates.filter(candidate =>
        candidate.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        candidate.state.toLowerCase().includes(searchQuery.toLowerCase()) ||
        candidate.cand_id.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredCandidates(filtered);
    }
  }, [searchQuery, candidates]);

  const addRecentSearch = (query: string, type: RecentSearch['type']) => {
    const newSearch: RecentSearch = {
      query: query.trim(),
      timestamp: Date.now(),
      type
    };

    setRecentSearches(prev => {
      // Remove duplicates and keep only the 10 most recent
      const filtered = prev.filter(s => s.query !== query);
      return [newSearch, ...filtered].slice(0, 10);
    });
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    // Add to recent searches
    addRecentSearch(searchQuery, 'name');

    // Fetch candidates if we don't have them yet
    if (candidates.length === 0) {
      await fetchCandidates();
    }
  };

  const handleRecentSearchClick = (search: RecentSearch) => {
    setSearchQuery(search.query);
    // Trigger search automatically when clicking a recent search
    setTimeout(() => {
      handleSearch();
    }, 100);
  };

  const fetchCandidates = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/candidates');
      
      if (!response.ok) {
        throw new Error('Failed to fetch candidates');
      }
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch candidates');
      }
      
      setCandidates(data.data);
    } catch (err) {
      console.error('Error fetching candidates:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch candidates');
    } finally {
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

  const getPartyColor = (party: string) => {
    return party === 'DEM' ? 'text-blue-600' : party === 'REP' ? 'text-red-600' : 'text-gray-600';
  };

  const getPartyBgColor = (party: string) => {
    return party === 'DEM' ? 'bg-blue-100' : party === 'REP' ? 'bg-red-100' : 'bg-gray-100';
  };

  const getOfficeLabel = (office: string) => {
    return office === 'S' ? 'Senate' : office === 'H' ? 'House' : office;
  };

  const getSearchTypeIcon = (type: RecentSearch['type']) => {
    switch (type) {
      case 'name':
        return <User className="h-3 w-3" />;
      case 'state':
        return <MapPin className="h-3 w-3" />;
      case 'party':
        return <Building className="h-3 w-3" />;
      case 'office':
        return <Calendar className="h-3 w-3" />;
      default:
        return <Search className="h-3 w-3" />;
    }
  };

  const getSearchTypeLabel = (type: RecentSearch['type']) => {
    switch (type) {
      case 'name':
        return 'Name';
      case 'state':
        return 'State';
      case 'party':
        return 'Party';
      case 'office':
        return 'Office';
      default:
        return 'Search';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Breadcrumbs items={breadcrumbs} />
        
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Candidates
              </h1>
              <p className="text-gray-600">
                Search and explore candidates from federal elections
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <div className="text-2xl font-bold text-gray-900">
                  {hasSearched ? filteredCandidates.length.toLocaleString() : '—'}
                </div>
                <div className="text-sm text-gray-600">
                  {hasSearched ? 'Results' : 'Search to find candidates'}
                </div>
              </div>
            </div>
          </div>

          {/* Search */}
          <div className="space-y-4">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search by name, state, or FEC ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={handleSearch}
                disabled={!searchQuery.trim() || loading}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Searching...
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4 mr-2" />
                    Search
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Recent Searches */}
          {recentSearches.length > 0 && !hasSearched && (
            <div className="mt-6">
              <div className="flex items-center space-x-2 mb-3">
                <Clock className="h-4 w-4 text-gray-500" />
                <h3 className="text-sm font-medium text-gray-700">Recent Searches</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {recentSearches.map((search, index) => (
                  <button
                    key={`${search.query}-${search.timestamp}`}
                    onClick={() => handleRecentSearchClick(search)}
                    className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-full bg-gray-100 text-gray-700 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                  >
                    {getSearchTypeIcon(search.type)}
                    <span className="ml-1">{search.query}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Popular Searches */}
          {!hasSearched && (
            <div className="mt-6">
              <div className="flex items-center space-x-2 mb-3">
                <TrendingUp className="h-4 w-4 text-gray-500" />
                <h3 className="text-sm font-medium text-gray-700">Popular Searches</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {[
                  { query: 'Biden', type: 'name' as const },
                  { query: 'Trump', type: 'name' as const },
                  { query: 'California', type: 'state' as const },
                  { query: 'Texas', type: 'state' as const },
                  { query: 'Democrat', type: 'party' as const },
                  { query: 'Republican', type: 'party' as const },
                  { query: 'Senate', type: 'office' as const },
                  { query: 'House', type: 'office' as const },
                ].map((search) => (
                  <button
                    key={search.query}
                    onClick={() => {
                      setSearchQuery(search.query);
                      addRecentSearch(search.query, search.type);
                      setTimeout(() => handleSearch(), 100);
                    }}
                    className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-full bg-blue-100 text-blue-700 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                  >
                    {getSearchTypeIcon(search.type)}
                    <span className="ml-1">{search.query}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Results */}
        {hasSearched && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">
                {loading ? 'Searching...' : `${filteredCandidates.length} candidate${filteredCandidates.length !== 1 ? 's' : ''} found`}
              </h2>
            </div>

            {error && (
              <div className="p-6 text-center">
                <p className="text-red-600">Error: {error}</p>
                <button
                  onClick={handleSearch}
                  className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                >
                  Try Again
                </button>
              </div>
            )}

            {!loading && !error && (
              <div className="divide-y divide-gray-200">
                {filteredCandidates.map((candidate) => (
                  <div key={`${candidate.person_id}-${candidate.election_year}`} className="p-6 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="text-lg font-medium text-gray-900">
                            {candidate.display_name}
                          </h3>
                          {candidate.is_current_office_holder && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              <Award className="h-3 w-3 mr-1" />
                              Incumbent
                            </span>
                          )}
                        </div>
                        
                        <div className="flex items-center space-x-4 text-sm text-gray-600 mb-3">
                          <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${getPartyBgColor(candidate.current_party)} ${getPartyColor(candidate.current_party)}`}>
                            {candidate.current_party === 'DEM' ? 'Democrat' : candidate.current_party === 'REP' ? 'Republican' : candidate.current_party}
                          </span>
                          <span className="flex items-center">
                            <MapPin className="h-4 w-4 mr-1" />
                            {candidate.state} - {getOfficeLabel(candidate.current_office)} {candidate.current_district}
                          </span>
                          <span className="flex items-center">
                            <Calendar className="h-4 w-4 mr-1" />
                            {candidate.election_year}
                          </span>
                          <span className="flex items-center">
                            <Building className="h-4 w-4 mr-1" />
                            FEC ID: {candidate.cand_id}
                          </span>
                        </div>

                        <div className="flex items-center space-x-4">
                          <Link
                            href={`/candidates/${candidate.person_id}?election_year=${candidate.election_year}`}
                            className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                          >
                            <User className="h-3 w-3 mr-1" />
                            View Profile
                          </Link>
                          
                          {candidate.cand_id && (
                            <a
                              href={`https://www.fec.gov/data/candidate/${candidate.cand_id}/`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                            >
                              <ExternalLink className="h-3 w-3 mr-1" />
                              FEC.gov
                            </a>
                          )}
                          
                          {candidate.bio_id && (
                            <a
                              href={`https://www.congress.gov/member/${candidate.bio_id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                            >
                              <ExternalLink className="h-3 w-3 mr-1" />
                              Congress.gov
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!loading && !error && filteredCandidates.length === 0 && hasSearched && (
              <div className="p-6 text-center">
                <p className="text-gray-500">No candidates found matching your search.</p>
                <p className="text-sm text-gray-400 mt-2">Try a different search term or browse popular searches above.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
} 