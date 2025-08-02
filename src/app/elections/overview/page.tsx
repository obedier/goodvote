'use client';

import { useState, useEffect } from 'react';
import { Database, Users, DollarSign, TrendingUp, BarChart3, FileText } from 'lucide-react';
import Breadcrumbs from '@/components/ui/Breadcrumbs';
import { BreadcrumbItem } from '@/types';

interface FECTableData {
  table_name: string;
  record_count: number;
  description: string;
}

interface FECOverview {
  election_year: number;
  tables: FECTableData[];
  total_records: number;
}

export default function FECOverviewPage() {
  const [overview, setOverview] = useState<FECOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState('2024');

  const breadcrumbs: BreadcrumbItem[] = [
    { label: 'Elections', href: '/elections' },
    { label: 'FEC Data Overview' },
  ];

  useEffect(() => {
    fetchFECOverview();
  }, [selectedYear]);

  const fetchFECOverview = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/fec-overview?election_year=${selectedYear}`);
      const data = await response.json();

      if (data.success) {
        setOverview(data.data);
      } else {
        setError(data.error || 'Failed to fetch FEC overview');
      }
    } catch (err) {
      setError('Failed to fetch FEC overview');
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  const getTableIcon = (tableName: string) => {
    const icons: { [key: string]: any } = {
      'candidates': Users,
      'committees': Database,
      'contributions': DollarSign,
      'expenditures': TrendingUp,
      'committee_transactions': BarChart3,
      'pac_summaries': FileText,
      'current_campaigns': Users,
      'candidate_committee_linkages': Database
    };
    return icons[tableName] || Database;
  };

  const getTableColor = (tableName: string) => {
    const colors: { [key: string]: string } = {
      'candidates': 'text-blue-600',
      'committees': 'text-green-600',
      'contributions': 'text-purple-600',
      'expenditures': 'text-red-600',
      'committee_transactions': 'text-orange-600',
      'pac_summaries': 'text-indigo-600',
      'current_campaigns': 'text-pink-600',
      'candidate_committee_linkages': 'text-yellow-600'
    };
    return colors[tableName] || 'text-gray-600';
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading FEC data overview...</p>
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
            onClick={fetchFECOverview}
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
          FEC Data Overview
        </h1>
        <p className="text-gray-600">
          Comprehensive overview of all Federal Election Commission data tables. 
          This page shows the complete picture of campaign finance data available 
          in the GoodVote platform.
        </p>
      </div>

      {/* Year Selector */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
        <div className="flex items-center justify-between">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Election Year
            </label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="2024">2024</option>
              <option value="2022">2022</option>
              <option value="2020">2020</option>
            </select>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-600">Total Records</p>
            <p className="text-2xl font-bold text-gray-900">
              {overview ? formatNumber(overview.total_records) : '0'}
            </p>
          </div>
        </div>
      </div>

      {/* FEC Tables Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {overview?.tables.map((table) => {
          const IconComponent = getTableIcon(table.table_name);
          const iconColor = getTableColor(table.table_name);
          
          return (
            <div key={table.table_name} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center mb-4">
                <IconComponent className={`h-8 w-8 ${iconColor}`} />
                <div className="ml-4">
                  <h3 className="text-lg font-semibold text-gray-900 capitalize">
                    {table.table_name.replace(/_/g, ' ')}
                  </h3>
                  <p className="text-sm text-gray-600">{table.description}</p>
                </div>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-2xl font-bold text-gray-900">
                  {formatNumber(table.record_count)}
                </span>
                <span className="text-sm text-gray-500">records</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Data Source Information */}
      <div className="bg-blue-50 rounded-lg p-6 mb-8">
        <h3 className="text-lg font-semibold text-blue-800 mb-4">
          FEC Data Tables Overview
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium text-blue-700 mb-2">Core Data Tables</h4>
            <ul className="text-sm text-blue-600 space-y-1">
              <li>• <strong>Candidates:</strong> All candidates who filed with the FEC</li>
              <li>• <strong>Committees:</strong> All committees (PACs, campaigns, parties)</li>
              <li>• <strong>Contributions:</strong> All individual contributions</li>
              <li>• <strong>Expenditures:</strong> All operating expenditures</li>
              <li>• <strong>Committee Transactions:</strong> Committee-to-committee transfers</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-blue-700 mb-2">Summary & Linkage Tables</h4>
            <ul className="text-sm text-blue-600 space-y-1">
              <li>• <strong>PAC Summaries:</strong> Financial summaries for PACs</li>
              <li>• <strong>Current Campaigns:</strong> Active House/Senate campaigns</li>
              <li>• <strong>Candidate-Committee Linkages:</strong> Links candidates to committees</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Quick Links */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Explore FEC Data
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <a
            href="/politicians/congress"
            className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Users className="h-6 w-6 text-blue-600 mr-3" />
            <div>
              <p className="font-medium text-gray-900">Congress Members</p>
              <p className="text-sm text-gray-600">Browse current members</p>
            </div>
          </a>
          
          <a
            href="/lobbying/pacs"
            className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Database className="h-6 w-6 text-green-600 mr-3" />
            <div>
              <p className="font-medium text-gray-900">PACs</p>
              <p className="text-sm text-gray-600">Explore Political Action Committees</p>
            </div>
          </a>
          
          <a
            href="/search"
            className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <FileText className="h-6 w-6 text-purple-600 mr-3" />
            <div>
              <p className="font-medium text-gray-900">Search</p>
              <p className="text-sm text-gray-600">Search all FEC data</p>
            </div>
          </a>
        </div>
      </div>

      {/* Data Source Note */}
      <div className="mt-8 p-4 bg-gray-50 rounded-lg">
        <h3 className="text-sm font-medium text-gray-800 mb-2">Data Source</h3>
        <p className="text-sm text-gray-600">
          All data comes from Federal Election Commission (FEC) bulk data files. 
          The FEC provides comprehensive campaign finance data that is updated monthly. 
          For more information about FEC data usage restrictions, visit the{' '}
          <a href="https://www.fec.gov/updates/using-information-obtained-from-fec-reports/" 
             className="underline hover:text-gray-800" target="_blank" rel="noopener noreferrer">
            FEC website
          </a>.
        </p>
      </div>
    </div>
  );
} 