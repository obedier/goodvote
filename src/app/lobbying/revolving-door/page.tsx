'use client';

import { useState, useEffect } from 'react';
import { 
  Users, 
  Search, 
  Building, 
  TrendingUp, 
  Calendar,
  MapPin,
  ArrowRight,
  Filter
} from 'lucide-react';
import Breadcrumbs from '@/components/ui/Breadcrumbs';
import { BreadcrumbItem } from '@/types';

interface RevolvingDoorEntry {
  id: string;
  person_name: string;
  former_position: string;
  former_agency: string;
  current_position: string;
  current_organization: string;
  transition_date: string;
  industry: string;
  lobbying_focus: string;
  salary_change: number;
  influence_score: number;
}

export default function RevolvingDoorPage() {
  const [entries, setEntries] = useState<RevolvingDoorEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIndustry, setSelectedIndustry] = useState('');
  const [selectedAgency, setSelectedAgency] = useState('');

  const breadcrumbs: BreadcrumbItem[] = [
    { label: 'Lobbying & Groups', href: '/lobbying' },
    { label: 'Revolving Door' },
  ];

  useEffect(() => {
    fetchRevolvingDoorData();
  }, []);

  const fetchRevolvingDoorData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (selectedIndustry) params.append('industry', selectedIndustry);
      if (selectedAgency) params.append('agency', selectedAgency);
      
      const response = await fetch(`/api/lobbying/revolving-door?${params.toString()}`);
      const data = await response.json();

      if (data.success) {
        setEntries(data.data || []);
      } else {
        setError(data.error || 'Failed to fetch revolving door data');
      }
    } catch (err) {
      setError('Failed to fetch revolving door data');
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
      entry.person_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.former_agency.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.current_organization.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesIndustry = !selectedIndustry || entry.industry === selectedIndustry;
    const matchesAgency = !selectedAgency || entry.former_agency === selectedAgency;
    
    return matchesSearch && matchesIndustry && matchesAgency;
  });

  const industries = [...new Set(entries.map(entry => entry.industry))];
  const agencies = [...new Set(entries.map(entry => entry.former_agency))];

  const stats = {
    total_transitions: entries.length,
    avg_salary_increase: entries.reduce((sum, entry) => sum + entry.salary_change, 0) / entries.length,
    avg_influence_score: entries.reduce((sum, entry) => sum + entry.influence_score, 0) / entries.length,
    top_industry: industries.reduce((top, industry) => {
      const count = entries.filter(entry => entry.industry === industry).length;
      return count > (entries.filter(entry => entry.industry === top).length || 0) ? industry : top;
    }, ''),
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading revolving door data...</p>
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
            onClick={fetchRevolvingDoorData}
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
          Revolving Door Database
        </h1>
        <p className="text-gray-600">
          Track the movement of people between government positions and private sector lobbying. 
          Explore how former government officials influence policy through their new roles.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <Users className="h-8 w-8 text-blue-600 mr-4" />
            <div>
              <p className="text-2xl font-bold text-gray-900">{formatNumber(stats.total_transitions)}</p>
              <p className="text-sm text-gray-600">Total Transitions</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <TrendingUp className="h-8 w-8 text-green-600 mr-4" />
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(stats.avg_salary_increase)}
              </p>
              <p className="text-sm text-gray-600">Avg. Salary Increase</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <Building className="h-8 w-8 text-purple-600 mr-4" />
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
            <MapPin className="h-8 w-8 text-orange-600 mr-4" />
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.top_industry}</p>
              <p className="text-sm text-gray-600">Top Industry</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search People
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, agency, or organization..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Industry
            </label>
            <select
              value={selectedIndustry}
              onChange={(e) => setSelectedIndustry(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Industries</option>
              {industries.map((industry) => (
                <option key={industry} value={industry}>{industry}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Former Agency
            </label>
            <select
              value={selectedAgency}
              onChange={(e) => setSelectedAgency(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Agencies</option>
              {agencies.map((agency) => (
                <option key={agency} value={agency}>{agency}</option>
              ))}
            </select>
          </div>
          
          <div className="flex items-end">
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedIndustry('');
                setSelectedAgency('');
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
                <h3 className="text-xl font-bold text-gray-900 mb-2">{entry.person_name}</h3>
                <div className="flex items-center space-x-4 text-sm text-gray-600">
                  <span className="inline-block px-2 py-1 rounded-full bg-blue-100 text-blue-800 text-xs font-medium">
                    {entry.industry}
                  </span>
                  <span className="inline-block px-2 py-1 rounded-full bg-green-100 text-green-800 text-xs font-medium">
                    {entry.transition_date}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-lg font-semibold text-gray-900">
                  {formatCurrency(entry.salary_change)}
                </p>
                <p className="text-sm text-gray-600">Salary Increase</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-4">Government Position</h4>
                <div className="space-y-2">
                  <p className="font-medium text-gray-900">{entry.former_position}</p>
                  <p className="text-sm text-gray-600">{entry.former_agency}</p>
                </div>
              </div>

              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-4">Private Sector Role</h4>
                <div className="space-y-2">
                  <p className="font-medium text-gray-900">{entry.current_position}</p>
                  <p className="text-sm text-gray-600">{entry.current_organization}</p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-center mb-6">
              <ArrowRight className="h-6 w-6 text-gray-400" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-4">Lobbying Focus</h4>
                <p className="text-gray-700">{entry.lobbying_focus}</p>
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
              </div>
            </div>
          </div>
        ))}
        
        {filteredEntries.length === 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
            <p className="text-gray-500">No revolving door entries found matching your criteria.</p>
          </div>
        )}
      </div>

      {/* Data Source Note */}
      <div className="mt-8 p-4 bg-gray-50 rounded-lg">
        <h3 className="text-sm font-medium text-gray-800 mb-2">Data Source</h3>
        <p className="text-sm text-gray-600">
          Revolving door data comes from lobbying disclosure reports, government employment records, 
          and public filings. This tracks the movement of people between government positions and 
          private sector lobbying roles, providing transparency into potential conflicts of interest 
          and influence patterns.
        </p>
      </div>
    </div>
  );
} 