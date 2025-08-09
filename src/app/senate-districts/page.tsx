'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface SenateDistrict {
  state: string;
  state_name: string;
  senator1_name: string;
  senator1_party: string | null;
  senator1_person_id: string | null;
  senator1_first_elected_year: number | null;
  senator1_cash_on_hand: number | null;
  senator1_israel_score: number | null;
  senator1_total_israel_funding: number;
  senator1_term_end: string | null;
  senator2_name: string;
  senator2_party: string | null;
  senator2_person_id: string | null;
  senator2_first_elected_year: number | null;
  senator2_cash_on_hand: number | null;
  senator2_israel_score: number | null;
  senator2_total_israel_funding: number;
  senator2_term_end: string | null;
}

type SortField = 'state' | 'senator1_name' | 'senator1_party' | 'senator1_total_israel_funding' | 
                 'senator2_name' | 'senator2_party' | 'senator2_total_israel_funding';
type SortDirection = 'asc' | 'desc';

interface SortConfig {
  field: SortField;
  direction: SortDirection;
}

export default function SenateDistrictsPage() {
  const [districts, setDistricts] = useState<SenateDistrict[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [stateFilter, setStateFilter] = useState('');
  const [sortConfig, setSortConfig] = useState<SortConfig>({ field: 'state', direction: 'asc' });
  const [visibleCount, setVisibleCount] = useState(50);
  const [selectedCycle, setSelectedCycle] = useState('2024');

  // Fetch districts data
  const fetchDistricts = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/senate-districts?cycle=${selectedCycle}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch senate districts');
      }
      
      setDistricts(data.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDistricts();
  }, [selectedCycle]);

  // Handle sorting
  const handleSort = (field: SortField) => {
    const direction = sortConfig.field === field && sortConfig.direction === 'asc' ? 'desc' : 'asc';
    setSortConfig({ field, direction });
  };

  // Get unique states for filter
  const uniqueStates = Array.from(new Set(districts.map(d => d.state))).sort();

  // Filter and sort districts
  const filteredAndSortedDistricts = districts
    .filter(district => {
      const matchesSearch = searchTerm === '' || 
        district.state.toLowerCase().includes(searchTerm.toLowerCase()) ||
        district.state_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        district.senator1_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        district.senator2_name.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesState = stateFilter === '' || district.state === stateFilter;
      
      return matchesSearch && matchesState;
    })
    .sort((a, b) => {
      const { field, direction } = sortConfig;
      let aValue: any = a[field];
      let bValue: any = b[field];

      // Handle null values
      if (aValue === null) aValue = '';
      if (bValue === null) bValue = '';

      // Handle numeric values
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return direction === 'asc' ? aValue - bValue : bValue - aValue;
      }

      // Handle string values
      const aStr = String(aValue).toLowerCase();
      const bStr = String(bValue).toLowerCase();
      
      if (direction === 'asc') {
        return aStr < bStr ? -1 : aStr > bStr ? 1 : 0;
      } else {
        return aStr > bStr ? -1 : aStr < bStr ? 1 : 0;
      }
    });

  // Get visible districts
  const visibleDistricts = filteredAndSortedDistricts.slice(0, visibleCount);

  const getSortIcon = (field: SortField) => {
    if (sortConfig.field !== field) return '↕️';
    return sortConfig.direction === 'asc' ? '↑' : '↓';
  };

  const formatCurrency = (amount: number | null) => {
    if (amount === null || amount === 0) return '$0';
    return `$${amount.toLocaleString()}`;
  };

  const getPartyColor = (party: string | null) => {
    if (party === 'DEM' || party === 'Democratic') return 'text-blue-600';
    if (party === 'REP' || party === 'Republican') return 'text-red-600';
    return 'text-gray-600';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading Senate districts...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">Error: {error}</p>
          <button 
            onClick={fetchDistricts}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Senate Districts</h1>
              <p className="text-gray-600">All 50 states with senator information and Israel funding data</p>
            </div>
            <div className="flex gap-4">
              <Link 
                href="/senate-map"
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium"
              >
                View Senate Map
              </Link>
              <Link 
                href="/house-districts"
                className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg font-medium"
              >
                House Districts
              </Link>
            </div>
          </div>
          
          {/* Cycle Selector */}
          <div className="flex items-center gap-2 mt-4">
            <label className="text-sm font-medium text-gray-700">Election Cycle:</label>
            <select 
              value={selectedCycle} 
              onChange={(e) => setSelectedCycle(e.target.value)}
              className="border border-gray-300 rounded px-3 py-1 text-sm"
            >
              <option value="2020">2020</option>
              <option value="2022">2022</option>
              <option value="2024">2024</option>
              <option value="2026">2026</option>
              <option value="last3">Last 3 Cycles (2020-2024)</option>
              <option value="all">All Cycles</option>
            </select>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
              <input
                type="text"
                placeholder="Search by state or senator name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Filter by State</label>
              <select
                value={stateFilter}
                onChange={(e) => setStateFilter(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              >
                <option value="">All States</option>
                {uniqueStates.map(state => (
                  <option key={state} value={state}>{state}</option>
                ))}
              </select>
            </div>
            
            <div className="flex items-end">
              <div className="text-sm text-gray-600">
                Showing {visibleDistricts.length} of {filteredAndSortedDistricts.length} states
              </div>
            </div>
          </div>
        </div>

        {/* Districts Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('state')}
                  >
                    State {getSortIcon('state')}
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('senator1_name')}
                  >
                    Senior Senator {getSortIcon('senator1_name')}
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('senator1_party')}
                  >
                    Party {getSortIcon('senator1_party')}
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('senator1_total_israel_funding')}
                  >
                    Israel Funding {getSortIcon('senator1_total_israel_funding')}
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('senator2_name')}
                  >
                    Junior Senator {getSortIcon('senator2_name')}
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('senator2_party')}
                  >
                    Party {getSortIcon('senator2_party')}
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('senator2_total_israel_funding')}
                  >
                    Israel Funding {getSortIcon('senator2_total_israel_funding')}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {visibleDistricts.map((district) => (
                  <tr key={district.state} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{district.state}</div>
                      <div className="text-sm text-gray-500">{district.state_name}</div>
                    </td>
                    
                    {/* Senator 1 */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {district.senator1_person_id ? (
                          <Link 
                            href={`/candidates/${district.senator1_person_id}/funding-breakdown`}
                            className="text-blue-600 hover:text-blue-800 underline"
                          >
                            {district.senator1_name}
                          </Link>
                        ) : (
                          <span>{district.senator1_name}</span>
                        )}
                      </div>
                      {district.senator1_first_elected_year && (
                        <div className="text-sm text-gray-500">Since {district.senator1_first_elected_year}</div>
                      )}
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`text-sm font-medium ${getPartyColor(district.senator1_party)}`}>
                        {district.senator1_party || 'Unknown'}
                      </span>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {district.senator1_person_id ? (
                          <Link 
                            href={`/israel-lobby/${district.senator1_person_id}`}
                            className="text-blue-600 hover:text-blue-800 underline"
                          >
                            {formatCurrency(district.senator1_total_israel_funding)}
                          </Link>
                        ) : (
                          <span>{formatCurrency(district.senator1_total_israel_funding)}</span>
                        )}
                      </div>
                      {district.senator1_cash_on_hand && (
                        <div className="text-sm text-gray-500">
                          Cash: {formatCurrency(district.senator1_cash_on_hand)}
                        </div>
                      )}
                    </td>
                    
                    {/* Senator 2 */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {district.senator2_person_id ? (
                          <Link 
                            href={`/candidates/${district.senator2_person_id}/funding-breakdown`}
                            className="text-blue-600 hover:text-blue-800 underline"
                          >
                            {district.senator2_name}
                          </Link>
                        ) : (
                          <span>{district.senator2_name}</span>
                        )}
                      </div>
                      {district.senator2_first_elected_year && (
                        <div className="text-sm text-gray-500">Since {district.senator2_first_elected_year}</div>
                      )}
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`text-sm font-medium ${getPartyColor(district.senator2_party)}`}>
                        {district.senator2_party || 'Unknown'}
                      </span>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {district.senator2_person_id ? (
                          <Link 
                            href={`/israel-lobby/${district.senator2_person_id}`}
                            className="text-blue-600 hover:text-blue-800 underline"
                          >
                            {formatCurrency(district.senator2_total_israel_funding)}
                          </Link>
                        ) : (
                          <span>{formatCurrency(district.senator2_total_israel_funding)}</span>
                        )}
                      </div>
                      {district.senator2_cash_on_hand && (
                        <div className="text-sm text-gray-500">
                          Cash: {formatCurrency(district.senator2_cash_on_hand)}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Load More Button */}
          {visibleCount < filteredAndSortedDistricts.length && (
            <div className="px-6 py-4 bg-gray-50 border-t">
              <button
                onClick={() => setVisibleCount(prev => prev + 25)}
                className="w-full text-center text-blue-600 hover:text-blue-800 font-medium"
              >
                Load More ({filteredAndSortedDistricts.length - visibleCount} remaining)
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
