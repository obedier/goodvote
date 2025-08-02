'use client';

import React, { useState, useEffect } from 'react';
import { TrendingUp, BarChart3, PieChart, Download, Filter, Calendar, DollarSign } from 'lucide-react';
import Breadcrumbs from '@/components/ui/Breadcrumbs';
import { BreadcrumbItem } from '@/types';
import { 
  CampaignFinanceDashboard, 
  ContributionChart, 
  ExpenditureChart, 
  DonorMapChart,
  CommitteeComparisonChart,
  PartyContributionChart,
  IndustryContributionChart,
  StateComparisonChart 
} from '@/components/ui/DataVisualizations';
import { ContributionFilters, ExpenditureFilters, DonorFilters } from '@/components/ui/DataFilters';
import { ContributionExport, ExpenditureExport, DonorExport, exportToCSV, exportToJSON } from '@/components/ui/DataExport';

interface AnalyticsData {
  committeeComparison: any[];
  partyContributions: any[];
  industryContributions: any[];
  stateComparison: any[];
  contributionTrends: any[];
  expenditures: any[];
  donors: any[];
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData>({
    committeeComparison: [],
    partyContributions: [],
    industryContributions: [],
    stateComparison: [],
    contributionTrends: [],
    expenditures: [],
    donors: [],
  });
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [filters, setFilters] = useState({});
  const [sort, setSort] = useState({ key: 'amount', direction: 'desc' });

  const breadcrumbs: BreadcrumbItem[] = [
    { label: 'Analytics' },
  ];

  // Mock data for demonstration
  const mockData: AnalyticsData = {
    committeeComparison: [
      { committee: 'Committee A', receipts: 1500000, expenditures: 1200000 },
      { committee: 'Committee B', receipts: 2000000, expenditures: 1800000 },
      { committee: 'Committee C', receipts: 800000, expenditures: 750000 },
      { committee: 'Committee D', receipts: 3000000, expenditures: 2800000 },
    ],
    partyContributions: [
      { name: 'Democratic', value: 45000000 },
      { name: 'Republican', value: 38000000 },
      { name: 'Independent', value: 5000000 },
      { name: 'Other', value: 2000000 },
    ],
    industryContributions: [
      { industry: 'Healthcare', amount: 8500000 },
      { industry: 'Technology', amount: 7200000 },
      { industry: 'Finance', amount: 6800000 },
      { industry: 'Education', amount: 4500000 },
      { industry: 'Energy', amount: 3800000 },
    ],
    stateComparison: [
      { state: 'CA', contributions: 12000000, expenditures: 10000000 },
      { state: 'NY', contributions: 8500000, expenditures: 7200000 },
      { state: 'TX', contributions: 6800000, expenditures: 5800000 },
      { state: 'FL', contributions: 5200000, expenditures: 4500000 },
      { state: 'IL', contributions: 4800000, expenditures: 4200000 },
    ],
    contributionTrends: [
      { date: '2024-01', amount: 2500000 },
      { date: '2024-02', amount: 2800000 },
      { date: '2024-03', amount: 3200000 },
      { date: '2024-04', amount: 3800000 },
      { date: '2024-05', amount: 4200000 },
      { date: '2024-06', amount: 4800000 },
    ],
    expenditures: [
      { committee: 'Committee A', amount: 150000, category: 'Media', month: '2024-01' },
      { committee: 'Committee B', amount: 200000, category: 'Consulting', month: '2024-02' },
      { committee: 'Committee C', amount: 120000, category: 'Travel', month: '2024-03' },
    ],
    donors: [
      { state: 'CA', count: 15000, total: 8500000, avgAmount: 567 },
      { state: 'NY', count: 12000, total: 6800000, avgAmount: 567 },
      { state: 'TX', count: 8000, total: 4200000, avgAmount: 525 },
    ],
  };

  useEffect(() => {
    // Simulate loading data
    setLoading(true);
    setTimeout(() => {
      setData(mockData);
      setLoading(false);
    }, 1000);
  }, []);

  const handleFiltersChange = (newFilters: any) => {
    setFilters(newFilters);
    // In a real app, you would fetch filtered data here
  };

  const handleSortChange = (newSort: any) => {
    setSort(newSort);
    // In a real app, you would sort data here
  };

  const handleExport = (format: string, dataType: string) => {
    let exportData: any[] = [];
    let filename = '';

    switch (dataType) {
      case 'contributions':
        exportData = data.committeeComparison;
        filename = 'campaign-contributions';
        break;
      case 'expenditures':
        exportData = data.expenditures;
        filename = 'campaign-expenditures';
        break;
      case 'donors':
        exportData = data.donors;
        filename = 'donor-data';
        break;
      default:
        exportData = [];
        filename = 'analytics-data';
    }

    if (format === 'csv') {
      exportToCSV(exportData, filename);
    } else if (format === 'json') {
      exportToJSON(exportData, filename);
    }
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: <TrendingUp className="h-4 w-4" /> },
    { id: 'contributions', label: 'Contributions', icon: <DollarSign className="h-4 w-4" /> },
    { id: 'expenditures', label: 'Expenditures', icon: <BarChart3 className="h-4 w-4" /> },
    { id: 'donors', label: 'Donors', icon: <PieChart className="h-4 w-4" /> },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Breadcrumbs items={breadcrumbs} />
      
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Campaign Finance Analytics
        </h1>
        <p className="text-gray-600">
          Advanced analytics and visualizations for campaign finance data with interactive charts and export capabilities.
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading analytics data...</p>
        </div>
      )}

      {/* Content */}
      {!loading && (
        <div className="space-y-6">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div>
              <CampaignFinanceDashboard data={data} />
              
              {/* Export Section */}
              <div className="mt-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Export Analytics Data</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <ContributionExport
                    data={data.committeeComparison}
                    onExport={(format) => handleExport(format, 'contributions')}
                  />
                  <ExpenditureExport
                    data={data.expenditures}
                    onExport={(format) => handleExport(format, 'expenditures')}
                  />
                  <DonorExport
                    data={data.donors}
                    onExport={(format) => handleExport(format, 'donors')}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Contributions Tab */}
          {activeTab === 'contributions' && (
            <div>
              <ContributionFilters
                onFiltersChange={handleFiltersChange}
                onSortChange={handleSortChange}
              />
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ContributionChart data={data.committeeComparison} />
                <PartyContributionChart data={data.partyContributions} />
              </div>
              
              <div className="mt-6">
                <IndustryContributionChart data={data.industryContributions} />
              </div>
            </div>
          )}

          {/* Expenditures Tab */}
          {activeTab === 'expenditures' && (
            <div>
              <ExpenditureFilters
                onFiltersChange={handleFiltersChange}
                onSortChange={handleSortChange}
              />
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ExpenditureChart data={data.expenditures} />
                <CommitteeComparisonChart data={data.committeeComparison} />
              </div>
            </div>
          )}

          {/* Donors Tab */}
          {activeTab === 'donors' && (
            <div>
              <DonorFilters
                onFiltersChange={handleFiltersChange}
                onSortChange={handleSortChange}
              />
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <DonorMapChart data={data.donors} />
                <StateComparisonChart data={data.stateComparison} />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Data Source Note */}
      <div className="mt-8 p-4 bg-gray-50 rounded-lg">
        <h3 className="text-sm font-medium text-gray-800 mb-2">Data Source</h3>
        <p className="text-sm text-gray-600">
          Analytics data comes from Federal Election Commission filings. Charts and visualizations 
          are updated regularly as new data becomes available. All amounts are in US dollars.
        </p>
      </div>
    </div>
  );
} 