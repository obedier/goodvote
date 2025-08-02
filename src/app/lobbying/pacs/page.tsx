'use client';

import { useState, useEffect } from 'react';
import { Search, Filter, Download, TrendingUp, Users, DollarSign } from 'lucide-react';
import Breadcrumbs from '@/components/ui/Breadcrumbs';
import { BreadcrumbItem } from '@/types';

interface PACData {
  committee_id: string;
  committee_name: string;
  total_receipts: number;
  total_disbursements: number;
  cash_on_hand: number;
  committee_type?: string;
  committee_party?: string;
}

export default function PACsPage() {
  const [pacs, setPacs] = useState<PACData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    election_year: '2024',
    committee_name: '',
    min_receipts: '',
    max_receipts: '',
  });
  const [stats, setStats] = useState({
    total_pacs: 0,
    total_receipts: 0,
    total_disbursements: 0,
    avg_receipts: 0,
  });

  const breadcrumbs: BreadcrumbItem[] = [
    { label: 'Lobbying & Groups', href: '/lobbying' },
    { label: 'PACs' },
  ];

  useEffect(() => {
    fetchPACs();
  }, [filters]);

  const fetchPACs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append('action', 'top');
      params.append('election_year', filters.election_year);
      params.append('limit', '100');

      const response = await fetch(`/api/pacs?${params.toString()}`);
      const data = await response.json();

      if (data.success) {
        setPacs(data.data || []);
        
        // Calculate stats
        const totalReceipts = data.data?.reduce((sum: number, pac: PACData) => sum + (pac.total_receipts || 0), 0) || 0;
        const totalDisbursements = data.data?.reduce((sum: number, pac: PACData) => sum + (pac.total_disbursements || 0), 0) || 0;
        const avgReceipts = data.data?.length > 0 ? totalReceipts / data.data.length : 0;
        
        setStats({
          total_pacs: data.data?.length || 0,
          total_receipts: totalReceipts,
          total_disbursements: totalDisbursements,
          avg_receipts: avgReceipts,
        });
      } else {
        setError(data.error || 'Failed to fetch PACs');
      }
    } catch (err) {
      setError('Failed to fetch PACs');
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

  const resetFilters = () => {
    setFilters({
      election_year: '2024',
      committee_name: '',
      min_receipts: '',
      max_receipts: '',
    });
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading PAC data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <p className="text-red-600">Error: {error}</p>
          <button
            onClick={fetchPACs}
            className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Breadcrumbs items={breadcrumbs} />
      
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Political Action Committees (PACs)
        </h1>
        <p className="text-gray-600">
          Explore campaign finance data for Political Action Committees. PACs are organizations 
          that raise and spend money to influence elections. Data is based on FEC filings and 
          updated monthly.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <Users className="h-8 w-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total PACs</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total_pacs.toLocaleString()}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <DollarSign className="h-8 w-8 text-green-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Receipts</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.total_receipts)}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <TrendingUp className="h-8 w-8 text-red-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Disbursements</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.total_disbursements)}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <DollarSign className="h-8 w-8 text-purple-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Avg Receipts</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.avg_receipts)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          {/* Election Year */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Election Year
            </label>
            <select
              value={filters.election_year}
              onChange={(e) => setFilters({ ...filters, election_year: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="2024">2024</option>
              <option value="2022">2022</option>
              <option value="2020">2020</option>
            </select>
          </div>

          {/* Committee Name Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Search PAC Name
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Search PAC names..."
                value={filters.committee_name}
                onChange={(e) => setFilters({ ...filters, committee_name: e.target.value })}
                className="w-full border border-gray-300 rounded-md pl-10 pr-3 py-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            </div>
          </div>

          {/* Min Receipts */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Min Receipts
            </label>
            <input
              type="number"
              placeholder="Min amount..."
              value={filters.min_receipts}
              onChange={(e) => setFilters({ ...filters, min_receipts: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Max Receipts */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Max Receipts
            </label>
            <input
              type="number"
              placeholder="Max amount..."
              value={filters.max_receipts}
              onChange={(e) => setFilters({ ...filters, max_receipts: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Reset Filters */}
        <div className="flex justify-between items-center">
          <button
            onClick={resetFilters}
            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
          >
            Reset Filters
          </button>
          <div className="text-sm text-gray-500">
            {pacs.length} PACs found
          </div>
        </div>
      </div>

      {/* PACs Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  PAC Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Receipts
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Disbursements
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cash on Hand
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Party
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {pacs.map((pac) => (
                <tr key={pac.committee_id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <a
                      href={`/lobbying/pacs/${pac.committee_id}`}
                      className="text-blue-600 hover:text-blue-700 font-medium"
                    >
                      {pac.committee_name}
                    </a>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {pac.committee_type || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                    {formatCurrency(pac.total_receipts)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatCurrency(pac.total_disbursements)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatCurrency(pac.cash_on_hand)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      pac.committee_party === 'DEM' ? 'bg-blue-100 text-blue-800' :
                      pac.committee_party === 'REP' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {pac.committee_party === 'DEM' ? 'Democrat' :
                       pac.committee_party === 'REP' ? 'Republican' :
                       pac.committee_party || 'N/A'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Export Button */}
      <div className="mt-6 text-right">
        <button className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
          <Download className="h-4 w-4 mr-2" />
          Export to CSV
        </button>
      </div>

      {/* Data Source Note */}
      <div className="mt-8 p-4 bg-blue-50 rounded-lg">
        <h3 className="text-sm font-medium text-blue-800 mb-2">Data Source</h3>
        <p className="text-sm text-blue-700">
          This data comes from Federal Election Commission (FEC) filings. PACs are required to 
          file regular reports disclosing their receipts and disbursements. The data is updated 
          monthly and reflects the most recent filings available. For more information about 
          campaign finance data, visit the{' '}
          <a href="https://www.fec.gov/campaign-finance-data/about-campaign-finance-data/" 
             className="underline hover:text-blue-600" target="_blank" rel="noopener noreferrer">
            FEC website
          </a>.
        </p>
      </div>
    </div>
  );
} 