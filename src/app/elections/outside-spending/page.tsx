'use client';

import { useState, useEffect } from 'react';
import { 
  Search, 
  TrendingUp, 
  DollarSign, 
  Users, 
  Building,
  BarChart3,
  Calendar,
  Target,
  Eye
} from 'lucide-react';
import Breadcrumbs from '@/components/ui/Breadcrumbs';
import { BreadcrumbItem } from '@/types';

interface OutsideSpending {
  spender_id: string;
  spender_name: string;
  spender_type: string;
  total_spending: number;
  support_spending: number;
  oppose_spending: number;
  race_count: number;
  candidate_count: number;
  top_races: Array<{
    race_id: string;
    state: string;
    district: string;
    chamber: string;
    candidate_name: string;
    amount: number;
    support_oppose: string;
  }>;
  spending_by_type: Array<{
    type: string;
    amount: number;
    percentage: number;
  }>;
  monthly_spending: Array<{
    month: string;
    amount: number;
  }>;
}

interface SpendingAnalysis {
  total_outside_spending: number;
  total_spenders: number;
  support_spending: number;
  oppose_spending: number;
  top_spenders: OutsideSpending[];
  spending_by_race_type: Array<{
    race_type: string;
    amount: number;
    percentage: number;
  }>;
  spending_trends: Array<{
    month: string;
    total: number;
    support: number;
    oppose: number;
  }>;
}

export default function OutsideSpendingPage() {
  const [analysis, setAnalysis] = useState<SpendingAnalysis | null>(null);
  const [spenders, setSpenders] = useState<OutsideSpending[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState('2024');
  const [selectedType, setSelectedType] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const breadcrumbs: BreadcrumbItem[] = [
    { label: 'Elections', href: '/elections' },
    { label: 'Outside Spending Analysis' },
  ];

  useEffect(() => {
    fetchOutsideSpendingData();
  }, [selectedYear, selectedType]);

  const fetchOutsideSpendingData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Mock data for demonstration - in real implementation, this would call your API
      const mockAnalysis: SpendingAnalysis = {
        total_outside_spending: 850000000,
        total_spenders: 1250,
        support_spending: 450000000,
        oppose_spending: 400000000,
        top_spenders: [
          {
            spender_id: 'SP001',
            spender_name: 'Senate Majority PAC',
            spender_type: 'Super PAC',
            total_spending: 85000000,
            support_spending: 85000000,
            oppose_spending: 0,
            race_count: 12,
            candidate_count: 15,
            top_races: [
              { race_id: 'CA-SEN-2024', state: 'CA', district: 'Statewide', chamber: 'Senate', candidate_name: 'Adam Schiff', amount: 8000000, support_oppose: 'Support' },
              { race_id: 'TX-SEN-2024', state: 'TX', district: 'Statewide', chamber: 'Senate', candidate_name: 'Colin Allred', amount: 5000000, support_oppose: 'Support' },
            ],
            spending_by_type: [
              { type: 'Television Ads', amount: 60000000, percentage: 71 },
              { type: 'Digital Ads', amount: 15000000, percentage: 18 },
              { type: 'Direct Mail', amount: 10000000, percentage: 12 },
            ],
            monthly_spending: [
              { month: 'January', amount: 5000000 },
              { month: 'February', amount: 8000000 },
              { month: 'March', amount: 12000000 },
            ],
          },
          {
            spender_id: 'SP002',
            spender_name: 'Americans for Prosperity',
            spender_type: 'Super PAC',
            total_spending: 75000000,
            support_spending: 40000000,
            oppose_spending: 35000000,
            race_count: 15,
            candidate_count: 20,
            top_races: [
              { race_id: 'TX-SEN-2024', state: 'TX', district: 'Statewide', chamber: 'Senate', candidate_name: 'Ted Cruz', amount: 7000000, support_oppose: 'Support' },
              { race_id: 'CA-SEN-2024', state: 'CA', district: 'Statewide', chamber: 'Senate', candidate_name: 'Adam Schiff', amount: 6000000, support_oppose: 'Oppose' },
            ],
            spending_by_type: [
              { type: 'Television Ads', amount: 50000000, percentage: 67 },
              { type: 'Digital Ads', amount: 15000000, percentage: 20 },
              { type: 'Direct Mail', amount: 10000000, percentage: 13 },
            ],
            monthly_spending: [
              { month: 'January', amount: 4000000 },
              { month: 'February', amount: 7000000 },
              { month: 'March', amount: 11000000 },
            ],
          },
          {
            spender_id: 'SP003',
            spender_name: 'House Majority PAC',
            spender_type: 'Super PAC',
            total_spending: 65000000,
            support_spending: 65000000,
            oppose_spending: 0,
            race_count: 25,
            candidate_count: 30,
            top_races: [
              { race_id: 'CA-27-2024', state: 'CA', district: '27', chamber: 'House', candidate_name: 'Christy Smith', amount: 1500000, support_oppose: 'Support' },
              { race_id: 'TX-15-2024', state: 'TX', district: '15', chamber: 'House', candidate_name: 'Michelle Vallejo', amount: 1200000, support_oppose: 'Support' },
            ],
            spending_by_type: [
              { type: 'Television Ads', amount: 45000000, percentage: 69 },
              { type: 'Digital Ads', amount: 12000000, percentage: 18 },
              { type: 'Direct Mail', amount: 8000000, percentage: 12 },
            ],
            monthly_spending: [
              { month: 'January', amount: 3000000 },
              { month: 'February', amount: 6000000 },
              { month: 'March', amount: 9000000 },
            ],
          },
        ],
        spending_by_race_type: [
          { race_type: 'Senate', amount: 450000000, percentage: 53 },
          { race_type: 'House', amount: 350000000, percentage: 41 },
          { race_type: 'Presidential', amount: 50000000, percentage: 6 },
        ],
        spending_trends: [
          { month: 'January', total: 45000000, support: 25000000, oppose: 20000000 },
          { month: 'February', total: 75000000, support: 40000000, oppose: 35000000 },
          { month: 'March', total: 120000000, support: 65000000, oppose: 55000000 },
        ],
      };
      
      setAnalysis(mockAnalysis);
      setSpenders(mockAnalysis.top_spenders);
    } catch (err) {
      setError('Failed to fetch outside spending data');
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

  const filteredSpenders = spenders.filter(spender => {
    const matchesType = !selectedType || spender.spender_type === selectedType;
    const matchesSearch = !searchTerm || 
      spender.spender_name.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesType && matchesSearch;
  });

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading outside spending analysis...</p>
        </div>
      </div>
    );
  }

  if (error || !analysis) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <p className="text-red-600">Error: {error || 'Failed to load data'}</p>
          <button
            onClick={fetchOutsideSpendingData}
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
          Outside Spending Analysis
        </h1>
        <p className="text-gray-600">
          Track independent expenditures and outside spending by super PACs, 
          political action committees, and other groups in federal elections.
        </p>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <DollarSign className="h-8 w-8 text-green-600 mr-4" />
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(analysis.total_outside_spending)}
              </p>
              <p className="text-sm text-gray-600">Total Outside Spending</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <Building className="h-8 w-8 text-blue-600 mr-4" />
            <div>
              <p className="text-2xl font-bold text-gray-900">{analysis.total_spenders}</p>
              <p className="text-sm text-gray-600">Total Spenders</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <Target className="h-8 w-8 text-purple-600 mr-4" />
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(analysis.support_spending)}
              </p>
              <p className="text-sm text-gray-600">Support Spending</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <Eye className="h-8 w-8 text-red-600 mr-4" />
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(analysis.oppose_spending)}
              </p>
              <p className="text-sm text-gray-600">Oppose Spending</p>
            </div>
          </div>
        </div>
      </div>

      {/* Spending by Race Type */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Spending by Race Type</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {analysis.spending_by_race_type.map((raceType) => (
            <div key={raceType.race_type} className="text-center">
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(raceType.amount)}
              </p>
              <p className="text-sm text-gray-600">{raceType.race_type}</p>
              <p className="text-xs text-gray-500">{raceType.percentage}% of total</p>
            </div>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
              Spender Type
            </label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Types</option>
              <option value="Super PAC">Super PAC</option>
              <option value="PAC">PAC</option>
              <option value="501(c)(4)">501(c)(4)</option>
              <option value="501(c)(6)">501(c)(6)</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search Spenders
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by spender name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          
          <div className="flex items-end">
            <button
              onClick={() => {
                setSelectedType('');
                setSearchTerm('');
              }}
              className="w-full bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Top Spenders */}
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-900">Top Outside Spenders</h2>
        
        {filteredSpenders.map((spender) => (
          <div key={spender.spender_id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            {/* Spender Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-bold text-gray-900">{spender.spender_name}</h3>
                <div className="flex items-center space-x-4 mt-2 text-sm text-gray-600">
                  <span className="inline-block px-2 py-1 rounded-full bg-blue-100 text-blue-800 text-xs font-medium">
                    {spender.spender_type}
                  </span>
                  <span>{spender.race_count} races</span>
                  <span>{spender.candidate_count} candidates</span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(spender.total_spending)}
                </p>
                <p className="text-sm text-gray-600">Total Spending</p>
              </div>
            </div>

            {/* Spending Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div className="text-center">
                <p className="text-lg font-semibold text-gray-900">
                  {formatCurrency(spender.support_spending)}
                </p>
                <p className="text-sm text-gray-600">Support Spending</p>
              </div>
              
              <div className="text-center">
                <p className="text-lg font-semibold text-gray-900">
                  {formatCurrency(spender.oppose_spending)}
                </p>
                <p className="text-sm text-gray-600">Oppose Spending</p>
              </div>
              
              <div className="text-center">
                <p className="text-lg font-semibold text-gray-900">
                  {spender.support_spending > 0 ? Math.round((spender.support_spending / spender.total_spending) * 100) : 0}%
                </p>
                <p className="text-sm text-gray-600">Support %</p>
              </div>
            </div>

            {/* Top Races */}
            <div className="mb-6">
              <h4 className="text-lg font-semibold text-gray-900 mb-4">Top Races</h4>
              <div className="space-y-3">
                {spender.top_races.map((race, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div>
                      <span className="font-medium text-gray-900">
                        {race.state} {race.chamber} {race.district !== 'Statewide' ? `District ${race.district}` : ''}
                      </span>
                      <span className="ml-2 text-sm text-gray-600">- {race.candidate_name}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                        race.support_oppose === 'Support' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {race.support_oppose}
                      </span>
                      <span className="font-medium text-gray-900">
                        {formatCurrency(race.amount)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Spending by Type */}
            <div>
              <h4 className="text-lg font-semibold text-gray-900 mb-4">Spending by Type</h4>
              <div className="space-y-3">
                {spender.spending_by_type.map((type, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <span className="font-medium text-gray-900">{type.type}</span>
                    <div className="flex items-center space-x-4">
                      <span className="text-sm text-gray-500">{type.percentage}%</span>
                      <span className="font-medium text-gray-900">
                        {formatCurrency(type.amount)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
        
        {filteredSpenders.length === 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
            <p className="text-gray-500">No outside spenders found matching your criteria.</p>
          </div>
        )}
      </div>

      {/* Data Source Note */}
      <div className="mt-8 p-4 bg-gray-50 rounded-lg">
        <h3 className="text-sm font-medium text-gray-800 mb-2">Data Source</h3>
        <p className="text-sm text-gray-600">
          Outside spending data comes from Federal Election Commission independent expenditure reports. 
          This includes spending by super PACs, political action committees, and other groups that 
          advocate for or against candidates without coordinating with campaigns. Data is updated daily 
          during election periods and provides transparency into the role of outside money in elections.
        </p>
      </div>
    </div>
  );
} 