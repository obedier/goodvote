'use client';

import { useState, useEffect } from 'react';
import { Search, MapPin, DollarSign, Users, TrendingUp } from 'lucide-react';
import Breadcrumbs from '@/components/ui/Breadcrumbs';
import { BreadcrumbItem } from '@/types';

interface StateData {
  state: string;
  total_contributions: number;
  total_recipients: number;
  top_cities: Array<{ city: string; amount: number }>;
  top_contributors: Array<{ name: string; amount: number }>;
  party_breakdown: {
    democrat: number;
    republican: number;
    other: number;
  };
}

const US_STATES = [
  { code: 'AL', name: 'Alabama' },
  { code: 'AK', name: 'Alaska' },
  { code: 'AZ', name: 'Arizona' },
  { code: 'AR', name: 'Arkansas' },
  { code: 'CA', name: 'California' },
  { code: 'CO', name: 'Colorado' },
  { code: 'CT', name: 'Connecticut' },
  { code: 'DE', name: 'Delaware' },
  { code: 'FL', name: 'Florida' },
  { code: 'GA', name: 'Georgia' },
  { code: 'HI', name: 'Hawaii' },
  { code: 'ID', name: 'Idaho' },
  { code: 'IL', name: 'Illinois' },
  { code: 'IN', name: 'Indiana' },
  { code: 'IA', name: 'Iowa' },
  { code: 'KS', name: 'Kansas' },
  { code: 'KY', name: 'Kentucky' },
  { code: 'LA', name: 'Louisiana' },
  { code: 'ME', name: 'Maine' },
  { code: 'MD', name: 'Maryland' },
  { code: 'MA', name: 'Massachusetts' },
  { code: 'MI', name: 'Michigan' },
  { code: 'MN', name: 'Minnesota' },
  { code: 'MS', name: 'Mississippi' },
  { code: 'MO', name: 'Missouri' },
  { code: 'MT', name: 'Montana' },
  { code: 'NE', name: 'Nebraska' },
  { code: 'NV', name: 'Nevada' },
  { code: 'NH', name: 'New Hampshire' },
  { code: 'NJ', name: 'New Jersey' },
  { code: 'NM', name: 'New Mexico' },
  { code: 'NY', name: 'New York' },
  { code: 'NC', name: 'North Carolina' },
  { code: 'ND', name: 'North Dakota' },
  { code: 'OH', name: 'Ohio' },
  { code: 'OK', name: 'Oklahoma' },
  { code: 'OR', name: 'Oregon' },
  { code: 'PA', name: 'Pennsylvania' },
  { code: 'RI', name: 'Rhode Island' },
  { code: 'SC', name: 'South Carolina' },
  { code: 'SD', name: 'South Dakota' },
  { code: 'TN', name: 'Tennessee' },
  { code: 'TX', name: 'Texas' },
  { code: 'UT', name: 'Utah' },
  { code: 'VT', name: 'Vermont' },
  { code: 'VA', name: 'Virginia' },
  { code: 'WA', name: 'Washington' },
  { code: 'WV', name: 'West Virginia' },
  { code: 'WI', name: 'Wisconsin' },
  { code: 'WY', name: 'Wyoming' },
];

export default function GetLocalPage() {
  const [selectedState, setSelectedState] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [stateData, setStateData] = useState<StateData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'state' | 'zip'>('state');

  const breadcrumbs: BreadcrumbItem[] = [
    { label: 'Elections', href: '/elections' },
    { label: 'Get Local!' },
  ];

  const fetchStateData = async (stateCode: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/state-data?state=${stateCode}&election_year=2024`);
      const data = await response.json();
      
      if (data.success) {
        setStateData(data.data);
      } else {
        setError(data.error || 'Failed to fetch state data');
      }
    } catch (err) {
      setError('Failed to fetch state data');
    } finally {
      setLoading(false);
    }
  };

  const handleStateSelect = (stateCode: string) => {
    setSelectedState(stateCode);
    fetchStateData(stateCode);
  };

  const handleZipCodeSearch = () => {
    if (zipCode.length === 5) {
      // Implement zip code search
      console.log('Searching for zip code:', zipCode);
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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Breadcrumbs items={breadcrumbs} />
      
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Get Local! - Discover Campaign Finance in Your State
        </h1>
        <p className="text-gray-600">
          Explore campaign finance data by state and zip code. See who's making political 
          contributions in your area and where the money is flowing.
        </p>
      </div>

      {/* Search Interface */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
        <div className="flex flex-col md:flex-row gap-4">
          {/* State Selection */}
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select State
            </label>
            <select
              value={selectedState}
              onChange={(e) => handleStateSelect(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Choose a state...</option>
              {US_STATES.map((state) => (
                <option key={state.code} value={state.code}>
                  {state.name}
                </option>
              ))}
            </select>
          </div>

          {/* Zip Code Search */}
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Or Enter ZIP Code
            </label>
            <div className="flex">
              <input
                type="text"
                placeholder="Enter ZIP code..."
                value={zipCode}
                onChange={(e) => setZipCode(e.target.value)}
                className="flex-1 border border-gray-300 rounded-l-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                maxLength={5}
              />
              <button
                onClick={handleZipCodeSearch}
                className="bg-blue-600 text-white px-4 py-2 rounded-r-md hover:bg-blue-700"
              >
                <Search className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* State Data Display */}
      {loading && (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading state data...</p>
        </div>
      )}

      {error && (
        <div className="text-center py-8">
          <p className="text-red-600">Error: {error}</p>
        </div>
      )}

      {stateData && !loading && (
        <div className="space-y-8">
          {/* State Overview */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              {US_STATES.find(s => s.code === stateData.state)?.name} Campaign Finance Overview
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div className="text-center">
                <DollarSign className="h-8 w-8 text-green-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(stateData.total_contributions)}
                </p>
                <p className="text-sm text-gray-600">Total Contributions</p>
              </div>
              
              <div className="text-center">
                <Users className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-gray-900">
                  {stateData.total_recipients.toLocaleString()}
                </p>
                <p className="text-sm text-gray-600">Recipients</p>
              </div>
              
              <div className="text-center">
                <TrendingUp className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(stateData.total_contributions / stateData.total_recipients)}
                </p>
                <p className="text-sm text-gray-600">Average Contribution</p>
              </div>
            </div>

            {/* Party Breakdown */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Party Breakdown</h3>
              <div className="flex space-x-4">
                <div className="flex-1">
                  <div className="flex justify-between text-sm mb-1">
                    <span>Democrats</span>
                    <span>{stateData.party_breakdown.democrat}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full" 
                      style={{ width: `${stateData.party_breakdown.democrat}%` }}
                    ></div>
                  </div>
                </div>
                
                <div className="flex-1">
                  <div className="flex justify-between text-sm mb-1">
                    <span>Republicans</span>
                    <span>{stateData.party_breakdown.republican}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-red-600 h-2 rounded-full" 
                      style={{ width: `${stateData.party_breakdown.republican}%` }}
                    ></div>
                  </div>
                </div>
                
                <div className="flex-1">
                  <div className="flex justify-between text-sm mb-1">
                    <span>Other</span>
                    <span>{stateData.party_breakdown.other}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-gray-600 h-2 rounded-full" 
                      style={{ width: `${stateData.party_breakdown.other}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Top Cities and Contributors */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Cities */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Contributing Cities</h3>
              <div className="space-y-3">
                {stateData.top_cities.map((city, index) => (
                  <div key={city.city} className="flex justify-between items-center">
                    <div className="flex items-center">
                      <span className="text-sm font-medium text-gray-500 w-6">{index + 1}</span>
                      <span className="font-medium text-gray-900">{city.city}</span>
                    </div>
                    <span className="font-medium text-gray-900">
                      {formatCurrency(city.amount)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Contributors */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Contributors</h3>
              <div className="space-y-3">
                {stateData.top_contributors.map((contributor, index) => (
                  <div key={contributor.name} className="flex justify-between items-center">
                    <div className="flex items-center">
                      <span className="text-sm font-medium text-gray-500 w-6">{index + 1}</span>
                      <span className="font-medium text-gray-900">{contributor.name}</span>
                    </div>
                    <span className="font-medium text-gray-900">
                      {formatCurrency(contributor.amount)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Elected Officials Link */}
          <div className="bg-blue-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-blue-800 mb-2">
              View Elected Officials from {US_STATES.find(s => s.code === stateData.state)?.name}
            </h3>
            <p className="text-blue-700 mb-4">
              See campaign finance data for your state's Senators, Representatives, and other elected officials.
            </p>
            <a
              href={`/politicians/state/${stateData.state}`}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              <Users className="h-4 w-4 mr-2" />
              View Elected Officials
            </a>
          </div>
        </div>
      )}

      {/* Help Text */}
      <div className="mt-8 p-4 bg-gray-50 rounded-lg">
        <h3 className="text-sm font-medium text-gray-800 mb-2">About Get Local!</h3>
        <p className="text-sm text-gray-600">
          This tool provides campaign finance data aggregated by state and zip code. 
          Data comes from Federal Election Commission filings and is updated monthly. 
          Use this tool to understand political spending patterns in your area and 
          see who's funding campaigns in your state.
        </p>
      </div>
    </div>
  );
} 