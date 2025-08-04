'use client';

import { useState, useEffect } from 'react';
import { 
  Search, 
  MapPin, 
  Users, 
  DollarSign, 
  TrendingUp,
  BarChart3,
  Calendar,
  Flag
} from 'lucide-react';
import Breadcrumbs from '@/components/ui/Breadcrumbs';
import { BreadcrumbItem } from '@/types';

interface CongressionalRace {
  race_id: string;
  state: string;
  district: string;
  chamber: 'House' | 'Senate';
  election_year: number;
  total_candidates: number;
  total_receipts: number;
  total_disbursements: number;
  independent_expenditures: number;
  outside_spending: number;
  candidates: Array<{
    candidate_id: string;
    candidate_name: string;
    party: string;
    incumbent: boolean;
    total_receipts: number;
    total_disbursements: number;
    cash_on_hand: number;
    contribution_count: number;
    status: string;
  }>;
  top_contributors: Array<{
    name: string;
    amount: number;
    type: string;
  }>;
  outside_spenders: Array<{
    spender_name: string;
    amount: number;
    support_oppose: string;
  }>;
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

export default function CongressionalElectionsPage() {
  const [races, setRaces] = useState<CongressionalRace[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState('2024');
  const [selectedState, setSelectedState] = useState('');
  const [selectedChamber, setSelectedChamber] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const breadcrumbs: BreadcrumbItem[] = [
    { label: 'Elections', href: '/elections' },
    { label: 'Congressional Elections' },
  ];

  useEffect(() => {
    fetchCongressionalRaces();
  }, [selectedYear, selectedState, selectedChamber]);

  const fetchCongressionalRaces = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Mock data for demonstration - in real implementation, this would call your API
      const mockRaces: CongressionalRace[] = [
        {
          race_id: 'CA-SEN-2024',
          state: 'CA',
          district: 'Statewide',
          chamber: 'Senate',
          election_year: 2024,
          total_candidates: 4,
          total_receipts: 45000000,
          total_disbursements: 38000000,
          independent_expenditures: 12000000,
          outside_spending: 15000000,
          candidates: [
            {
              candidate_id: 'C00123456',
              candidate_name: 'Adam Schiff',
              party: 'DEM',
              incumbent: false,
              total_receipts: 25000000,
              total_disbursements: 22000000,
              cash_on_hand: 3000000,
              contribution_count: 150000,
              status: 'Active',
            },
            {
              candidate_id: 'C00123457',
              candidate_name: 'Steve Garvey',
              party: 'REP',
              incumbent: false,
              total_receipts: 18000000,
              total_disbursements: 15000000,
              cash_on_hand: 3000000,
              contribution_count: 95000,
              status: 'Active',
            },
          ],
          top_contributors: [
            { name: 'Democratic Senatorial Campaign Committee', amount: 5000000, type: 'Party Committee' },
            { name: 'National Republican Senatorial Committee', amount: 4000000, type: 'Party Committee' },
            { name: 'Tech Industry PAC', amount: 2000000, type: 'PAC' },
            { name: 'Labor Union PAC', amount: 1500000, type: 'PAC' },
          ],
          outside_spenders: [
            { spender_name: 'Senate Majority PAC', amount: 8000000, support_oppose: 'Support' },
            { spender_name: 'Americans for Prosperity', amount: 6000000, support_oppose: 'Oppose' },
            { spender_name: 'League of Conservation Voters', amount: 3000000, support_oppose: 'Support' },
          ],
        },
        {
          race_id: 'TX-SEN-2024',
          state: 'TX',
          district: 'Statewide',
          chamber: 'Senate',
          election_year: 2024,
          total_candidates: 3,
          total_receipts: 35000000,
          total_disbursements: 30000000,
          independent_expenditures: 10000000,
          outside_spending: 12000000,
          candidates: [
            {
              candidate_id: 'C00123458',
              candidate_name: 'Ted Cruz',
              party: 'REP',
              incumbent: true,
              total_receipts: 20000000,
              total_disbursements: 18000000,
              cash_on_hand: 2000000,
              contribution_count: 120000,
              status: 'Incumbent',
            },
            {
              candidate_id: 'C00123459',
              candidate_name: 'Colin Allred',
              party: 'DEM',
              incumbent: false,
              total_receipts: 15000000,
              total_disbursements: 12000000,
              cash_on_hand: 3000000,
              contribution_count: 85000,
              status: 'Active',
            },
          ],
          top_contributors: [
            { name: 'National Republican Senatorial Committee', amount: 6000000, type: 'Party Committee' },
            { name: 'Democratic Senatorial Campaign Committee', amount: 4000000, type: 'Party Committee' },
            { name: 'Energy Industry PAC', amount: 2500000, type: 'PAC' },
            { name: 'Healthcare PAC', amount: 2000000, type: 'PAC' },
          ],
          outside_spenders: [
            { spender_name: 'Club for Growth', amount: 7000000, support_oppose: 'Support' },
            { spender_name: 'Senate Majority PAC', amount: 5000000, support_oppose: 'Support' },
            { spender_name: 'Americans for Prosperity', amount: 4000000, support_oppose: 'Oppose' },
          ],
        },
        {
          race_id: 'CA-27-2024',
          state: 'CA',
          district: '27',
          chamber: 'House',
          election_year: 2024,
          total_candidates: 2,
          total_receipts: 8000000,
          total_disbursements: 6500000,
          independent_expenditures: 2000000,
          outside_spending: 2500000,
          candidates: [
            {
              candidate_id: 'C00123460',
              candidate_name: 'Mike Garcia',
              party: 'REP',
              incumbent: true,
              total_receipts: 4500000,
              total_disbursements: 3800000,
              cash_on_hand: 700000,
              contribution_count: 25000,
              status: 'Incumbent',
            },
            {
              candidate_id: 'C00123461',
              candidate_name: 'Christy Smith',
              party: 'DEM',
              incumbent: false,
              total_receipts: 3500000,
              total_disbursements: 2700000,
              cash_on_hand: 800000,
              contribution_count: 20000,
              status: 'Active',
            },
          ],
          top_contributors: [
            { name: 'National Republican Congressional Committee', amount: 1500000, type: 'Party Committee' },
            { name: 'Democratic Congressional Campaign Committee', amount: 1200000, type: 'Party Committee' },
            { name: 'Defense Industry PAC', amount: 800000, type: 'PAC' },
            { name: 'Education PAC', amount: 600000, type: 'PAC' },
          ],
          outside_spenders: [
            { spender_name: 'House Majority PAC', amount: 1500000, support_oppose: 'Support' },
            { spender_name: 'Congressional Leadership Fund', amount: 1200000, support_oppose: 'Support' },
            { spender_name: 'League of Conservation Voters', amount: 800000, support_oppose: 'Support' },
          ],
        },
      ];
      
      setRaces(mockRaces);
    } catch (err) {
      setError('Failed to fetch congressional races');
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

  const filteredRaces = races.filter(race => {
    const matchesState = !selectedState || race.state === selectedState;
    const matchesChamber = !selectedChamber || race.chamber === selectedChamber;
    const matchesSearch = !searchTerm || 
      race.state.toLowerCase().includes(searchTerm.toLowerCase()) ||
      race.district.toLowerCase().includes(searchTerm.toLowerCase()) ||
      race.candidates.some(candidate => 
        candidate.candidate_name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    
    return matchesState && matchesChamber && matchesSearch;
  });

  const stats = {
    total_races: races.length,
    total_receipts: races.reduce((sum, race) => sum + race.total_receipts, 0),
    total_outside_spending: races.reduce((sum, race) => sum + race.outside_spending, 0),
    total_candidates: races.reduce((sum, race) => sum + race.total_candidates, 0),
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading congressional races...</p>
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
            onClick={fetchCongressionalRaces}
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
          Congressional Elections
        </h1>
        <p className="text-gray-600">
          Track campaign finance data for House and Senate races. See fundraising totals, 
          outside spending, and candidate profiles for all congressional elections.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <Flag className="h-8 w-8 text-blue-600 mr-4" />
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.total_races}</p>
              <p className="text-sm text-gray-600">Total Races</p>
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
            <TrendingUp className="h-8 w-8 text-purple-600 mr-4" />
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(stats.total_outside_spending)}
              </p>
              <p className="text-sm text-gray-600">Outside Spending</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <Users className="h-8 w-8 text-orange-600 mr-4" />
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.total_candidates}</p>
              <p className="text-sm text-gray-600">Total Candidates</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Election Year
            </label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="2024">2024</option>
              <option value="2022">2022</option>
              <option value="2020">2020</option>
            </select>
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
              Chamber
            </label>
            <select
              value={selectedChamber}
              onChange={(e) => setSelectedChamber(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Chambers</option>
              <option value="House">House</option>
              <option value="Senate">Senate</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search races or candidates..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          
          <div className="flex items-end">
            <button
              onClick={() => {
                setSelectedState('');
                setSelectedChamber('');
                setSearchTerm('');
              }}
              className="w-full bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Races List */}
      <div className="space-y-6">
        {filteredRaces.map((race) => (
          <div key={race.race_id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            {/* Race Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  {race.state} {race.chamber} {race.district !== 'Statewide' ? `District ${race.district}` : ''}
                </h2>
                <div className="flex items-center space-x-4 mt-2 text-sm text-gray-600">
                  <span className="flex items-center">
                    <Calendar className="h-4 w-4 mr-1" />
                    {race.election_year}
                  </span>
                  <span className="flex items-center">
                    <Users className="h-4 w-4 mr-1" />
                    {race.total_candidates} candidates
                  </span>
                  <span className="flex items-center">
                    <DollarSign className="h-4 w-4 mr-1" />
                    {formatCurrency(race.total_receipts)} raised
                  </span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-lg font-semibold text-gray-900">
                  {formatCurrency(race.outside_spending)}
                </p>
                <p className="text-sm text-gray-600">Outside Spending</p>
              </div>
            </div>

            {/* Candidates */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Candidates</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {race.candidates.map((candidate) => (
                  <div key={candidate.candidate_id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h4 className="font-medium text-gray-900">{candidate.candidate_name}</h4>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getPartyBgColor(candidate.party)} ${getPartyColor(candidate.party)}`}>
                            {candidate.party === 'DEM' ? 'Democrat' : candidate.party === 'REP' ? 'Republican' : candidate.party}
                          </span>
                          {candidate.incumbent && (
                            <span className="inline-block px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              Incumbent
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-gray-900">
                          {formatCurrency(candidate.total_receipts)}
                        </p>
                        <p className="text-sm text-gray-600">Raised</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600">Spent</p>
                        <p className="font-medium">{formatCurrency(candidate.total_disbursements)}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Cash on Hand</p>
                        <p className="font-medium">{formatCurrency(candidate.cash_on_hand)}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Contributions</p>
                        <p className="font-medium">{formatNumber(candidate.contribution_count)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Outside Spending */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Outside Spending</h3>
              <div className="space-y-3">
                {race.outside_spenders.map((spender, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div>
                      <span className="font-medium text-gray-900">{spender.spender_name}</span>
                      <span className={`ml-2 inline-block px-2 py-1 rounded-full text-xs font-medium ${
                        spender.support_oppose === 'Support' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {spender.support_oppose}
                      </span>
                    </div>
                    <span className="font-medium text-gray-900">
                      {formatCurrency(spender.amount)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Contributors */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Contributors</h3>
              <div className="space-y-3">
                {race.top_contributors.map((contributor, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div>
                      <span className="font-medium text-gray-900">{contributor.name}</span>
                      <span className="ml-2 text-sm text-gray-500">({contributor.type})</span>
                    </div>
                    <span className="font-medium text-gray-900">
                      {formatCurrency(contributor.amount)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
        
        {filteredRaces.length === 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
            <p className="text-gray-500">No congressional races found matching your criteria.</p>
          </div>
        )}
      </div>

      {/* Data Source Note */}
      <div className="mt-8 p-4 bg-gray-50 rounded-lg">
        <h3 className="text-sm font-medium text-gray-800 mb-2">Data Source</h3>
        <p className="text-sm text-gray-600">
          Congressional election data comes from Federal Election Commission filings. 
          This includes candidate fundraising, outside spending by super PACs and other groups, 
          and independent expenditures. Data is updated monthly and provides transparency into 
          campaign finance patterns in congressional races.
        </p>
      </div>
    </div>
  );
} 