'use client';

import { useState, useEffect, useMemo } from 'react';
import { formatCurrency, formatNumber } from '@/lib/utils';
import Link from 'next/link';

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
  const [sortConfig, setSortConfig] = useState<SortConfig>({ field: 'state', direction: 'asc' });
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

  const getIsraelScoreColor = (score: number | null) => {
    if (score === null) return 'bg-gray-200';
    if (score === 0) return 'bg-red-600';
    if (score === 1) return 'bg-red-500';
    if (score === 2) return 'bg-orange-500';
    if (score === 3) return 'bg-yellow-500';
    if (score === 4) return 'bg-green-400';
    if (score === 5) return 'bg-green-500';
    return 'bg-gray-500';
  };

  const getHumanityScoreLabel = (score: number | null) => {
    if (score === null) return 'N/A';
    if (score === 0) return '0';
    if (score === 1) return '1';
    if (score === 2) return '2';
    if (score === 3) return '3';
    if (score === 4) return '4';
    if (score === 5) return '5';
    return '?';
  };

  const getSortIcon = (field: SortField) => {
    if (sortConfig.field !== field) return '↕️';
    return sortConfig.direction === 'asc' ? '↑' : '↓';
  };

  const states = useMemo(() => {
    const uniqueStates = [...new Set(districts.map(d => d.state))].sort();
    return uniqueStates;
  }, [districts]);

  const stats = useMemo(() => {
    const totalFunding = districts.reduce((sum, d) => sum + (d.incumbent_total_israel_funding || 0), 0);
    const avgFunding = totalFunding / districts.length;
    const humanitarianCount = districts.filter(d => d.incumbent_israel_score === 5).length;
    const hardlineCount = districts.filter(d => d.incumbent_israel_score === 0).length;
    const totalDistricts = districts.length;
    
    // Party breakdowns
    const democrats = districts.filter(d => d.incumbent_party === 'DEM');
    const republicans = districts.filter(d => d.incumbent_party === 'REP');
    
    // Gender breakdowns (simple name-based detection)
    const maleReps = districts.filter(d => {
      const name = d.incumbent_name.toLowerCase();
      return name.includes('mr.') || name.includes('mr ') || 
             (name.includes('senator') && !name.includes('ms.')) ||
             (name.includes('representative') && !name.includes('ms.'));
    });
    const femaleReps = districts.filter(d => {
      const name = d.incumbent_name.toLowerCase();
      return name.includes('ms.') || name.includes('mrs.') || name.includes('dr.') ||
             name.includes('senator') && (name.includes('ms.') || name.includes('mrs.'));
    });
    
    // State breakdowns
    const stateBreakdown = districts.reduce((acc, d) => {
      if (!acc[d.state]) {
        acc[d.state] = {
          total: 0,
          humanitarian: 0,
          hardline: 0,
          democrats: 0,
          republicans: 0,
          funding: 0
        };
      }
      acc[d.state].total++;
      if (d.incumbent_israel_score === 5) acc[d.state].humanitarian++;
      if (d.incumbent_israel_score === 0) acc[d.state].hardline++;
      if (d.incumbent_party === 'DEM') acc[d.state].democrats++;
      if (d.incumbent_party === 'REP') acc[d.state].republicans++;
      acc[d.state].funding += d.incumbent_total_israel_funding || 0;
      return acc;
    }, {} as Record<string, any>);
    
    // Humanity score breakdowns
    const humanityByParty = {
      democrats: {
        total: democrats.length,
        humanitarian: democrats.filter(d => d.incumbent_israel_score === 5).length,
        hardline: democrats.filter(d => d.incumbent_israel_score === 0).length,
        funding: democrats.reduce((sum, d) => sum + (d.incumbent_total_israel_funding || 0), 0)
      },
      republicans: {
        total: republicans.length,
        humanitarian: republicans.filter(d => d.incumbent_israel_score === 5).length,
        hardline: republicans.filter(d => d.incumbent_israel_score === 0).length,
        funding: republicans.reduce((sum, d) => sum + (d.incumbent_total_israel_funding || 0), 0)
      }
    };
    
    const humanityByGender = {
      male: {
        total: maleReps.length,
        humanitarian: maleReps.filter(d => d.incumbent_israel_score === 5).length,
        hardline: maleReps.filter(d => d.incumbent_israel_score === 0).length,
        funding: maleReps.reduce((sum, d) => sum + (d.incumbent_total_israel_funding || 0), 0)
      },
      female: {
        total: femaleReps.length,
        humanitarian: femaleReps.filter(d => d.incumbent_israel_score === 5).length,
        hardline: femaleReps.filter(d => d.incumbent_israel_score === 0).length,
        funding: femaleReps.reduce((sum, d) => sum + (d.incumbent_total_israel_funding || 0), 0)
      }
    };
    
    return {
      totalFunding,
      avgFunding,
      humanitarianCount,
      hardlineCount,
      totalDistricts,
      humanitarianPercent: ((humanitarianCount / totalDistricts) * 100).toFixed(1),
      hardlinePercent: ((hardlineCount / totalDistricts) * 100).toFixed(1),
      humanityByParty,
      humanityByGender,
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
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">House Districts</h1>
              <p className="text-gray-600">All 437 congressional districts with incumbent information and Israel funding data</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">Cycle:</label>
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
              <Link 
                href="/congressional-map"
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium"
              >
                View Map
              </Link>
            </div>
          </div>
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
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{stats.humanitarianCount}</div>
              <div className="text-sm text-green-600">Humanitarian Representatives</div>
              <div className="text-xs text-green-500">{stats.humanitarianPercent}% of total</div>
            </div>
            <div className="bg-red-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-red-600">{stats.hardlineCount}</div>
              <div className="text-sm text-red-600">Hardline Representatives</div>
              <div className="text-xs text-red-500">{stats.hardlinePercent}% of total</div>
            </div>
          </div>

          {/* Humanity Breakdown by Party */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Humanity Score by Party</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="text-lg font-semibold text-blue-800 mb-2">Democrats ({stats.humanityByParty.democrats.total})</div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-green-600">Humanitarian (5):</span>
                    <span className="font-semibold">{stats.humanityByParty.democrats.humanitarian}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-red-600">Hardline (0):</span>
                    <span className="font-semibold">{stats.humanityByParty.democrats.hardline}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-600">Funding:</span>
                    <span className="font-semibold">{formatCurrency(stats.humanityByParty.democrats.funding)}</span>
                  </div>
                </div>
              </div>
              <div className="bg-red-50 p-4 rounded-lg">
                <div className="text-lg font-semibold text-red-800 mb-2">Republicans ({stats.humanityByParty.republicans.total})</div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-green-600">Humanitarian (5):</span>
                    <span className="font-semibold">{stats.humanityByParty.republicans.humanitarian}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-red-600">Hardline (0):</span>
                    <span className="font-semibold">{stats.humanityByParty.republicans.hardline}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-600">Funding:</span>
                    <span className="font-semibold">{formatCurrency(stats.humanityByParty.republicans.funding)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Humanity Breakdown by Gender */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Humanity Score by Gender</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="text-lg font-semibold text-blue-800 mb-2">Male Representatives ({stats.humanityByGender.male.total})</div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-green-600">Humanitarian (5):</span>
                    <span className="font-semibold">{stats.humanityByGender.male.humanitarian}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-red-600">Hardline (0):</span>
                    <span className="font-semibold">{stats.humanityByGender.male.hardline}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-600">Funding:</span>
                    <span className="font-semibold">{formatCurrency(stats.humanityByGender.male.funding)}</span>
                  </div>
                </div>
              </div>
              <div className="bg-pink-50 p-4 rounded-lg">
                <div className="text-lg font-semibold text-pink-800 mb-2">Female Representatives ({stats.humanityByGender.female.total})</div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-green-600">Humanitarian (5):</span>
                    <span className="font-semibold">{stats.humanityByGender.female.humanitarian}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-red-600">Hardline (0):</span>
                    <span className="font-semibold">{stats.humanityByGender.female.hardline}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-600">Funding:</span>
                    <span className="font-semibold">{formatCurrency(stats.humanityByGender.female.funding)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Top States by Funding */}
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
                        <span className="text-green-600">Humanitarian:</span>
                        <span className="font-semibold">{data.humanitarian}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-red-600">Hardline:</span>
                        <span className="font-semibold">{data.hardline}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-blue-600">Funding:</span>
                        <span className="font-semibold">{formatCurrency(data.funding)}</span>
                      </div>
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
                    onClick={() => handleSort('first_elected_year')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>First Elected</span>
                      <span className="text-lg">{getSortIcon('first_elected_year')}</span>
                    </div>
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('incumbent_cash_on_hand')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Cash on Hand</span>
                      <span className="text-lg">{getSortIcon('incumbent_cash_on_hand')}</span>
                    </div>
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('incumbent_israel_score')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Humanity Score</span>
                      <span className="text-lg">{getSortIcon('incumbent_israel_score')}</span>
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
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {district.first_elected_year || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {district.incumbent_cash_on_hand ? formatCurrency(district.incumbent_cash_on_hand) : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center space-x-2">
                        <div className={`w-6 h-6 rounded-full ${getIsraelScoreColor(district.incumbent_israel_score)} flex items-center justify-center text-white text-xs font-bold`}>
                          {getHumanityScoreLabel(district.incumbent_israel_score)}
                        </div>
                      </div>
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