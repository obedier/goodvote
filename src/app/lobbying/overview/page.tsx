'use client';

import { useState, useEffect } from 'react';
import { 
  Building, 
  Users, 
  DollarSign, 
  TrendingUp, 
  Globe,
  Search,
  BarChart3,
  Calendar,
  MapPin
} from 'lucide-react';
import Breadcrumbs from '@/components/ui/Breadcrumbs';
import { BreadcrumbItem } from '@/types';

interface LobbyingStats {
  total_pacs: number;
  total_organizations: number;
  total_lobbyists: number;
  total_spending: number;
  top_industries: Array<{
    industry: string;
    amount: number;
    pac_count: number;
  }>;
  spending_trends: Array<{
    year: number;
    amount: number;
    pac_count: number;
  }>;
  top_spenders: Array<{
    name: string;
    amount: number;
    type: string;
  }>;
}

export default function LobbyingOverviewPage() {
  const [stats, setStats] = useState<LobbyingStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const breadcrumbs: BreadcrumbItem[] = [
    { label: 'Lobbying & Groups', href: '/lobbying' },
    { label: 'Overview' },
  ];

  useEffect(() => {
    fetchLobbyingData();
  }, []);

  const fetchLobbyingData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/lobbying/overview?election_year=2024');
      const data = await response.json();

      if (data.success) {
        setStats(data.data);
      } else {
        setError(data.error || 'Failed to fetch lobbying data');
      }
    } catch (err) {
      setError('Failed to fetch lobbying data');
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

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading lobbying overview...</p>
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <p className="text-red-600">Error: {error || 'Failed to load data'}</p>
          <button
            onClick={fetchLobbyingData}
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
          Lobbying & Influence Overview
        </h1>
        <p className="text-gray-600">
          Explore the landscape of political influence through PACs, organizations, 
          and lobbying activities in American politics.
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <Building className="h-8 w-8 text-blue-600 mr-4" />
            <div>
              <p className="text-2xl font-bold text-gray-900">{formatNumber(stats.total_pacs)}</p>
              <p className="text-sm text-gray-600">Political Action Committees</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <Users className="h-8 w-8 text-green-600 mr-4" />
            <div>
              <p className="text-2xl font-bold text-gray-900">{formatNumber(stats.total_organizations)}</p>
              <p className="text-sm text-gray-600">Organizations</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <Globe className="h-8 w-8 text-purple-600 mr-4" />
            <div>
              <p className="text-2xl font-bold text-gray-900">{formatNumber(stats.total_lobbyists)}</p>
              <p className="text-sm text-gray-600">Registered Lobbyists</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <DollarSign className="h-8 w-8 text-orange-600 mr-4" />
            <div>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.total_spending)}</p>
              <p className="text-sm text-gray-600">Total Spending</p>
            </div>
          </div>
        </div>
      </div>

      {/* Top Industries */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Top Industries by Spending</h2>
        <div className="space-y-4">
          {stats.top_industries.map((industry, index) => (
            <div key={index} className="flex items-center justify-between">
              <div className="flex items-center">
                <span className="text-lg font-medium text-gray-900">{industry.industry}</span>
                <span className="ml-2 text-sm text-gray-500">({industry.pac_count} PACs)</span>
              </div>
              <div className="text-right">
                <p className="text-lg font-semibold text-gray-900">
                  {formatCurrency(industry.amount)}
                </p>
                <p className="text-sm text-gray-500">
                  {((industry.amount / stats.total_spending) * 100).toFixed(1)}% of total
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Spending Trends */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Spending Trends</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {stats.spending_trends.map((trend) => (
            <div key={trend.year} className="text-center">
              <p className="text-2xl font-bold text-gray-900">{trend.year}</p>
              <p className="text-lg font-semibold text-blue-600">
                {formatCurrency(trend.amount)}
              </p>
              <p className="text-sm text-gray-500">{formatNumber(trend.pac_count)} PACs</p>
            </div>
          ))}
        </div>
      </div>

      {/* Top Spenders */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Top PAC Spenders</h2>
        <div className="space-y-4">
          {stats.top_spenders.map((spender, index) => (
            <div key={index} className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">{spender.name}</p>
                <p className="text-sm text-gray-500">{spender.type}</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-semibold text-gray-900">
                  {formatCurrency(spender.amount)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <a 
          href="/lobbying/pacs" 
          className="bg-blue-600 text-white p-6 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <div className="flex items-center mb-4">
            <Building className="h-8 w-8 mr-3" />
            <h3 className="text-xl font-semibold">Explore PACs</h3>
          </div>
          <p className="text-blue-100">
            Search and analyze Political Action Committees by industry, spending, and influence.
          </p>
        </a>
        
        <a 
          href="/lobbying/organizations" 
          className="bg-green-600 text-white p-6 rounded-lg hover:bg-green-700 transition-colors"
        >
          <div className="flex items-center mb-4">
            <Users className="h-8 w-8 mr-3" />
            <h3 className="text-xl font-semibold">Organizations</h3>
          </div>
          <p className="text-green-100">
            Discover organizations and their political activities, lobbying efforts, and influence.
          </p>
        </a>
        
        <a 
          href="/lobbying/revolving-door" 
          className="bg-purple-600 text-white p-6 rounded-lg hover:bg-purple-700 transition-colors"
        >
          <div className="flex items-center mb-4">
            <TrendingUp className="h-8 w-8 mr-3" />
            <h3 className="text-xl font-semibold">Revolving Door</h3>
          </div>
          <p className="text-purple-100">
            Track the movement of people between government positions and private sector lobbying.
          </p>
        </a>
      </div>

      {/* Data Source Note */}
      <div className="mt-8 p-4 bg-gray-50 rounded-lg">
        <h3 className="text-sm font-medium text-gray-800 mb-2">Data Source</h3>
        <p className="text-sm text-gray-600">
          Lobbying data comes from Federal Election Commission filings and lobbying disclosure reports. 
          This includes PAC spending, organizational activities, and registered lobbyist information. 
          Data is updated regularly and provides transparency into the role of money and influence in politics.
        </p>
      </div>
    </div>
  );
} 