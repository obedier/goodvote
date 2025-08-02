'use client';

import { useState, useEffect } from 'react';
import { Flag, DollarSign, Users, TrendingUp, Calendar } from 'lucide-react';
import Breadcrumbs from '@/components/ui/Breadcrumbs';
import { BreadcrumbItem } from '@/types';

interface PresidentialCandidate {
  candidate_id: string;
  candidate_name: string;
  party: string;
  total_receipts: number;
  total_disbursements: number;
  cash_on_hand: number;
  contribution_count: number;
  avg_contribution: number;
  top_states: Array<{ state: string; amount: number }>;
  top_industries: Array<{ industry: string; amount: number }>;
}

interface PresidentialElection {
  year: number;
  candidates: PresidentialCandidate[];
  total_spending: number;
  total_contributors: number;
  independent_expenditures: number;
}

export default function PresidentialElectionsPage() {
  const [elections, setElections] = useState<PresidentialElection[]>([]);
  const [selectedYear, setSelectedYear] = useState('2024');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const breadcrumbs: BreadcrumbItem[] = [
    { label: 'Elections', href: '/elections' },
    { label: 'Presidential Elections' },
  ];

  useEffect(() => {
    fetchPresidentialData();
  }, [selectedYear]);

  const fetchPresidentialData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Mock data for demonstration - in real implementation, this would call your API
      const mockElections: PresidentialElection[] = [
        {
          year: 2024,
          candidates: [
            {
              candidate_id: 'P80000001',
              candidate_name: 'Joseph R. Biden Jr.',
              party: 'DEM',
              total_receipts: 125000000,
              total_disbursements: 98000000,
              cash_on_hand: 27000000,
              contribution_count: 2500000,
              avg_contribution: 50,
              top_states: [
                { state: 'CA', amount: 25000000 },
                { state: 'NY', amount: 18000000 },
                { state: 'TX', amount: 12000000 },
                { state: 'FL', amount: 10000000 },
                { state: 'IL', amount: 8000000 },
              ],
              top_industries: [
                { industry: 'Technology', amount: 15000000 },
                { industry: 'Healthcare', amount: 12000000 },
                { industry: 'Education', amount: 10000000 },
                { industry: 'Labor', amount: 8000000 },
                { industry: 'Environment', amount: 6000000 },
              ],
            },
            {
              candidate_id: 'P80000002',
              candidate_name: 'Donald J. Trump',
              party: 'REP',
              total_receipts: 110000000,
              total_disbursements: 85000000,
              cash_on_hand: 25000000,
              contribution_count: 1800000,
              avg_contribution: 61,
              top_states: [
                { state: 'TX', amount: 20000000 },
                { state: 'FL', amount: 15000000 },
                { state: 'CA', amount: 12000000 },
                { state: 'NY', amount: 10000000 },
                { state: 'OH', amount: 8000000 },
              ],
              top_industries: [
                { industry: 'Real Estate', amount: 12000000 },
                { industry: 'Energy', amount: 10000000 },
                { industry: 'Finance', amount: 8000000 },
                { industry: 'Manufacturing', amount: 6000000 },
                { industry: 'Agriculture', amount: 4000000 },
              ],
            },
          ],
          total_spending: 183000000,
          total_contributors: 4300000,
          independent_expenditures: 45000000,
        },
        {
          year: 2020,
          candidates: [
            {
              candidate_id: 'P80000001',
              candidate_name: 'Joseph R. Biden Jr.',
              party: 'DEM',
              total_receipts: 1100000000,
              total_disbursements: 1050000000,
              cash_on_hand: 50000000,
              contribution_count: 5000000,
              avg_contribution: 220,
              top_states: [
                { state: 'CA', amount: 200000000 },
                { state: 'NY', amount: 150000000 },
                { state: 'TX', amount: 100000000 },
                { state: 'FL', amount: 80000000 },
                { state: 'IL', amount: 60000000 },
              ],
              top_industries: [
                { industry: 'Technology', amount: 120000000 },
                { industry: 'Healthcare', amount: 100000000 },
                { industry: 'Education', amount: 80000000 },
                { industry: 'Labor', amount: 60000000 },
                { industry: 'Environment', amount: 40000000 },
              ],
            },
            {
              candidate_id: 'P80000002',
              candidate_name: 'Donald J. Trump',
              party: 'REP',
              total_receipts: 900000000,
              total_disbursements: 850000000,
              cash_on_hand: 50000000,
              contribution_count: 3500000,
              avg_contribution: 257,
              top_states: [
                { state: 'TX', amount: 150000000 },
                { state: 'FL', amount: 120000000 },
                { state: 'CA', amount: 100000000 },
                { state: 'NY', amount: 80000000 },
                { state: 'OH', amount: 60000000 },
              ],
              top_industries: [
                { industry: 'Real Estate', amount: 100000000 },
                { industry: 'Energy', amount: 80000000 },
                { industry: 'Finance', amount: 60000000 },
                { industry: 'Manufacturing', amount: 40000000 },
                { industry: 'Agriculture', amount: 30000000 },
              ],
            },
          ],
          total_spending: 2000000000,
          total_contributors: 8500000,
          independent_expenditures: 800000000,
        },
      ];
      
      setElections(mockElections);
    } catch (err) {
      setError('Failed to fetch presidential data');
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

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading presidential election data...</p>
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
            onClick={fetchPresidentialData}
            className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const currentElection = elections.find(e => e.year === parseInt(selectedYear));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Breadcrumbs items={breadcrumbs} />
      
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Presidential Elections
        </h1>
        <p className="text-gray-600">
          Track campaign finance data for presidential candidates. See fundraising totals, 
          spending patterns, and contribution breakdowns by state and industry.
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
              <option value="2020">2020</option>
              <option value="2016">2016</option>
            </select>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-600">Total Spending</p>
            <p className="text-2xl font-bold text-gray-900">
              {currentElection ? formatCurrency(currentElection.total_spending) : '$0'}
            </p>
          </div>
        </div>
      </div>

      {currentElection && (
        <div className="space-y-8">
          {/* Election Overview */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              {currentElection.year} Presidential Election Overview
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
              <div className="text-center">
                <DollarSign className="h-8 w-8 text-green-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(currentElection.total_spending)}
                </p>
                <p className="text-sm text-gray-600">Total Spending</p>
              </div>
              
              <div className="text-center">
                <Users className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-gray-900">
                  {formatNumber(currentElection.total_contributors)}
                </p>
                <p className="text-sm text-gray-600">Total Contributors</p>
              </div>
              
              <div className="text-center">
                <TrendingUp className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(currentElection.independent_expenditures)}
                </p>
                <p className="text-sm text-gray-600">Independent Expenditures</p>
              </div>
              
              <div className="text-center">
                <Flag className="h-8 w-8 text-red-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-gray-900">
                  {currentElection.candidates.length}
                </p>
                <p className="text-sm text-gray-600">Major Candidates</p>
              </div>
            </div>
          </div>

          {/* Candidates */}
          <div className="space-y-6">
            {currentElection.candidates.map((candidate) => (
              <div key={candidate.candidate_id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">{candidate.candidate_name}</h3>
                    <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getPartyBgColor(candidate.party)} ${getPartyColor(candidate.party)}`}>
                      {candidate.party === 'DEM' ? 'Democrat' : candidate.party === 'REP' ? 'Republican' : candidate.party}
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-gray-900">
                      {formatCurrency(candidate.total_receipts)}
                    </p>
                    <p className="text-sm text-gray-600">Total Raised</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                  <div className="text-center">
                    <p className="text-lg font-semibold text-gray-900">
                      {formatCurrency(candidate.total_disbursements)}
                    </p>
                    <p className="text-sm text-gray-600">Total Spent</p>
                  </div>
                  
                  <div className="text-center">
                    <p className="text-lg font-semibold text-gray-900">
                      {formatCurrency(candidate.cash_on_hand)}
                    </p>
                    <p className="text-sm text-gray-600">Cash on Hand</p>
                  </div>
                  
                  <div className="text-center">
                    <p className="text-lg font-semibold text-gray-900">
                      {formatNumber(candidate.contribution_count)}
                    </p>
                    <p className="text-sm text-gray-600">Contributions</p>
                  </div>
                </div>

                {/* Top States and Industries */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">Top Contributing States</h4>
                    <div className="space-y-3">
                      {candidate.top_states.map((state, index) => (
                        <div key={state.state} className="flex justify-between items-center">
                          <div className="flex items-center">
                            <span className="text-sm font-medium text-gray-500 w-6">{index + 1}</span>
                            <span className="font-medium text-gray-900">{state.state}</span>
                          </div>
                          <span className="font-medium text-gray-900">
                            {formatCurrency(state.amount)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">Top Contributing Industries</h4>
                    <div className="space-y-3">
                      {candidate.top_industries.map((industry, index) => (
                        <div key={industry.industry} className="flex justify-between items-center">
                          <div className="flex items-center">
                            <span className="text-sm font-medium text-gray-500 w-6">{index + 1}</span>
                            <span className="font-medium text-gray-900">{industry.industry}</span>
                          </div>
                          <span className="font-medium text-gray-900">
                            {formatCurrency(industry.amount)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Historical Context */}
          <div className="bg-blue-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-blue-800 mb-4">
              Historical Context
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-blue-700 mb-2">Campaign Finance Trends</h4>
                <ul className="text-sm text-blue-600 space-y-1">
                  <li>• Presidential campaigns have become increasingly expensive</li>
                  <li>• Small-dollar contributions have grown in importance</li>
                  <li>• Independent expenditures play a major role</li>
                  <li>• Digital fundraising has transformed campaigns</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium text-blue-700 mb-2">Data Sources</h4>
                <ul className="text-sm text-blue-600 space-y-1">
                  <li>• Federal Election Commission filings</li>
                  <li>• Campaign committee reports</li>
                  <li>• Independent expenditure reports</li>
                  <li>• Updated monthly by the FEC</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Help Text */}
      <div className="mt-8 p-4 bg-gray-50 rounded-lg">
        <h3 className="text-sm font-medium text-gray-800 mb-2">About Presidential Campaign Finance</h3>
        <p className="text-sm text-gray-600">
          Presidential campaign finance data comes from Federal Election Commission filings. 
          This includes contributions from individuals, PACs, and other committees, as well as 
          campaign spending and independent expenditures. Data is updated monthly and provides 
          transparency into how presidential campaigns are funded.
        </p>
      </div>
    </div>
  );
} 