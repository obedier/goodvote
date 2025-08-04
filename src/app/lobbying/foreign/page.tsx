'use client';

import { useState, useEffect } from 'react';
import { 
  Globe, 
  Search, 
  DollarSign, 
  Users, 
  TrendingUp,
  Flag,
  Building,
  Calendar
} from 'lucide-react';
import Breadcrumbs from '@/components/ui/Breadcrumbs';
import { BreadcrumbItem } from '@/types';

interface ForeignLobbyingEntry {
  id: string;
  country: string;
  organization_name: string;
  lobbyist_name: string;
  registration_date: string;
  total_spending: number;
  lobbying_focus: string;
  government_entity: string;
  activities: Array<{
    date: string;
    activity: string;
    amount: number;
  }>;
  influence_score: number;
}

export default function ForeignLobbyWatchPage() {
  const [entries, setEntries] = useState<ForeignLobbyingEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCountry, setSelectedCountry] = useState('');
  const [selectedFocus, setSelectedFocus] = useState('');

  const breadcrumbs: BreadcrumbItem[] = [
    { label: 'Lobbying & Groups', href: '/lobbying' },
    { label: 'Foreign Lobby Watch' },
  ];

  useEffect(() => {
    fetchForeignLobbyingData();
  }, []);

  const fetchForeignLobbyingData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (selectedCountry) params.append('country', selectedCountry);
      if (selectedFocus) params.append('focus', selectedFocus);
      
      const response = await fetch(`/api/lobbying/foreign?${params.toString()}`);
      const data = await response.json();

      if (data.success) {
        setEntries(data.data || []);
      } else {
        setError(data.error || 'Failed to fetch foreign lobbying data');
      }
    } catch (err) {
      setError('Failed to fetch foreign lobbying data');
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

  const filteredEntries = entries.filter(entry => {
    const matchesSearch = !searchTerm || 
      entry.country.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.organization_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.lobbyist_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCountry = !selectedCountry || entry.country === selectedCountry;
    const matchesFocus = !selectedFocus || entry.lobbying_focus.toLowerCase().includes(selectedFocus.toLowerCase());
    
    return matchesSearch && matchesCountry && matchesFocus;
  });

  const countries = [...new Set(entries.map(entry => entry.country))];
  const focuses = [...new Set(entries.map(entry => entry.lobbying_focus.split(', ')[0]))];

  const stats = {
    total_countries: countries.length,
    total_spending: entries.reduce((sum, entry) => sum + entry.total_spending, 0),
    avg_influence_score: entries.reduce((sum, entry) => sum + entry.influence_score, 0) / entries.length,
    top_country: countries.reduce((top, country) => {
      const spending = entries.filter(entry => entry.country === country)
        .reduce((sum, entry) => sum + entry.total_spending, 0);
      const topSpending = entries.filter(entry => entry.country === top)
        .reduce((sum, entry) => sum + entry.total_spending, 0);
      return spending > topSpending ? country : top;
    }, ''),
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading foreign lobbying data...</p>
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
            onClick={fetchForeignLobbyingData}
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
          Foreign Lobby Watch
        </h1>
        <p className="text-gray-600">
          Track foreign influence in American politics through lobbying activities, 
          spending patterns, and policy advocacy by international entities.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <Globe className="h-8 w-8 text-blue-600 mr-4" />
            <div>
              <p className="text-2xl font-bold text-gray-900">{formatNumber(stats.total_countries)}</p>
              <p className="text-sm text-gray-600">Countries Represented</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <DollarSign className="h-8 w-8 text-green-600 mr-4" />
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(stats.total_spending)}
              </p>
              <p className="text-sm text-gray-600">Total Foreign Spending</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <TrendingUp className="h-8 w-8 text-purple-600 mr-4" />
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {stats.avg_influence_score.toFixed(0)}
              </p>
              <p className="text-sm text-gray-600">Avg. Influence Score</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <Flag className="h-8 w-8 text-orange-600 mr-4" />
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.top_country}</p>
              <p className="text-sm text-gray-600">Top Spender</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by country, organization, or lobbyist..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Country
            </label>
            <select
              value={selectedCountry}
              onChange={(e) => setSelectedCountry(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Countries</option>
              {countries.map((country) => (
                <option key={country} value={country}>{country}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Lobbying Focus
            </label>
            <select
              value={selectedFocus}
              onChange={(e) => setSelectedFocus(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Focus Areas</option>
              {focuses.map((focus) => (
                <option key={focus} value={focus}>{focus}</option>
              ))}
            </select>
          </div>
          
          <div className="flex items-end">
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedCountry('');
                setSelectedFocus('');
              }}
              className="w-full bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Entries List */}
      <div className="space-y-6">
        {filteredEntries.map((entry) => (
          <div key={entry.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">{entry.country}</h3>
                <div className="flex items-center space-x-4 text-sm text-gray-600">
                  <span className="inline-block px-2 py-1 rounded-full bg-blue-100 text-blue-800 text-xs font-medium">
                    {entry.organization_name}
                  </span>
                  <span className="inline-block px-2 py-1 rounded-full bg-green-100 text-green-800 text-xs font-medium">
                    {entry.registration_date}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(entry.total_spending)}
                </p>
                <p className="text-sm text-gray-600">Total Spending</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-4">Organization Details</h4>
                <div className="space-y-2">
                  <p className="font-medium text-gray-900">{entry.organization_name}</p>
                  <p className="text-sm text-gray-600">Lobbyist: {entry.lobbyist_name}</p>
                  <p className="text-sm text-gray-600">Government Entity: {entry.government_entity}</p>
                </div>
              </div>

              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-4">Lobbying Focus</h4>
                <p className="text-gray-700">{entry.lobbying_focus}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-4">Recent Activities</h4>
                <div className="space-y-3">
                  {entry.activities.map((activity, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">{activity.activity}</p>
                        <p className="text-sm text-gray-600">{activity.date}</p>
                      </div>
                      <p className="font-medium text-gray-900">
                        {formatCurrency(activity.amount)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-4">Influence Score</h4>
                <div className="flex items-center">
                  <div className="w-full bg-gray-200 rounded-full h-2 mr-4">
                    <div 
                      className="bg-blue-600 h-2 rounded-full" 
                      style={{ width: `${entry.influence_score}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-medium text-gray-900">{entry.influence_score}/100</span>
                </div>
                <p className="text-sm text-gray-600 mt-2">
                  Based on spending, access, and policy impact
                </p>
              </div>
            </div>
          </div>
        ))}
        
        {filteredEntries.length === 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
            <p className="text-gray-500">No foreign lobbying entries found matching your criteria.</p>
          </div>
        )}
      </div>

      {/* Data Source Note */}
      <div className="mt-8 p-4 bg-gray-50 rounded-lg">
        <h3 className="text-sm font-medium text-gray-800 mb-2">Data Source</h3>
        <p className="text-sm text-gray-600">
          Foreign lobbying data comes from Foreign Agents Registration Act (FARA) filings, 
          lobbying disclosure reports, and public records. This tracks foreign influence 
          in American politics, including spending, activities, and policy advocacy by 
          international entities and their representatives.
        </p>
      </div>
    </div>
  );
} 