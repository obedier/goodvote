'use client';

import { useState, useEffect } from 'react';
import { 
  Building, 
  Search, 
  DollarSign, 
  Users, 
  TrendingUp,
  Filter,
  Calendar,
  MapPin
} from 'lucide-react';
import Breadcrumbs from '@/components/ui/Breadcrumbs';
import { BreadcrumbItem } from '@/types';

interface Organization {
  id: string;
  name: string;
  type: string;
  industry: string;
  total_spending: number;
  lobbyist_count: number;
  pac_count: number;
  top_lobbyists: Array<{
    name: string;
    position: string;
    former_government: boolean;
  }>;
  recent_activities: Array<{
    date: string;
    activity: string;
    amount: number;
  }>;
}

export default function OrganizationsPage() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIndustry, setSelectedIndustry] = useState('');
  const [selectedType, setSelectedType] = useState('');

  const breadcrumbs: BreadcrumbItem[] = [
    { label: 'Lobbying & Groups', href: '/lobbying' },
    { label: 'Organizations' },
  ];

  useEffect(() => {
    fetchOrganizations();
  }, []);

  const fetchOrganizations = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (selectedIndustry) params.append('industry', selectedIndustry);
      if (selectedType) params.append('type', selectedType);
      
      const response = await fetch(`/api/lobbying/organizations?${params.toString()}`);
      const data = await response.json();

      if (data.success) {
        setOrganizations(data.data || []);
      } else {
        setError(data.error || 'Failed to fetch organizations');
      }
    } catch (err) {
      setError('Failed to fetch organizations');
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

  const filteredOrganizations = organizations.filter(org => {
    const matchesSearch = !searchTerm || 
      org.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      org.industry.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesIndustry = !selectedIndustry || org.industry === selectedIndustry;
    const matchesType = !selectedType || org.type === selectedType;
    
    return matchesSearch && matchesIndustry && matchesType;
  });

  const industries = [...new Set(organizations.map(org => org.industry))];
  const types = [...new Set(organizations.map(org => org.type))];

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading organizations...</p>
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
            onClick={fetchOrganizations}
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
          Organizations & Lobbying
        </h1>
        <p className="text-gray-600">
          Explore organizations, their lobbying activities, and political influence in American politics.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <Building className="h-8 w-8 text-blue-600 mr-4" />
            <div>
              <p className="text-2xl font-bold text-gray-900">{formatNumber(organizations.length)}</p>
              <p className="text-sm text-gray-600">Total Organizations</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <DollarSign className="h-8 w-8 text-green-600 mr-4" />
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(organizations.reduce((sum, org) => sum + org.total_spending, 0))}
              </p>
              <p className="text-sm text-gray-600">Total Spending</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <Users className="h-8 w-8 text-purple-600 mr-4" />
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {formatNumber(organizations.reduce((sum, org) => sum + org.lobbyist_count, 0))}
              </p>
              <p className="text-sm text-gray-600">Total Lobbyists</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <TrendingUp className="h-8 w-8 text-orange-600 mr-4" />
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {formatNumber(organizations.reduce((sum, org) => sum + org.pac_count, 0))}
              </p>
              <p className="text-sm text-gray-600">Total PACs</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search Organizations
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name or industry..."
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
              Organization Type
            </label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Types</option>
              {types.map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
          
          <div className="flex items-end">
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedIndustry('');
                setSelectedType('');
              }}
              className="w-full bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Organizations List */}
      <div className="space-y-6">
        {filteredOrganizations.map((org) => (
          <div key={org.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">{org.name}</h3>
                <div className="flex items-center space-x-4 text-sm text-gray-600">
                  <span className="inline-block px-2 py-1 rounded-full bg-blue-100 text-blue-800 text-xs font-medium">
                    {org.type}
                  </span>
                  <span className="inline-block px-2 py-1 rounded-full bg-green-100 text-green-800 text-xs font-medium">
                    {org.industry}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(org.total_spending)}
                </p>
                <p className="text-sm text-gray-600">Total Spending</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div className="text-center">
                <p className="text-lg font-semibold text-gray-900">{org.lobbyist_count}</p>
                <p className="text-sm text-gray-600">Lobbyists</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-semibold text-gray-900">{org.pac_count}</p>
                <p className="text-sm text-gray-600">PACs</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-semibold text-gray-900">
                  {formatCurrency(org.total_spending / org.lobbyist_count)}
                </p>
                <p className="text-sm text-gray-600">Per Lobbyist</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-4">Top Lobbyists</h4>
                <div className="space-y-3">
                  {org.top_lobbyists.map((lobbyist, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">{lobbyist.name}</p>
                        <p className="text-sm text-gray-600">{lobbyist.position}</p>
                      </div>
                      {lobbyist.former_government && (
                        <span className="inline-block px-2 py-1 rounded-full bg-yellow-100 text-yellow-800 text-xs font-medium">
                          Former Gov
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-4">Recent Activities</h4>
                <div className="space-y-3">
                  {org.recent_activities.map((activity, index) => (
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
            </div>
          </div>
        ))}
        
        {filteredOrganizations.length === 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
            <p className="text-gray-500">No organizations found matching your criteria.</p>
          </div>
        )}
      </div>

      {/* Data Source Note */}
      <div className="mt-8 p-4 bg-gray-50 rounded-lg">
        <h3 className="text-sm font-medium text-gray-800 mb-2">Data Source</h3>
        <p className="text-sm text-gray-600">
          Organization data comes from lobbying disclosure reports and Federal Election Commission filings. 
          This includes organizational spending, lobbyist information, and political activities. 
          Data is updated regularly and provides transparency into organizational influence in politics.
        </p>
      </div>
    </div>
  );
} 