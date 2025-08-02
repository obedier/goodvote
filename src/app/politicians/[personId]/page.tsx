'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { 
  DollarSign, 
  Users, 
  TrendingUp, 
  MapPin, 
  Calendar,
  Building,
  FileText,
  BarChart3
} from 'lucide-react';
import Breadcrumbs from '@/components/ui/Breadcrumbs';
import { BreadcrumbItem } from '@/types';

interface PoliticianProfile {
  person_id: string;
  display_name: string;
  state: string;
  current_office: string;
  current_district: string;
  current_party: string;
  total_elections: number;
  last_election_year: number;
  campaign_finance: {
    total_receipts: number;
    total_disbursements: number;
    cash_on_hand: number;
    contribution_count: number;
    avg_contribution: number;
  };
  top_contributors: Array<{
    name: string;
    amount: number;
    type: string;
  }>;
  top_industries: Array<{
    industry: string;
    amount: number;
    percentage: number;
  }>;
  election_history: Array<{
    year: number;
    office: string;
    party: string;
    result: string;
    total_receipts: number;
  }>;
  committees: Array<{
    committee_id: string;
    committee_name: string;
    committee_type: string;
    total_receipts: number;
  }>;
}

type TabType = 'overview' | 'campaign-finance' | 'contributors' | 'committees' | 'election-history';

export default function PoliticianProfilePage() {
  const params = useParams();
  const personId = params.personId as string;
  
  const [profile, setProfile] = useState<PoliticianProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  const breadcrumbs: BreadcrumbItem[] = [
    { label: 'Politicians', href: '/politicians' },
    { label: 'Congress', href: '/politicians/congress' },
    { label: profile?.display_name || 'Loading...' },
  ];

  useEffect(() => {
    console.log('🔍 useEffect running for personId:', personId);
    fetchPoliticianProfile();
  }, [personId]);

  const fetchPoliticianProfile = async () => {
    try {
      console.log('🚀 Starting fetch for personId:', personId);
      setLoading(true);
      setError(null);
      
      const url = `/api/politicians/${personId}`;
      console.log('📡 Fetching from:', url);
      
      const response = await fetch(url);
      console.log('📥 Response status:', response.status);
      
      if (!response.ok) {
        throw new Error('Failed to fetch politician profile');
      }
      
      const data = await response.json();
      console.log('📊 API Response:', data);
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch politician profile');
      }
      
      console.log('✅ Setting profile data:', data.data);
      setProfile(data.data);
    } catch (err) {
      console.error('❌ Error fetching politician profile:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch politician profile');
    } finally {
      console.log('🏁 Setting loading to false');
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

  const tabs = [
    { id: 'overview', label: 'Overview', icon: FileText },
    { id: 'campaign-finance', label: 'Campaign Finance', icon: DollarSign },
    { id: 'contributors', label: 'Top Contributors', icon: Users },
    { id: 'committees', label: 'Committees', icon: Building },
    { id: 'election-history', label: 'Election History', icon: Calendar },
  ];

  if (loading) {
    console.log('⏳ Component is in loading state');
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading politician profile...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    console.log('❌ Component error state:', { error, profile: !!profile });
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <p className="text-red-600">Error: {error || 'Politician not found'}</p>
            <button
              onClick={fetchPoliticianProfile}
              className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  console.log('🎯 Rendering component with profile:', profile);
  
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Breadcrumbs items={breadcrumbs} />
        
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {profile.display_name}
              </h1>
              <div className="flex items-center space-x-4 text-gray-600">
                <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getPartyBgColor(profile.current_party)} ${getPartyColor(profile.current_party)}`}>
                  {profile.current_party === 'DEM' ? 'Democrat' : profile.current_party === 'REP' ? 'Republican' : profile.current_party}
                </span>
                <span className="flex items-center">
                  <MapPin className="h-4 w-4 mr-1" />
                  {profile.state} - {profile.current_office === 'S' ? 'Senate' : 'House'} {profile.current_district}
                </span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(profile.campaign_finance.total_receipts)}
              </p>
              <p className="text-sm text-gray-600">Total Raised</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-8">
          <nav className="flex space-x-8 px-6">
            {tabs.map((tab) => {
              const IconComponent = tab.icon;
              const isActive = activeTab === tab.id;
              
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as TabType)}
                  className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm ${
                    isActive
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <IconComponent className="h-4 w-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="space-y-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Campaign Finance Summary */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Campaign Finance Summary</h2>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="text-center">
                    <DollarSign className="h-8 w-8 text-green-600 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-gray-900">
                      {formatCurrency(profile.campaign_finance.total_receipts)}
                    </p>
                    <p className="text-sm text-gray-600">Total Raised</p>
                  </div>
                  
                  <div className="text-center">
                    <TrendingUp className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-gray-900">
                      {formatCurrency(profile.campaign_finance.total_disbursements)}
                    </p>
                    <p className="text-sm text-gray-600">Total Spent</p>
                  </div>
                  
                  <div className="text-center">
                    <BarChart3 className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-gray-900">
                      {formatCurrency(profile.campaign_finance.cash_on_hand)}
                    </p>
                    <p className="text-sm text-gray-600">Cash on Hand</p>
                  </div>
                  
                  <div className="text-center">
                    <Users className="h-8 w-8 text-orange-600 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-gray-900">
                      {formatNumber(profile.campaign_finance.contribution_count)}
                    </p>
                    <p className="text-sm text-gray-600">Contributions</p>
                  </div>
                </div>
              </div>

              {/* Top Industries */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Top Contributing Industries</h2>
                <div className="space-y-3">
                  {profile.top_industries.map((industry, index) => (
                    <div key={industry.industry} className="flex items-center justify-between">
                      <div className="flex items-center">
                        <span className="text-sm font-medium text-gray-500 w-6">{index + 1}</span>
                        <span className="font-medium text-gray-900">{industry.industry}</span>
                      </div>
                      <div className="flex items-center space-x-4">
                        <span className="text-sm text-gray-500">{industry.percentage}%</span>
                        <span className="font-medium text-gray-900">
                          {formatCurrency(industry.amount)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Data Source */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Data Source</h2>
                <p className="text-gray-600">
                  Campaign finance data comes from Federal Election Commission filings. This includes contributions from individuals, PACs, and other committees. Data is updated monthly and provides transparency into campaign funding.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'campaign-finance' && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Campaign Finance Details</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-3">Financial Summary</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Receipts:</span>
                      <span className="font-medium text-gray-900">{formatCurrency(profile.campaign_finance.total_receipts)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Disbursements:</span>
                      <span className="font-medium text-gray-900">{formatCurrency(profile.campaign_finance.total_disbursements)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Cash on Hand:</span>
                      <span className="font-medium text-gray-900">{formatCurrency(profile.campaign_finance.cash_on_hand)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Number of Contributions:</span>
                      <span className="font-medium text-gray-900">{formatNumber(profile.campaign_finance.contribution_count)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Average Contribution:</span>
                      <span className="font-medium text-gray-900">{formatCurrency(profile.campaign_finance.avg_contribution)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'contributors' && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Top Contributors</h2>
              <div className="space-y-4">
                {profile.top_contributors.map((contributor, index) => (
                  <div key={contributor.name} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center">
                      <span className="text-sm font-medium text-gray-500 w-6">{index + 1}</span>
                      <div>
                        <p className="font-medium text-gray-900">{contributor.name}</p>
                        <p className="text-sm text-gray-500">{contributor.type}</p>
                      </div>
                    </div>
                    <span className="font-medium text-gray-900">{formatCurrency(contributor.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'committees' && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Committees</h2>
              <div className="space-y-4">
                {profile.committees.map((committee) => (
                  <div key={committee.committee_id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{committee.committee_name}</p>
                      <p className="text-sm text-gray-500">ID: {committee.committee_id}</p>
                      <p className="text-sm text-gray-500">Type: {committee.committee_type}</p>
                    </div>
                    <span className="font-medium text-gray-900">{formatCurrency(committee.total_receipts)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'election-history' && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Election History</h2>
              <div className="space-y-4">
                {profile.election_history.map((election) => (
                  <div key={election.year} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{election.year} - {election.office}</p>
                      <p className="text-sm text-gray-500">{election.party} - {election.result}</p>
                    </div>
                    <span className="font-medium text-gray-900">{formatCurrency(election.total_receipts)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 