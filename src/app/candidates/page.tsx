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

interface ConsolidatedCandidate {
  person_id: string;
  display_name: string;
  state: string;
  current_office: string;
  current_district: string;
  current_party: string;
  is_current_office_holder: boolean;
  member_id?: string;
  bio_id?: string;
  election_years: number[];
  cand_ids: string[];
  israel_lobby?: {
    humanity_score: number;
    total_pro_israel_contributions: number;
    lobby_grade: 'A' | 'B' | 'C' | 'D' | 'F';
    lobby_category: 'High Support' | 'Moderate Support' | 'Low Support' | 'No Support' | 'Unknown';
  };
}

interface RecentSearch {
  query: string;
  timestamp: number;
  type: 'name' | 'state' | 'party' | 'office';
}

export default function CandidatesPage() {
  const [consolidatedCandidates, setConsolidatedCandidates] = useState<ConsolidatedCandidate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredCandidates, setFilteredCandidates] = useState<ConsolidatedCandidate[]>([]);
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



  // Consolidate candidates by person_id and cand_id to handle duplicates
  const consolidateCandidates = (candidates: Candidate[]): ConsolidatedCandidate[] => {
    // First, group by cand_id to handle cases where same FEC ID has multiple person_ids
    const candIdGroups = new Map<string, Candidate[]>();
    
    candidates.forEach(candidate => {
      if (!candIdGroups.has(candidate.cand_id)) {
        candIdGroups.set(candidate.cand_id, []);
      }
      candIdGroups.get(candidate.cand_id)!.push(candidate);
    });
    
    // Then consolidate by person_id, but prefer the most recent or most complete record
    const consolidated = new Map<string, ConsolidatedCandidate>();
    
    candIdGroups.forEach((candidatesForCandId, candId) => {
      // For each cand_id, find the best representative candidate
      let bestCandidate = candidatesForCandId[0];
      
      // Prefer candidates with more complete information
      for (const candidate of candidatesForCandId) {
        if (candidate.is_current_office_holder && !bestCandidate.is_current_office_holder) {
          bestCandidate = candidate;
        } else if (candidate.election_year > bestCandidate.election_year) {
          bestCandidate = candidate;
        }
      }
      
      // Use the best candidate's person_id as the key
      const personId = bestCandidate.person_id;
      
      if (!consolidated.has(personId)) {
        consolidated.set(personId, {
          person_id: personId,
          display_name: bestCandidate.display_name,
          state: bestCandidate.state,
          current_office: bestCandidate.current_office,
          current_district: bestCandidate.current_district,
          current_party: bestCandidate.current_party,
          is_current_office_holder: bestCandidate.is_current_office_holder,
          member_id: bestCandidate.member_id,
          bio_id: bestCandidate.bio_id,
          election_years: [],
          cand_ids: [],
        });
      }
      
      const consolidatedCandidate = consolidated.get(personId)!;
      
      // Add all election years from all candidates with this cand_id
      candidatesForCandId.forEach(candidate => {
        if (!consolidatedCandidate.election_years.includes(candidate.election_year)) {
          consolidatedCandidate.election_years.push(candidate.election_year);
        }
      });
      
      // Add the cand_id if not already present
      if (!consolidatedCandidate.cand_ids.includes(candId)) {
        consolidatedCandidate.cand_ids.push(candId);
      }
    });
    
    // Sort election years and cand_ids
    consolidated.forEach(candidate => {
      candidate.election_years.sort((a, b) => b - a); // Descending order
      candidate.cand_ids.sort();
    });
    
    return Array.from(consolidated.values());
  };

  // Removed automatic filtering useEffect - now only manual search handlers will filter

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
    
    setHasSearched(true);
    addRecentSearch(searchQuery, 'name');
    
    // Fetch candidates if we don't have them yet
    if (consolidatedCandidates.length === 0) {
      await fetchCandidates();
    }
    
    // Filter candidates based on search query
    const filtered = consolidatedCandidates.filter(candidate =>
      candidate.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      candidate.state.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (candidate.current_party && candidate.current_party.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (candidate.current_office && candidate.current_office.toLowerCase().includes(searchQuery.toLowerCase())) ||
      candidate.cand_ids.some(id => id.toLowerCase().includes(searchQuery.toLowerCase()))
    );
    
    // Fetch Israel lobby data only for the filtered results
    const filteredWithLobby = await fetchLobbyDataForResults(filtered);
    setFilteredCandidates(filteredWithLobby);
  };

  const handleRecentSearchClick = async (search: RecentSearch) => {
    setSearchQuery(search.query);
    setHasSearched(true);
    
    // Fetch candidates if we don't have them yet
    if (consolidatedCandidates.length === 0) {
      await fetchCandidates();
    }
    
    // Filter candidates based on search query
    const filtered = consolidatedCandidates.filter(candidate =>
      candidate.display_name.toLowerCase().includes(search.query.toLowerCase()) ||
      candidate.state.toLowerCase().includes(search.query.toLowerCase()) ||
      (candidate.current_party && candidate.current_party.toLowerCase().includes(search.query.toLowerCase())) ||
      (candidate.current_office && candidate.current_office.toLowerCase().includes(search.query.toLowerCase())) ||
      candidate.cand_ids.some(id => id.toLowerCase().includes(search.query.toLowerCase()))
    );
    
    // Fetch Israel lobby data only for the filtered results
    const filteredWithLobby = await fetchLobbyDataForResults(filtered);
    setFilteredCandidates(filteredWithLobby);
  };

  const handlePopularSearchClick = async (query: string, type: RecentSearch['type']) => {
    setSearchQuery(query);
    setHasSearched(true);
    
    // Fetch candidates if we don't have them yet
    if (consolidatedCandidates.length === 0) {
      await fetchCandidates();
    }
    
    // Filter candidates based on search query
    const filtered = consolidatedCandidates.filter(candidate =>
      candidate.display_name.toLowerCase().includes(query.toLowerCase()) ||
      candidate.state.toLowerCase().includes(query.toLowerCase()) ||
      (candidate.current_party && candidate.current_party.toLowerCase().includes(query.toLowerCase())) ||
      (candidate.current_office && candidate.current_office.toLowerCase().includes(query.toLowerCase())) ||
      candidate.cand_ids.some(id => id.toLowerCase().includes(query.toLowerCase()))
    );
    
    // Fetch Israel lobby data only for the filtered results
    const filteredWithLobby = await fetchLobbyDataForResults(filtered);
    setFilteredCandidates(filteredWithLobby);
  };

  const fetchIsraelLobbyData = async (personIds: string[]) => {
    try {
      console.log('fetchIsraelLobbyData: Fetching for', personIds.length, 'person IDs');
      // Fetch Israel lobby data for multiple candidates in parallel
      const promises = personIds.map(async (personId) => {
        try {
          console.log('fetchIsraelLobbyData: Fetching for personId:', personId);
          const response = await fetch(`/api/israel-lobby/${personId}/summary`);
          if (response.ok) {
            const data = await response.json();
            console.log('fetchIsraelLobbyData: Response for', personId, ':', data);
            return { personId, data: data.success ? data.data : null };
          }
        } catch (error) {
          console.error(`Error fetching Israel lobby data for ${personId}:`, error);
        }
        return { personId, data: null };
      });

      const results = await Promise.all(promises);
      const lobbyDataMap = new Map();
      
      results.forEach(({ personId, data }) => {
        if (data) {
          lobbyDataMap.set(personId, data);
          console.log('fetchIsraelLobbyData: Added lobby data for', personId, ':', data);
        } else {
          console.log('fetchIsraelLobbyData: No lobby data for', personId);
        }
      });

      return lobbyDataMap;
    } catch (error) {
      console.error('Error fetching Israel lobby data:', error);
      return new Map();
    }
  };

  // Fetch Israel lobby data only for candidates in search results
  const fetchLobbyDataForResults = async (candidates: ConsolidatedCandidate[]) => {
    if (candidates.length === 0) return candidates;
    
    try {
      console.log('fetchLobbyDataForResults: Fetching for', candidates.length, 'candidates');
      console.log('fetchLobbyDataForResults: Candidate person_ids:', candidates.map(c => ({ name: c.display_name, person_id: c.person_id })));
      const personIds = candidates.map(c => c.person_id);
      const lobbyDataMap = await fetchIsraelLobbyData(personIds);
      
      // Add Israel lobby data to candidates
      const candidatesWithLobby = candidates.map(candidate => {
        const lobbyData = lobbyDataMap.get(candidate.person_id);
        console.log('fetchLobbyDataForResults: Mapping lobby data for', candidate.display_name, 'person_id:', candidate.person_id, 'lobbyData:', lobbyData);
        return {
          ...candidate,
          israel_lobby: lobbyData || undefined
        };
      });
      
      console.log('fetchLobbyDataForResults: Updated candidates with lobby data');
      return candidatesWithLobby;
    } catch (error) {
      console.error('Error fetching lobby data for results:', error);
      return candidates;
    }
  };

  const fetchCandidates = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/candidates');
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          const consolidated = consolidateCandidates(data.data);
          setConsolidatedCandidates(consolidated);
          setFilteredCandidates(consolidated);
          console.log('CandidatesPage: Setting consolidated candidates:', consolidated.length);
        } else {
          console.error('Failed to fetch candidates:', data.error);
        }
      } else {
        console.error('Failed to fetch candidates');
      }
    } catch (error) {
      console.error('Error fetching candidates:', error);
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
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  // Clear results if search box is empty
                  if (e.target.value.trim() === '') {
                    setFilteredCandidates([]);
                    setHasSearched(false);
                  }
                }}
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
          {recentSearches.length > 0 && (
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
          {!hasSearched && recentSearches.length === 0 && (
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
                    onClick={() => handlePopularSearchClick(search.query, search.type)}
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
                {filteredCandidates.map((candidate) => {
                  console.log('CandidatesPage: Rendering candidate:', candidate.display_name, 'Lobby data:', candidate.israel_lobby);
                  return (
                  <div key={candidate.person_id} className="p-6 hover:bg-gray-50">
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
                          {candidate.israel_lobby && (
                            <Link
                              href={`/israel-lobby/${candidate.person_id}`}
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium hover:opacity-80 transition-opacity cursor-pointer ${getHumanityScoreColor(candidate.israel_lobby.humanity_score)}`}
                            >
                              <span className="font-bold mr-1">{candidate.israel_lobby.humanity_score}</span>
                              Humanity
                            </Link>
                          )}
                          {!candidate.israel_lobby && (
                            <span className="text-xs text-gray-400">No lobby data</span>
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
                          {candidate.israel_lobby && (
                            <span className="text-xs text-gray-500">
                              {formatCurrency(candidate.israel_lobby.total_pro_israel_contributions)}
                            </span>
                          )}
                          <div className="flex items-center space-x-2">
                            <span className="flex items-center">
                              <Calendar className="h-4 w-4 mr-1" />
                              Years: {candidate.election_years.map(year => (
                                <Link
                                  key={year}
                                  href={`/candidates/${candidate.person_id}?election_year=${year}`}
                                  className="inline-block px-1.5 py-0.5 mx-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors"
                                >
                                  {year}
                                </Link>
                              ))}
                            </span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="flex items-center">
                              <Building className="h-4 w-4 mr-1" />
                              FEC IDs: {candidate.cand_ids.map(id => (
                                <a
                                  key={id}
                                  href={`https://www.fec.gov/data/candidate/${id}/`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-block px-1.5 py-0.5 mx-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                                >
                                  {id}
                                </a>
                              ))}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center space-x-4">
                          <Link
                            href={`/candidates/${candidate.person_id}?election_year=${candidate.election_years[0]}`}
                            className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                          >
                            <User className="h-3 w-3 mr-1" />
                            View Profile
                          </Link>
                          
                          <Link
                            href={`/israel-lobby/${candidate.person_id}`}
                            className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                          >
                            <ExternalLink className="h-3 w-3 mr-1" />
                            Israel Lobby Analysis
                          </Link>
                          
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
                );
                })}
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