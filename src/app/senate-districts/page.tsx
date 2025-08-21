"use client";

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import PageHeader from '@/components/ui/PageHeader';
import { formatCurrency, formatNumber } from '@/lib/utils';

interface SenateRow {
  state: string;
  state_name: string;
  senator1_name: string;
  senator1_party: string | null;
  senator1_person_id: string | null;
  senator1_total_israel_funding: number | null;
  senator2_name: string;
  senator2_party: string | null;
  senator2_person_id: string | null;
  senator2_total_israel_funding: number | null;
}

interface SenatorFlat {
  state: string;
  state_name: string;
  name: string;
  party: string | null;
  person_id: string | null;
  total_israel_funding: number;
}

type SortField = keyof SenatorFlat;
type SortDirection = 'asc' | 'desc';

export default function SenateDistrictsPage() {
  const [rows, setRows] = useState<SenateRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [stateFilter, setStateFilter] = useState('');
  const [visibleCount, setVisibleCount] = useState(50);
  const [selectedCycle, setSelectedCycle] = useState('2024');
  const [sortField, setSortField] = useState<SortField>('total_israel_funding');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  useEffect(() => {
    const fetchRows = async () => {
      try {
        setLoading(true);
        const resp = await fetch(`/api/senate-districts?cycle=${selectedCycle}`);
        const json = await resp.json();
        if (!resp.ok || !json.success) throw new Error(json.error || 'Failed to load');
        setRows(json.data || []);
      } catch (e: any) {
        setError(e?.message || 'Failed to fetch senate data');
      } finally {
        setLoading(false);
      }
    };
    fetchRows();
  }, [selectedCycle]);

  const states = useMemo(() => [...new Set(rows.map(r => r.state))].sort(), [rows]);

  const senators: SenatorFlat[] = useMemo(() => {
    const list: SenatorFlat[] = [];
    for (const r of rows) {
      if (r.senator1_name) {
        list.push({
          state: r.state,
          state_name: r.state_name,
          name: r.senator1_name,
          party: r.senator1_party,
          person_id: r.senator1_person_id,
          total_israel_funding: Number(r.senator1_total_israel_funding || 0),
        });
      }
      if (r.senator2_name) {
        list.push({
          state: r.state,
          state_name: r.state_name,
          name: r.senator2_name,
          party: r.senator2_party,
          person_id: r.senator2_person_id,
          total_israel_funding: Number(r.senator2_total_israel_funding || 0),
        });
      }
    }
    return list;
  }, [rows]);

  const filtered = useMemo(() => senators.filter(r => {
    const q = searchTerm.trim().toLowerCase();
    const matches = !q ||
      r.state.toLowerCase().includes(q) ||
      (r.state_name || '').toLowerCase().includes(q) ||
      (r.name || '').toLowerCase().includes(q);
    const stateOk = !stateFilter || r.state === stateFilter;
    return matches && stateOk;
  }), [senators, searchTerm, stateFilter]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a: any, b: any) => {
      const av = a[sortField] ?? '';
      const bv = b[sortField] ?? '';
      let cmp = 0;
      if (typeof av === 'number' && typeof bv === 'number') cmp = av - bv;
      else cmp = String(av).localeCompare(String(bv));
      return sortDirection === 'asc' ? cmp : -cmp;
    });
    return arr;
  }, [filtered, sortField, sortDirection]);

  const visible = sorted.slice(0, visibleCount);

  const stats = useMemo(() => {
    const totalFunding = senators.reduce((s, r) => s + r.total_israel_funding, 0);
    const avgFunding = totalFunding / (senators.length || 1);
    const totalSenators = senators.length;

    const zeroFunding = senators.filter(r => r.total_israel_funding === 0).length;
    const under10k = senators.filter(r => r.total_israel_funding > 0 && r.total_israel_funding < 10000).length;
    const between10k50k = senators.filter(r => r.total_israel_funding >= 10000 && r.total_israel_funding < 50000).length;
    const gte50k = senators.filter(r => r.total_israel_funding >= 50000).length;

    // Party funding across senators
    const partyFunding = senators.reduce((acc: Record<string, { count: number; total: number }>, r) => {
      const key = r.party || 'OTHER';
      if (!acc[key]) acc[key] = { count: 0, total: 0 };
      acc[key].count += 1;
      acc[key].total += r.total_israel_funding || 0;
      return acc;
    }, {});

    return { totalFunding, avgFunding, totalSenators, zeroFunding, under10k, between10k50k, gte50k, partyFunding };
  }, [senators]);

  const onSort = (field: SortField) => {
    setSortField(prev => field);
    setSortDirection(prev => (sortField === field && prev === 'asc') ? 'desc' : 'asc');
  };

  const sortIcon = (field: SortField) => sortField === field ? (sortDirection === 'asc' ? '^' : 'v') : '<>';

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
            title="Senate Districts"
            subtitle="All 50 states with senator information and Israel funding data"
            cycle={selectedCycle}
            onCycleChange={setSelectedCycle}
            active="senate-list"
          />
        </div>

        {/* Stats Overview */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Israel Funding Overview (Senators)</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{formatCurrency(stats.totalFunding)}</div>
              <div className="text-sm text-blue-600">Total Israel Funding</div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{formatCurrency(stats.avgFunding)}</div>
              <div className="text-sm text-green-600">Average per Senator</div>
            </div>
          </div>

          <h3 className="text-lg font-semibold text-gray-900 mb-3">Funding Distribution</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-2">
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
          <div className="mt-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Funding by Party (All Senators)</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {Object.entries(stats.partyFunding).map(([party, data]: any) => (
                <div key={party} className="p-4 rounded-lg" style={{background: '#f9fafb'}}>
                  <div className="text-lg font-semibold text-gray-800 mb-2">{party}</div>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between"><span>Senators</span><span className="font-semibold">{formatNumber(data.count)}</span></div>
                    <div className="flex justify-between"><span>Total Funding</span><span className="font-semibold">{formatCurrency(data.total)}</span></div>
                    <div className="flex justify-between"><span>Avg per Senator</span><span className="font-semibold">{formatCurrency(data.total / (data.count || 1))}</span></div>
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
                placeholder="Search by state or senator name..."
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
                {states.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Results Count */}
        <div className="mb-4">
          <p className="text-sm text-gray-600">Showing {visible.length} of {sorted.length} senators</p>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => onSort('state')}>
                    <div className="flex items-center space-x-1"><span>State</span><span className="text-lg">{sortIcon('state')}</span></div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => onSort('name')}>
                    <div className="flex items-center space-x-1"><span>Senator</span><span className="text-lg">{sortIcon('name')}</span></div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => onSort('party')}>
                    <div className="flex items-center space-x-1"><span>Party</span><span className="text-lg">{sortIcon('party')}</span></div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => onSort('total_israel_funding')}>
                    <div className="flex items-center space-x-1"><span>Israel Funding</span><span className="text-lg">{sortIcon('total_israel_funding')}</span></div>
                  </th>
                  
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {visible.map((r, idx) => (
                  <tr key={`${r.state}-${r.person_id || r.name || 'unknown'}-${idx}`} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{r.state} <span className="text-gray-500">{r.state_name}</span></td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {r.person_id ? (
                        <Link href={`/candidates/${r.person_id}`} className="text-blue-600 hover:text-blue-800 hover:underline">{r.name}</Link>
                      ) : r.name || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        r.party === 'DEM' ? 'bg-blue-100 text-blue-800' :
                        r.party === 'REP' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
                      }`}>{r.party || 'OTHER'}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {r.person_id ? (
                        <Link href={`/israel-lobby/${r.person_id}`} className="text-blue-600 hover:text-blue-800 hover:underline">{formatCurrency(r.total_israel_funding || 0)}</Link>
                      ) : formatCurrency(r.total_israel_funding || 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {visibleCount < sorted.length && (
            <div className="px-6 py-4 bg-gray-50 text-center">
              <button onClick={() => setVisibleCount(prev => Math.min(prev + 50, sorted.length))} className="text-blue-600 hover:text-blue-800 font-medium">
                Load More ({sorted.length - visibleCount} remaining)
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
