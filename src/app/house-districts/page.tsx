'use client';

import { useState, useEffect, useMemo } from 'react';
import { formatCurrency, formatNumber } from '@/lib/utils';
import Link from 'next/link';
import PageHeader from '@/components/ui/PageHeader';

export interface HouseDistrict {
  state: string;
  district_name: string;
  incumbent_person_id: string | null;
  incumbent_name: string;
  incumbent_party: string;
  first_elected_year: number | null;
  incumbent_cash_on_hand: number | null;
  incumbent_israel_score: number | null;
  incumbent_total_israel_funding: number | null;
  challenger_count: number;
  top_challenger_name: string | null;
  top_challenger_person_id: string | null;
  top_challenger_party: string | null;
  top_challenger_cash_on_hand: number | null;
  top_challenger_israel_score: number | null;
  status: 'FILLED' | 'VACANT';
  voting: boolean;
}

type SortField = keyof HouseDistrict;
type SortDirection = 'asc' | 'desc';

interface SortConfig {
  field: SortField;
  direction: SortDirection;
}

export default function HouseDistrictsPage() {
  const [districts, setDistricts] = useState<HouseDistrict[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [stateFilter, setStateFilter] = useState('');
  const [sortConfig, setSortConfig] = useState<SortConfig>({ field: 'incumbent_total_israel_funding', direction: 'desc' });
  const [visibleCount, setVisibleCount] = useState(50);
  const [selectedCycle, setSelectedCycle] = useState('2024');

  useEffect(() => {
    fetchDistricts();
  }, [selectedCycle]);

  const fetchDistricts = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/house-districts?cycle=${selectedCycle}`);
      const result = await response.json();
      
      if (result.success) {
        setDistricts(result.data);
      } else {
        setError(result.error || 'Failed to fetch districts');
      }
    } catch (err) {
      setError('Failed to fetch districts');
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (field: SortField) => {
    setSortConfig(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const sortedAndFilteredDistricts = useMemo(() => {
    let filtered = districts.filter(district => {
      const matchesSearch = searchTerm === '' || 
        district.incumbent_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        district.district_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        district.state.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesState = stateFilter === '' || district.state === stateFilter;
      
      return matchesSearch && matchesState;
    });

    filtered.sort((a, b) => {
      const aValue = a[sortConfig.field];
      const bValue = b[sortConfig.field];
      
      if (aValue === null && bValue === null) return 0;
      if (aValue === null) return 1;
      if (bValue === null) return -1;
      
      let comparison = 0;
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        comparison = aValue.localeCompare(bValue);
      } else if (typeof aValue === 'number' && typeof bValue === 'number') {
        comparison = aValue - bValue;
      } else {
        comparison = String(aValue).localeCompare(String(bValue));
      }
      
      return sortConfig.direction === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [districts, searchTerm, stateFilter, sortConfig]);

  const visibleDistricts = sortedAndFilteredDistricts.slice(0, visibleCount);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollTop + clientHeight >= scrollHeight - 100) {
      setVisibleCount(prev => Math.min(prev + 50, sortedAndFilteredDistricts.length));
    }
  };

  // Add scroll event listener to window
  useEffect(() => {
    const handleWindowScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = document.documentElement;
      if (scrollTop + clientHeight >= scrollHeight - 100) {
        setVisibleCount(prev => Math.min(prev + 50, sortedAndFilteredDistricts.length));
      }
    };

    window.addEventListener('scroll', handleWindowScroll);
    return () => window.removeEventListener('scroll', handleWindowScroll);
  }, [sortedAndFilteredDistricts.length]);

  // Humanity-specific UI removed for a compact funding-focused page

  const getSortIcon = (field: SortField) => {
    if (sortConfig.field !== field) return '<>'; // neutral
    return sortConfig.direction === 'asc' ? '^' : 'v';
  };

  const states = useMemo(() => {
    const uniqueStates = [...new Set(districts.map(d => d.state))].sort();
    return uniqueStates;
  }, [districts]);

  const stats = useMemo(() => {
    const totalFunding = districts.reduce((sum, d) => sum + (d.incumbent_total_israel_funding || 0), 0);
    const avgFunding = totalFunding / (districts.length || 1);
    const totalDistricts = districts.length;

    // Funding buckets to match map categories
    const zeroFunding = districts.filter(d => (d.incumbent_total_israel_funding || 0) === 0).length;
    const under10k = districts.filter(d => {
      const v = d.incumbent_total_israel_funding || 0;
      return v > 0 && v < 10000;
    }).length;
    const between10k50k = districts.filter(d => {
      const v = d.incumbent_total_israel_funding || 0;
      return v >= 10000 && v < 50000;
    }).length;
    const gte50k = districts.filter(d => (d.incumbent_total_israel_funding || 0) >= 50000).length;
    
    // Party funding totals
    const partyFunding = districts.reduce((acc: Record<string, { count: number; total: number }>, d) => {
      const p = d.incumbent_party || 'OTHER';
      if (!acc[p]) acc[p] = { count: 0, total: 0 };
      acc[p].count += 1;
      acc[p].total += d.incumbent_total_israel_funding || 0;
      return acc;
    }, {} as Record<string, { count: number; total: number }>);

    // State funding totals
    const stateBreakdown = districts.reduce((acc, d) => {
      if (!acc[d.state]) {
        acc[d.state] = {
          total: 0,
          democrats: 0,
          republicans: 0,
          others: 0,
          funding: 0
        };
      }
      acc[d.state].total++;
      if (d.incumbent_party === 'DEM') acc[d.state].democrats++;
      else if (d.incumbent_party === 'REP') acc[d.state].republicans++;
      else acc[d.state].others++;
      acc[d.state].funding += d.incumbent_total_israel_funding || 0;
      return acc;
    }, {} as Record<string, any>);
    
    return {
      totalFunding,
      avgFunding,
      totalDistricts,
      zeroFunding,
      under10k,
      between10k50k,
      gte50k,
      partyFunding,
      stateBreakdown
    };
  }, [districts]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-8"></div>
            <div className="space-y-4">
              {[...Array(10)].map((_, i) => (
                <div key={i} className="h-12 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h2 className="text-red-800 font-semibold">Error</h2>
            <p className="text-red-600">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6">
        <div className="-mx-6 -mt-6 mb-6">
          <PageHeader
            title="House Districts"
            subtitle="All 437 congressional districts with incumbent information and Israel funding data"
            cycle={selectedCycle}
            onCycleChange={setSelectedCycle}
            active="house-list"
          />
        </div>

        {/* Stats Overview */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Israel Funding Overview</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{formatCurrency(stats.totalFunding)}</div>
              <div className="text-sm text-blue-600">Total Israel Funding</div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{formatCurrency(stats.avgFunding)}</div>
              <div className="text-sm text-green-600">Average per District</div>
            </div>
          </div>

          <h3 className="text-lg font-semibold text-gray-900 mb-3">Funding Distribution</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-green-700">{stats.zeroFunding}</div>
              <div className="text-sm text-green-700">$0 (Green)</div>
            </div>
            <div className="bg-yellow-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-yellow-700">{stats.under10k}</div>
              <div className="text-sm text-yellow-700">$1-$10K (Yellow)</div>
            </div>
            <div className="bg-orange-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-orange-700">{stats.between10k50k}</div>
              <div className="text-sm text-orange-700">$10K-$50K (Orange)</div>
            </div>
            <div className="bg-red-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-red-700">{stats.gte50k}</div>
              <div className="text-sm text-red-700">&gt;= $50K (Red)</div>
            </div>
          </div>

          {/* Funding by Party */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Funding by Party</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {Object.entries(stats.partyFunding).map(([party, data]: any) => (
                <div key={party} className="p-4 rounded-lg" style={{background: '#f9fafb'}}>
                  <div className="text-lg font-semibold text-gray-800 mb-2">{party}</div>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between"><span>Districts</span><span className="font-semibold">{formatNumber(data.count)}</span></div>
                    <div className="flex justify-between"><span>Total Funding</span><span className="font-semibold">{formatCurrency(data.total)}</span></div>
                    <div className="flex justify-between"><span>Avg per District</span><span className="font-semibold">{formatCurrency(data.total / (data.count || 1))}</span></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top States by Funding (compact) */}

          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Top States by Israel Funding</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(stats.stateBreakdown)
                .sort(([,a], [,b]) => b.funding - a.funding)
                .slice(0, 6)
                .map(([state, data]) => (
                  <div key={state} className="bg-gray-50 p-4 rounded-lg">
                    <div className="text-lg font-semibold text-gray-800 mb-2">{state} ({data.total} reps)</div>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-blue-600">Funding:</span>
                        <span className="font-semibold">{formatCurrency(data.funding)}</span>
                      </div>
                      <div className="flex justify-between"><span>Dem</span><span className="font-semibold">{formatNumber(data.democrats)}</span></div>
                      <div className="flex justify-between"><span>Rep</span><span className="font-semibold">{formatNumber(data.republicans)}</span></div>
                      <div className="flex justify-between"><span>Other</span><span className="font-semibold">{formatNumber(data.others)}</span></div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
              <input
                type="text"
                placeholder="Search by name, district, or state..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="w-full md:w-48">
              <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
              <select
                value={stateFilter}
                onChange={(e) => setStateFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All States</option>
                {states.map(state => (
                  <option key={state} value={state}>{state}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Results Count */}
        <div className="mb-4">
          <p className="text-sm text-gray-600">
            Showing {visibleDistricts.length} of {sortedAndFilteredDistricts.length} districts
          </p>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('state')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>State/District</span>
                      <span className="text-lg">{getSortIcon('state')}</span>
                    </div>
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('incumbent_name')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Incumbent</span>
                      <span className="text-lg">{getSortIcon('incumbent_name')}</span>
                    </div>
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('incumbent_party')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Party</span>
                      <span className="text-lg">{getSortIcon('incumbent_party')}</span>
                    </div>
                  </th>
                  
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('incumbent_total_israel_funding')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Israel Funding</span>
                      <span className="text-lg">{getSortIcon('incumbent_total_israel_funding')}</span>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {visibleDistricts.map((district, index) => (
                  <tr 
                    key={`${district.state}-${district.district_name}`}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => {
                      if (district.incumbent_person_id) {
                        window.open(`/candidates/${district.incumbent_person_id}`, '_blank');
                      }
                    }}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {district.district_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {district.incumbent_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        district.incumbent_party === 'DEM' ? 'bg-blue-100 text-blue-800' :
                        district.incumbent_party === 'REP' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {district.incumbent_party}
                      </span>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {district.incumbent_total_israel_funding ? (
                        <Link 
                          href={`/israel-lobby/${district.incumbent_person_id}`}
                          className="text-blue-600 hover:text-blue-800 hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {formatCurrency(district.incumbent_total_israel_funding)}
                        </Link>
                      ) : (
                        'N/A'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {visibleCount < sortedAndFilteredDistricts.length && (
            <div className="px-6 py-4 bg-gray-50 text-center">
              <p className="text-sm text-gray-600">
                Scroll to load more districts...
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 