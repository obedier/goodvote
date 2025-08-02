'use client';

import { useState, useEffect } from 'react';
import { Search, MapPin, Users, DollarSign, Building } from 'lucide-react';
import Breadcrumbs from '@/components/ui/Breadcrumbs';
import { BreadcrumbItem } from '@/types';

interface StateOfficial {
  person_id: string;
  display_name: string;
  state: string;
  office: string;
  party: string;
  total_receipts: number;
  contribution_count: number;
  last_election_year: number;
  status: string;
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

export default function StateOfficialsPage() {
  const [officials, setOfficials] = useState<StateOfficial[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedState, setSelectedState] = useState('');
  const [selectedOffice, setSelectedOffice] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const breadcrumbs: BreadcrumbItem[] = [
    { label: 'Politicians', href: '/politicians' },
    { label: 'State Officials' },
  ];

  useEffect(() => {
    fetchStateOfficials();
  }, [selectedState, selectedOffice]);

  const fetchStateOfficials = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Mock data for demonstration - in real implementation, this would call your API
      const mockOfficials: StateOfficial[] = [
        {
          person_id: 'P12345678',
          display_name: 'Governor Gavin Newsom',
          state: 'CA',
          office: 'Governor',
          party: 'DEM',
          total_receipts: 25000000,
          contribution_count: 150000,
          last_election_year: 2022,
          status: 'Incumbent',
        },
        {
          person_id: 'P12345679',
          display_name: 'Governor Greg Abbott',
          state: 'TX',
          office: 'Governor',
          party: 'REP',
          total_receipts: 18000000,
          contribution_count: 95000,
          last_election_year: 2022,
          status: 'Incumbent',
        },
        {
          person_id: 'P12345680',
          display_name: 'Governor Ron DeSantis',
          state: 'FL',
          office: 'Governor',
          party: 'REP',
          total_receipts: 22000000,
          contribution_count: 120000,
          last_election_year: 2022,
          status: 'Incumbent',
        },
        {
          person_id: 'P12345681',
          display_name: 'Governor Kathy Hochul',
          state: 'NY',
          office: 'Governor',
          party: 'DEM',
          total_receipts: 15000000,
          contribution_count: 85000,
          last_election_year: 2022,
          status: 'Incumbent',
        },
        {
          person_id: 'P12345682',
          display_name: 'Governor J.B. Pritzker',
          state: 'IL',
          office: 'Governor',
          party: 'DEM',
          total_receipts: 12000000,
          contribution_count: 75000,
          last_election_year: 2022,
          status: 'Incumbent',
        },
      ];
      
      setOfficials(mockOfficials);
    } catch (err) {
      setError('Failed to fetch state officials');
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

  const getPartyColor = (party: string) => {
    return party === 'DEM' ? 'text-blue-600' : party === 'REP' ? 'text-red-600' : 'text-gray-600';
  };

  const getPartyBgColor = (party: string) => {
    return party === 'DEM' ? 'bg-blue-100' : party === 'REP' ? 'bg-red-100' : 'bg-gray-100';
  };

  const filteredOfficials = officials.filter(official => {
    const matchesState = !selectedState || official.state === selectedState;
    const matchesOffice = !selectedOffice || official.office === selectedOffice;
    const matchesSearch = !searchTerm || 
      official.display_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      official.state.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesState && matchesOffice && matchesSearch;
  });

  const stats = {
    total_officials: officials.length,
    total_receipts: officials.reduce((sum, official) => sum + official.total_receipts, 0),
    total_contributions: officials.reduce((sum, official) => sum + official.contribution_count, 0),
    states_represented: new Set(officials.map(official => official.state)).size,
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading state officials...</p>
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
            onClick={fetchStateOfficials}
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
          State Officials
        </h1>
        <p className="text-gray-600">
          Explore campaign finance data for governors, lieutenant governors, 
          attorneys general, and other state-level elected officials.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <Users className="h-8 w-8 text-blue-600 mr-4" />
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.total_officials}</p>
              <p className="text-sm text-gray-600">Total Officials</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <DollarSign className="h-8 w-8 text-green-600 mr-4" />
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(stats.total_receipts)}
              </p>
              <p className="text-sm text-gray-600">Total Receipts</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <Building className="h-8 w-8 text-purple-600 mr-4" />
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {formatNumber(stats.total_contributions)}
              </p>
              <p className="text-sm text-gray-600">Total Contributions</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <MapPin className="h-8 w-8 text-orange-600 mr-4" />
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.states_represented}</p>
              <p className="text-sm text-gray-600">States Represented</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search Officials
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name or state..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              State
            </label>
            <select
              value={selectedState}
              onChange={(e) => setSelectedState(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All States</option>
              {US_STATES.map((state) => (
                <option key={state.code} value={state.code}>
                  {state.name}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Office
            </label>
            <select
              value={selectedOffice}
              onChange={(e) => setSelectedOffice(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Offices</option>
              <option value="Governor">Governor</option>
              <option value="Lieutenant Governor">Lieutenant Governor</option>
              <option value="Attorney General">Attorney General</option>
              <option value="Secretary of State">Secretary of State</option>
              <option value="Treasurer">Treasurer</option>
            </select>
          </div>
          
          <div className="flex items-end">
            <button
              onClick={() => {
                setSelectedState('');
                setSelectedOffice('');
                setSearchTerm('');
              }}
              className="w-full bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Officials List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            State Officials ({filteredOfficials.length})
          </h2>
        </div>
        
        <div className="divide-y divide-gray-200">
          {filteredOfficials.map((official) => (
            <div key={official.person_id} className="px-6 py-4 hover:bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    <h3 className="text-lg font-medium text-gray-900">
                      {official.display_name}
                    </h3>
                    <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getPartyBgColor(official.party)} ${getPartyColor(official.party)}`}>
                      {official.party === 'DEM' ? 'Democrat' : official.party === 'REP' ? 'Republican' : official.party}
                    </span>
                    <span className="text-sm text-gray-500">{official.status}</span>
                  </div>
                  <div className="mt-1 flex items-center space-x-4 text-sm text-gray-600">
                    <span className="flex items-center">
                      <MapPin className="h-4 w-4 mr-1" />
                      {official.state}
                    </span>
                    <span>{official.office}</span>
                    <span>Elected {official.last_election_year}</span>
                  </div>
                </div>
                
                <div className="text-right">
                  <p className="text-lg font-semibold text-gray-900">
                    {formatCurrency(official.total_receipts)}
                  </p>
                  <p className="text-sm text-gray-600">
                    {formatNumber(official.contribution_count)} contributions
                  </p>
                </div>
              </div>
              
              <div className="mt-3 flex justify-end">
                <a
                  href={`/politicians/${official.person_id}`}
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  View Profile →
                </a>
              </div>
            </div>
          ))}
        </div>
        
        {filteredOfficials.length === 0 && (
          <div className="px-6 py-8 text-center">
            <p className="text-gray-500">No state officials found matching your criteria.</p>
          </div>
        )}
      </div>

      {/* Data Source Note */}
      <div className="mt-8 p-4 bg-gray-50 rounded-lg">
        <h3 className="text-sm font-medium text-gray-800 mb-2">Data Source</h3>
        <p className="text-sm text-gray-600">
          State official data comes from Federal Election Commission filings and state election records. 
          This includes campaign finance data for governors, lieutenant governors, attorneys general, 
          and other state-level elected officials. Data is updated monthly.
        </p>
      </div>
    </div>
  );
} 